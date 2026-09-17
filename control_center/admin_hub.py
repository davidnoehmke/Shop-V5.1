from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import urllib.error
import urllib.request

import streamlit as st

st.set_page_config(
    page_title="LEAFerservice Admin Hub",
    page_icon="L",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
<style>
.block-container {max-width: 1600px; padding-top: 1.25rem; padding-bottom: 2.5rem;}
[data-testid="stSidebar"] {border-right: 1px solid rgba(128,128,128,.18);}
[data-testid="stMetric"] {border: 1px solid rgba(128,128,128,.22); border-radius: 14px; padding: 14px 16px;}
[data-testid="stDataFrame"] {border: 1px solid rgba(128,128,128,.22); border-radius: 12px; overflow: hidden;}
div.stButton > button, div.stLinkButton > a {border-radius: 10px; min-height: 42px;}
.leaf-title {font-size: 2rem; font-weight: 760; line-height: 1.15;}
.leaf-subtle {opacity: .72; font-size: .94rem;}
.leaf-card-title {font-size: 1.08rem; font-weight: 720; line-height: 1.25; margin-bottom: .15rem;}
.leaf-card-meta {opacity: .72; font-size: .86rem; margin-bottom: .55rem;}
</style>
""",
    unsafe_allow_html=True,
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
ADMIN_TOKEN = os.getenv("ADMIN_CHANGELOG_READ_TOKEN", "")
LICENSE_SHA256 = os.getenv("LEAF_LICENSE_SHA256", "").strip().lower()
LICENSE_ID = os.getenv("LEAF_LICENSE_ID", "Owner")
SESSION_HOURS = 12


def _local_dev_auth_disabled() -> bool:
    return (
        os.getenv("LEAF_ENV", "").strip().lower() == "development"
        and os.getenv("LEAF_DEV_NO_AUTH", "").strip().lower() == "true"
        and not os.getenv("RAILWAY_ENVIRONMENT")
        and not os.getenv("RAILWAY_PROJECT_ID")
    )


def _license_gate() -> None:
    if _local_dev_auth_disabled():
        st.warning("Lokaler Entwicklungsmodus: Authentifizierung ist deaktiviert.")
        return
    if not LICENSE_SHA256:
        st.error("Owner-Lizenz ist serverseitig nicht konfiguriert. LEAF_LICENSE_SHA256 fehlt.")
        st.stop()

    now = datetime.now(timezone.utc)
    expires = st.session_state.get("leaf_admin_expires_at")
    if st.session_state.get("leaf_admin_authorized") and isinstance(expires, datetime) and expires > now:
        return

    st.markdown('<div class="leaf-title">LEAFerservice Admin Hub</div>', unsafe_allow_html=True)
    st.caption("Geschützter Owner-Zugang")
    uploaded = st.file_uploader("Owner-Lizenzdatei", type=["lic"], accept_multiple_files=False)
    if uploaded is not None:
        digest = hashlib.sha256(uploaded.getvalue()).hexdigest().lower()
        if hashlib.compare_digest(digest, LICENSE_SHA256):
            st.session_state["leaf_admin_authorized"] = True
            st.session_state["leaf_admin_expires_at"] = now + timedelta(hours=SESSION_HOURS)
            st.rerun()
        else:
            st.error("Lizenzdatei wurde nicht akzeptiert.")
    st.info("Die Lizenzdatei wird nur lokal im Request geprüft und nicht gespeichert.")
    st.stop()


_license_gate()


def _rpc(name: str, payload: dict) -> dict:
    if not SUPABASE_URL or not SUPABASE_KEY or not ADMIN_TOKEN:
        missing = [
            key
            for key, value in {
                "SUPABASE_URL": SUPABASE_URL,
                "SUPABASE_PUBLISHABLE_KEY": SUPABASE_KEY,
                "ADMIN_CHANGELOG_READ_TOKEN": ADMIN_TOKEN,
            }.items()
            if not value
        ]
        raise RuntimeError("Fehlende Server-Konfiguration: " + ", ".join(missing))

    body = dict(payload)
    body.setdefault("p_token", ADMIN_TOKEN)
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/{name}",
        data=data,
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
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:600]
        raise RuntimeError(f"Supabase RPC HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Supabase nicht erreichbar: {exc.reason}") from exc

    parsed = json.loads(raw or "null")
    if isinstance(parsed, list) and len(parsed) == 1 and isinstance(parsed[0], dict):
        return parsed[0]
    if not isinstance(parsed, dict):
        raise RuntimeError("Unerwartete Antwort der Admin-RPC.")
    return parsed


@st.cache_data(ttl=45, show_spinner=False)
def load_snapshot() -> dict:
    return _rpc("admin_panel_snapshot", {"p_limit": 250})


def rows(value) -> list[dict]:
    return value if isinstance(value, list) else []


def show_table(data, *, empty="Keine Datensätze.", links=None):
    data = rows(data)
    if not data:
        st.info(empty)
        return
    config = {}
    for column in links or []:
        config[column] = st.column_config.LinkColumn(column)
    st.dataframe(data, use_container_width=True, hide_index=True, column_config=config)


def plain_text(value) -> str:
    if not value:
        return ""
    text = re.sub(r"<[^>]+>", " ", str(value))
    return " ".join(html.unescape(text).split())


def euro(value, currency="EUR") -> str:
    if value in (None, ""):
        return "-"
    try:
        amount = f"{float(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (TypeError, ValueError):
        return str(value)
    return f"{amount} {currency or 'EUR'}"


def json_rows(value) -> list[dict]:
    return value if isinstance(value, list) else []


def render_product_card(product: dict) -> None:
    media = json_rows(product.get("media"))
    variants = json_rows(product.get("variants"))
    metafields = json_rows(product.get("metafields"))
    localizations = json_rows(product.get("localizations"))
    hero = next((item for item in media if item.get("role") in ("featured", "hero", "primary") and str(item.get("source_url") or "").startswith("https://")), None)
    hero = hero or next((item for item in media if str(item.get("source_url") or "").startswith("https://")), None)

    with st.container(border=True):
        visual, summary_col = st.columns([1, 1.8], vertical_alignment="top")
        with visual:
            if hero:
                st.image(hero["source_url"], caption=hero.get("alt_text") or product.get("title"), use_container_width=True)
            else:
                st.caption("Kein Produktbild synchronisiert")
        with summary_col:
            st.markdown(f'<div class="leaf-card-title">{html.escape(str(product.get("title") or "Unbenanntes Produkt"))}</div>', unsafe_allow_html=True)
            st.markdown(
                f'<div class="leaf-card-meta">{html.escape(str(product.get("product_type") or "Ohne Produkttyp"))} · {html.escape(str(product.get("vendor") or "Ohne Hersteller"))}</div>',
                unsafe_allow_html=True,
            )
            st.caption(f"Status: {product.get('status') or '-'} · Handle: {product.get('handle') or '-'}")
            price_min, price_max = product.get("min_price"), product.get("max_price")
            price = euro(price_min)
            if price_max not in (None, "") and price_max != price_min:
                price = f"{price} – {euro(price_max)}"
            st.markdown(f"**{price}**")
            st.caption(f"{len(variants)} Varianten · {len(metafields)} Metafelder · {len(media)} Medien")

        teaser = plain_text(product.get("short_description") or product.get("description_html"))
        if teaser:
            st.write(teaser[:280] + ("…" if len(teaser) > 280 else ""))
        else:
            st.caption("Keine Kurzbeschreibung synchronisiert")

        with st.expander("Alle Produktdetails anzeigen"):
            content_tab, variants_tab, metafields_tab, media_tab, system_tab = st.tabs(
                ["Inhalte", "Varianten", "Metafelder", "Medien", "System"]
            )
            with content_tab:
                st.markdown("**Kurzbeschreibung**")
                st.write(plain_text(product.get("short_description")) or "Nicht synchronisiert")
                st.markdown("**Vollständige Beschreibung**")
                st.write(plain_text(product.get("description_html")) or "Nicht synchronisiert")
                st.markdown("**Lokalisierungen, USPs, FAQs, Kollektionen und Cross-Sells**")
                for label, key in (
                    ("Lokalisierungen", "localizations"), ("USPs", "usps"), ("FAQs", "faqs"),
                    ("Kollektionen", "collections"), ("Cross-Sells", "cross_sells"),
                ):
                    values = json_rows(product.get(key))
                    st.markdown(f"**{label} ({len(values)})**")
                    show_table(values, empty="Nicht synchronisiert")
            with variants_tab:
                show_table(variants, empty="Keine Varianten synchronisiert")
            with metafields_tab:
                show_table(metafields, empty="Keine Metafelder synchronisiert")
            with media_tab:
                show_table(media, empty="Keine Medien synchronisiert", links=["source_url", "notion_asset_url"])
            with system_tab:
                system = {
                    "ID": product.get("id"), "Shopify GID": product.get("shopify_product_gid"),
                    "Shopify ID": product.get("shopify_product_id"), "Notion Page ID": product.get("notion_page_id"),
                    "Quelle": product.get("canonical_source"), "Version": product.get("canonical_version"),
                    "Aktualisiert": product.get("updated_at"), "Rohdaten": product.get("data") or {},
                }
                st.json(system, expanded=False)


with st.sidebar:
    st.markdown("### LEAFerservice")
    st.caption(f"Owner: {LICENSE_ID}")
    if st.button("Daten aktualisieren", use_container_width=True):
        st.cache_data.clear()
        st.rerun()
    if st.button("Sitzung beenden", use_container_width=True):
        st.session_state.clear()
        st.rerun()
    st.divider()
    st.link_button("Shop öffnen", "https://leaferservice.com", use_container_width=True)

st.markdown('<div class="leaf-title">Admin Hub</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="leaf-subtle">Supabase SSOT · Content · Pipelines · Automationen · Codex/GitHub · Shopify-Übergang</div>',
    unsafe_allow_html=True,
)

snapshot = {}
load_error = None
try:
    snapshot = load_snapshot()
except Exception as exc:
    load_error = str(exc)

if load_error:
    st.error("Die Admin-Daten konnten nicht geladen werden.")
    st.code(load_error)
    st.caption("Die Oberfläche bleibt verfügbar, damit Konfiguration und Diagnose geprüft werden können.")

summary = snapshot.get("summary") if isinstance(snapshot.get("summary"), dict) else {}
metric_values = [
    ("Produkte", summary.get("products_total", 0)),
    ("Varianten", summary.get("variants_total", 0)),
    ("Artikel", summary.get("articles_total", 0)),
    ("Freigaben offen", summary.get("approvals_pending", 0)),
    ("Sync Queue", summary.get("product_sync_queued", 0)),
    ("Agent-Fehler 24h", summary.get("agent_failures_24h", 0)),
]
cols = st.columns(len(metric_values))
for col, (label, value) in zip(cols, metric_values):
    col.metric(label, value)

nav = st.tabs([
    "Dashboard",
    "Katalog",
    "Content",
    "Pipelines",
    "Automationen",
    "AI & Codex",
    "System",
])

with nav[0]:
    c1, c2 = st.columns([1.2, 1])
    with c1:
        st.subheader("Pipeline-Status")
        pipeline_rows = []
        for item in rows(snapshot.get("sync_state")):
            pipeline_rows.append({
                "Pipeline": item.get("integration"),
                "Letzter Erfolg": item.get("last_success_at"),
                "Fehler": item.get("last_error"),
                "Aktualisiert": item.get("updated_at"),
            })
        show_table(pipeline_rows, empty="Noch keine Sync-Zustände vorhanden.")
    with c2:
        st.subheader("Kontrollzentrum")
        overview = [
            {"Bereich": "Supabase", "Status": "Verbunden" if not load_error else "Fehler"},
            {"Bereich": "Content", "Status": f"{summary.get('articles_published', 0)} veröffentlicht"},
            {"Bereich": "Automationen", "Status": f"{summary.get('automations_enabled', 0)} aktiv"},
            {"Bereich": "Sync-Konflikte", "Status": summary.get("sync_conflicts_open", 0)},
            {"Bereich": "Visual Reviews", "Status": summary.get("visual_pending", 0)},
            {"Bereich": "Code Reviews", "Status": summary.get("code_reviews_open", 0)},
        ]
        show_table(overview)

    st.subheader("Letzte Agent-Läufe")
    show_table(rows(snapshot.get("agent_runs"))[:20])

with nav[1]:
    st.subheader("Produkte")
    products = rows(snapshot.get("products"))
    search = st.text_input("Produkte filtern", placeholder="Titel, Handle oder Typ", key="catalog_search")
    if search:
        needle = search.casefold()
        products = [p for p in products if needle in " ".join(str(p.get(k) or "") for k in ("title", "handle", "product_type", "status")).casefold()]
    st.caption(f"{len(products)} Produktkarten · read-only aus dem Supabase-Snapshot")
    if not products:
        st.info("Keine Produkte gefunden.")
    for index in range(0, len(products), 2):
        card_columns = st.columns(2)
        for offset, product in enumerate(products[index:index + 2]):
            with card_columns[offset]:
                render_product_card(product)

with nav[2]:
    content_tabs = st.tabs(["Artikel & Ratgeber", "Themen & Keywords", "Freigaben", "Visuals"])
    with content_tabs[0]:
        show_table(snapshot.get("articles"), links=["hero_image_url"])
    with content_tabs[1]:
        show_table(snapshot.get("topics"))
    with content_tabs[2]:
        show_table(snapshot.get("approvals"))
    with content_tabs[3]:
        show_table(snapshot.get("visuals"))

with nav[3]:
    st.subheader("Sync-Verbindungen")
    show_table(snapshot.get("connections"))
    st.subheader("Letzte Sync-Runs")
    show_table(snapshot.get("sync_runs"))
    st.subheader("Sync-Zustände")
    show_table(snapshot.get("sync_state"))

with nav[4]:
    auto = rows(snapshot.get("automations"))
    enabled = [a for a in auto if a.get("enabled") is True]
    disabled = [a for a in auto if a.get("enabled") is not True]
    a1, a2 = st.columns(2)
    a1.metric("Aktiv", len(enabled))
    a2.metric("Inaktiv", len(disabled))
    show_table(auto)
    st.subheader("Agent-Runs")
    show_table(snapshot.get("agent_runs"))

with nav[5]:
    ai_tabs = st.tabs(["GPTs & Tools", "Code Reviews"])
    with ai_tabs[0]:
        launchers = rows(snapshot.get("ai_launchers"))
        if launchers:
            for launcher in launchers:
                label = launcher.get("label") or launcher.get("slug") or "AI Tool"
                description = launcher.get("description") or ""
                target = launcher.get("target")
                c1, c2 = st.columns([4, 1])
                c1.markdown(f"**{label}**")
                if description:
                    c1.caption(description)
                if launcher.get("launch_type") == "url" and isinstance(target, str) and target.startswith("https://"):
                    c2.link_button("Öffnen", target, use_container_width=True)
                else:
                    c2.caption(str(target or "intern"))
        else:
            st.info("Keine AI-Launcher verfügbar.")
    with ai_tabs[1]:
        show_table(snapshot.get("code_reviews"))

with nav[6]:
    st.subheader("Runtime & Konfiguration")
    runtime = [
        {"Eintrag": "App", "Wert": str(Path(__file__).resolve())},
        {"Eintrag": "Arbeitsverzeichnis", "Wert": str(Path.cwd())},
        {"Eintrag": "Supabase URL", "Wert": "gesetzt" if SUPABASE_URL else "fehlt"},
        {"Eintrag": "Publishable Key", "Wert": "gesetzt" if SUPABASE_KEY else "fehlt"},
        {"Eintrag": "Admin Read Token", "Wert": "gesetzt" if ADMIN_TOKEN else "fehlt"},
        {"Eintrag": "Lizenz", "Wert": "aktiv" if LICENSE_SHA256 else "fehlt"},
        {"Eintrag": "Git", "Wert": shutil.which("git") or "nicht installiert"},
        {"Eintrag": "Shopify CLI", "Wert": shutil.which("shopify") or "nicht installiert"},
    ]
    show_table(runtime)

    st.subheader("Repository-Diagnose")
    if st.button("Git-Status prüfen", use_container_width=True):
        if not shutil.which("git"):
            st.warning("Git ist in der Railway-Laufzeit nicht installiert.")
        else:
            try:
                proc = subprocess.run(["git", "status", "--short"], capture_output=True, text=True, timeout=20)
                st.code(proc.stdout.strip() or "Working Tree sauber")
            except Exception as exc:
                st.warning(str(exc))

st.divider()
st.caption("LEAFerservice Admin Hub · read-only Datenansichten · schreibende Aktionen bleiben kontrolliert und getrennt")
