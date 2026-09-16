from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os
from pathlib import Path
import runpy

import streamlit as st

st.set_page_config(
    page_title="LEAFerservice Admin Hub",
    page_icon="L",
    layout="wide",
    initial_sidebar_state="collapsed",
)

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
SESSION_HOURS = 12


def _password_gate() -> None:
    if not ADMIN_PASSWORD:
        st.error("Admin-Passwort ist serverseitig nicht konfiguriert.")
        st.stop()

    now = datetime.now(timezone.utc)
    expires = st.session_state.get("leaf_password_expires_at")
    if st.session_state.get("leaf_password_authorized") and isinstance(expires, datetime) and expires > now:
        return

    st.markdown("## LEAFerservice Admin Hub")
    st.caption("Passwortgeschuetzter Zugang")

    with st.form("admin_password_form", clear_on_submit=False):
        password = st.text_input("Passwort", type="password", autocomplete="current-password")
        submitted = st.form_submit_button("Anmelden", type="primary", use_container_width=True)

    if submitted:
        if hmac.compare_digest(
            hashlib.sha256(password.encode("utf-8")).digest(),
            hashlib.sha256(ADMIN_PASSWORD.encode("utf-8")).digest(),
        ):
            st.session_state["leaf_password_authorized"] = True
            st.session_state["leaf_password_expires_at"] = now + timedelta(hours=SESSION_HOURS)
            st.rerun()
        else:
            st.error("Passwort nicht korrekt.")

    st.stop()


_password_gate()

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
