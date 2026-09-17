from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import runpy
import urllib.error
import urllib.request

import streamlit as st

st.set_page_config(
    page_title="LEAFerservice Admin Hub",
    page_icon="L",
    layout="wide",
    initial_sidebar_state="collapsed",
)

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "Admin").strip() or "Admin"
ADMIN_PASSWORD_SHA256 = os.getenv("ADMIN_PASSWORD_SHA256", "").strip().lower()
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
ADMIN_TOKEN = os.getenv("ADMIN_CHANGELOG_READ_TOKEN", "")
SESSION_HOURS = 12


def _local_dev_auth_disabled() -> bool:
    return (
        os.getenv("LEAF_ENV", "").strip().lower() == "development"
        and os.getenv("LEAF_DEV_NO_AUTH", "").strip().lower() == "true"
        and not os.getenv("RAILWAY_ENVIRONMENT")
        and not os.getenv("RAILWAY_PROJECT_ID")
    )


def _password_gate() -> None:
    if _local_dev_auth_disabled():
        st.warning("Lokaler Entwicklungsmodus: Passwortschutz ist deaktiviert.")
        return
    if not ADMIN_PASSWORD_SHA256:
        st.error("Admin-Passwort ist serverseitig nicht konfiguriert.")
        st.stop()

    now = datetime.now(timezone.utc)
    expires = st.session_state.get("leaf_password_expires_at")
    if st.session_state.get("leaf_password_authorized") and isinstance(expires, datetime) and expires > now:
        return

    st.markdown("## LEAFerservice Admin Hub")
    st.caption("Geschützter Owner-Zugang")

    with st.form("admin_password_form", clear_on_submit=False):
        username = st.text_input("User", autocomplete="username")
        password = st.text_input("Passwort", type="password", autocomplete="current-password")
        submitted = st.form_submit_button("Anmelden", type="primary", use_container_width=True)

    if submitted:
        submitted_hash = hashlib.sha256(password.encode("utf-8")).hexdigest().lower()
        username_ok = hmac.compare_digest(username.strip(), ADMIN_USERNAME)
        password_ok = hmac.compare_digest(submitted_hash, ADMIN_PASSWORD_SHA256)
        if username_ok and password_ok:
            st.session_state["leaf_password_authorized"] = True
            st.session_state["leaf_password_expires_at"] = now + timedelta(hours=SESSION_HOURS)
            st.rerun()
        else:
            st.error("Zugangsdaten nicht korrekt.")

    st.stop()


def _analytics_rpc() -> dict:
    if not SUPABASE_URL or not SUPABASE_KEY or not ADMIN_TOKEN:
        return {}
    body = json.dumps({"p_token": ADMIN_TOKEN}).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/admin_analytics_snapshot",
        data=body,
        method="POST",
        headers={
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read().decode("utf-8")
    except (urllib.error.HTTPError, urllib.error.URLError):
        return {}
    parsed = json.loads(raw or "null")
    if isinstance(parsed, list) and len(parsed) == 1 and isinstance(parsed[0], dict):
        return parsed[0]
    return parsed if isinstance(parsed, dict) else {}


@st.cache_data(ttl=60, show_spinner=False)
def load_analytics() -> dict:
    return _analytics_rpc()


def _metric_value(value, suffix=""):
    if value is None:
        return "-"
    return f"{value}{suffix}"


def _render_analytics_cockpit() -> None:
    analytics = load_analytics()
    if not analytics:
        st.warning("Analytics-Snapshot konnte aktuell nicht geladen werden.")
        return

    shopify_sales = analytics.get("shopify_sales") or {}
    shopify_sessions = analytics.get("shopify_sessions") or {}
    gsc = analytics.get("gsc_summary") or {}
    ga4 = analytics.get("ga4_status") or {}

    st.markdown("### Performance Cockpit")
    st.caption("Shopify · Google Search Console · GA4 · Supabase SSOT")

    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric("Shopify Sitzungen · 30 T.", int(shopify_sessions.get("sessions", 0)))
    c2.metric("Bestellungen · 30 T.", int(shopify_sales.get("orders", 0)))
    c3.metric("Umsatz · 30 T.", f"{float(shopify_sales.get('total_sales', 0)):.2f} €")
    c4.metric("GSC Impressionen · 28 T.", int(gsc.get("impressions", 0)))
    c5.metric("GSC Klicks · 28 T.", int(gsc.get("clicks", 0)))
    c6.metric("Ø Google Position", f"{float(gsc.get('avg_position', 0)):.1f}" if gsc else "-")

    left, right = st.columns([1.25, 1])
    with left:
        st.subheader("Shopify Funnel")
        funnel = [
            {"Stufe": "Sitzungen", "Wert": shopify_sessions.get("sessions", 0)},
            {"Stufe": "Warenkorb", "Wert": shopify_sessions.get("cart_additions", 0)},
            {"Stufe": "Checkout erreicht", "Wert": shopify_sessions.get("reached_checkout", 0)},
            {"Stufe": "Checkout abgeschlossen", "Wert": shopify_sessions.get("completed_checkout", 0)},
        ]
        st.dataframe(funnel, use_container_width=True, hide_index=True)
        conversion = float(shopify_sessions.get("conversion_rate", 0) or 0) * 100
        st.caption(f"Shopify Online-Store Conversion: {conversion:.2f} %")

    with right:
        st.subheader("Google Search")
        gsc_rows = [
            {"Kennzahl": "Impressionen", "Wert": gsc.get("impressions", 0)},
            {"Kennzahl": "Klicks", "Wert": gsc.get("clicks", 0)},
            {"Kennzahl": "CTR", "Wert": f"{float(gsc.get('ctr_percent', 0)):.2f} %"},
            {"Kennzahl": "Ø Position", "Wert": f"{float(gsc.get('avg_position', 0)):.2f}"},
            {"Kennzahl": "Daten vollständig bis", "Wert": gsc.get("settled_through", "-")},
        ]
        st.dataframe(gsc_rows, use_container_width=True, hide_index=True)
        if ga4.get("connected") and not ga4.get("linked"):
            st.info("GA4-Zugriff ist verbunden, aber die GA4-Property ist aktuell noch nicht mit leaferservice.com in der Analytics-Brücke verknüpft.")
        elif ga4.get("connected"):
            st.success("GA4 ist verbunden.")
        else:
            st.warning("GA4 ist nicht verbunden.")

    st.divider()


_password_gate()
_render_analytics_cockpit()

# The existing admin hub still contains the previous licence gate. Once the
# password gate has succeeded, mark the owner session as authorised so the
# existing application can run unchanged behind this temporary protection.
st.session_state["leaf_admin_authorized"] = True
st.session_state["leaf_admin_expires_at"] = datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)

admin_hub_path = Path(__file__).with_name("admin_hub.py")
original_set_page_config = st.set_page_config
st.set_page_config = lambda *args, **kwargs: None
try:
    runpy.run_path(str(admin_hub_path), run_name="__main__")
finally:
    st.set_page_config = original_set_page_config
