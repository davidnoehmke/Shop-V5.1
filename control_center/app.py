from pathlib import Path
import subprocess
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]

st.set_page_config(page_title="LEAFerservice Control Center", page_icon="🌿", layout="wide")
st.title("LEAFerservice Control Center")
st.caption("Manuelle Prüf- und Steuerzentrale. Schreibende Aktionen bleiben bewusst getrennt.")


def run(cmd):
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, shell=False)
    return p.returncode, (p.stdout + "\n" + p.stderr).strip()


def show(label, cmd):
    with st.status(label, expanded=True) as status:
        code, output = run(cmd)
        st.code(output or "Keine Ausgabe")
        if code == 0:
            status.update(label=f"{label}: OK", state="complete")
        else:
            status.update(label=f"{label}: FEHLER", state="error")
    return code

left, right = st.columns(2)

with left:
    st.subheader("Theme")
    if st.button("Theme-Struktur prüfen", use_container_width=True):
        required = ["layout/theme.liquid", "config/settings_schema.json", "assets", "sections", "snippets", "templates"]
        missing = [x for x in required if not (ROOT / x).exists()]
        if missing:
            st.error("Fehlt: " + ", ".join(missing))
        else:
            st.success("Shopify-Theme-Struktur ist vollständig.")

    if st.button("Shopify Theme Check", use_container_width=True):
        show("Shopify Theme Check", ["shopify", "theme", "check", "--path", str(ROOT)])

with right:
    st.subheader("Git / Qualität")
    if st.button("Git-Status", use_container_width=True):
        show("Git-Status", ["git", "status", "--short"])

    if st.button("Änderungen anzeigen", use_container_width=True):
        show("Git-Diff", ["git", "diff", "--stat"])

st.divider()
st.subheader("LEAF CHECK")
if st.button("LEAF CHECK & FIX (nur prüfen)", type="primary", use_container_width=True):
    required = ["layout/theme.liquid", "config/settings_schema.json", "assets", "sections", "snippets", "templates"]
    missing = [x for x in required if not (ROOT / x).exists()]
    score = 100
    if missing:
        score -= min(60, len(missing) * 10)
        st.error("Theme-Struktur: " + ", ".join(missing))
    else:
        st.success("Theme-Struktur: OK")

    try:
        code, output = run(["shopify", "theme", "check", "--path", str(ROOT)])
        if code:
            score -= 20
            st.warning("Theme Check meldet Probleme.")
        else:
            st.success("Theme Check: OK")
        with st.expander("Theme-Check Ausgabe"):
            st.code(output or "Keine Ausgabe")
    except FileNotFoundError:
        score -= 10
        st.warning("Shopify CLI ist lokal nicht installiert oder nicht im PATH.")

    st.metric("Health Score", f"{max(score, 0)}/100")
    st.info("Dieser Hauptbutton verändert weder Shopify Live noch GitHub. Deployments bleiben absichtlich separat.")

st.divider()
st.caption("LEAFerservice • lokale manuelle Steuerung")
