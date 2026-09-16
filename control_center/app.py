from pathlib import Path
from datetime import datetime, timezone
import os
import shutil
import subprocess
import streamlit as st

st.set_page_config(
    page_title="LEAFerservice Control Center",
    page_icon="L",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
.block-container {padding-top: 1.4rem; padding-bottom: 2rem; max-width: 1480px;}
[data-testid="stMetric"] {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    padding: 16px 18px;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,.03);
}
.leaf-card {
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 18px;
    background: #fff;
    min-height: 112px;
}
.leaf-muted {color: #6b7280; font-size: .92rem;}
.leaf-title {font-size: 2.1rem; font-weight: 750; margin-bottom: .2rem;}
div.stButton > button {border-radius: 12px; min-height: 44px;}
[data-testid="stDataFrame"] {border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;}
hr {margin: 1.4rem 0;}
</style>
""", unsafe_allow_html=True)

REQUIRED_THEME = [
    "layout/theme.liquid",
    "config/settings_schema.json",
    "assets",
    "sections",
    "snippets",
    "templates",
]

def find_theme_root():
    candidates = []
    if os.getenv("THEME_ROOT"):
        candidates.append(Path(os.environ["THEME_ROOT"]))
    candidates += [Path("/app"), Path.cwd(), Path(__file__).resolve().parent]
    seen = set()
    for candidate in candidates:
        try:
            candidate = candidate.resolve()
        except Exception:
            continue
        if str(candidate) in seen:
            continue
        seen.add(str(candidate))
        if (candidate / "layout/theme.liquid").exists() or (candidate / "config/settings_schema.json").exists():
            return candidate
    return Path("/app")

THEME_ROOT = find_theme_root()

def run(cmd, cwd=None):
    exe = cmd[0]
    if shutil.which(exe) is None:
        return 127, f"{exe} ist in dieser Railway-Laufzeit nicht installiert."
    try:
        p = subprocess.run(
            cmd,
            cwd=str(cwd or THEME_ROOT),
            capture_output=True,
            text=True,
            shell=False,
            timeout=120,
        )
        return p.returncode, (p.stdout + "\n" + p.stderr).strip()
    except subprocess.TimeoutExpired:
        return 124, "Zeitlimit nach 120 Sekunden erreicht."
    except Exception as exc:
        return 1, f"{type(exc).__name__}: {exc}"

def theme_rows():
    rows = []
    for rel in REQUIRED_THEME:
        p = THEME_ROOT / rel
        rows.append({
            "Bereich": rel,
            "Status": "OK" if p.exists() else "Fehlt",
            "Typ": "Ordner" if p.is_dir() else "Datei",
            "Pfad": str(p),
        })
    return rows

def git_rows():
    code, output = run(["git", "status", "--short"], cwd=THEME_ROOT)
    if code != 0:
        return [], output
    rows = []
    for line in output.splitlines():
        if not line.strip():
            continue
        rows.append({
            "Status": line[:2].strip() or "-",
            "Datei": line[3:].strip() if len(line) > 3 else line.strip(),
        })
    return rows, ""

def integration_rows():
    checks = [
        ("Supabase", "SUPABASE_URL", "Daten / Auth"),
        ("Supabase Key", "SUPABASE_PUBLISHABLE_KEY", "API"),
        ("Lizenz-ID", "LEAF_LICENSE_ID", "Zugriff"),
        ("Lizenz-Hash", "LEAF_LICENSE_SHA256", "Validierung"),
        ("Changelog", "ADMIN_CHANGELOG_READ_TOKEN", "Lesender Zugriff"),
    ]
    return [
        {
            "Integration": name,
            "Bereich": area,
            "Status": "Verbunden" if os.getenv(var) else "Nicht konfiguriert",
            "Variable": var,
        }
        for name, var, area in checks
    ]

def health():
    theme = theme_rows()
    missing = sum(1 for r in theme if r["Status"] != "OK")
    cli_ok = shutil.which("shopify") is not None
    git_ok = shutil.which("git") is not None
    integrations = integration_rows()
    integrations_ok = sum(1 for r in integrations if r["Status"] == "Verbunden")

    score = 100
    score -= min(48, missing * 8)
    if not cli_ok:
        score -= 12
    if not git_ok:
        score -= 8
    if integrations_ok < 3:
        score -= 8
    return max(score, 0), missing, cli_ok, git_ok, integrations_ok

score, missing_count, cli_ok, git_ok, integrations_ok = health()
now = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M UTC")

st.markdown('<div class="leaf-title">LEAFerservice Control Center</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="leaf-muted">Zentrale Ansicht für Systemstatus, Theme-Qualität, Integrationen und manuelle Prüfungen.</div>',
    unsafe_allow_html=True,
)

m1, m2, m3, m4, m5 = st.columns(5)
m1.metric("Health Score", f"{score}/100")
m2.metric("Theme-Prüfung", "OK" if missing_count == 0 else f"{missing_count} offen")
m3.metric("Shopify CLI", "Bereit" if cli_ok else "Fehlt")
m4.metric("Git", "Bereit" if git_ok else "Fehlt")
m5.metric("Integrationen", f"{integrations_ok}/5")

tab_overview, tab_theme, tab_data, tab_system = st.tabs(
    ["Dashboard", "Theme & Qualität", "Daten & Integrationen", "System & Diagnose"]
)

with tab_overview:
    left, right = st.columns([1.35, 1])
    with left:
        st.subheader("Systemübersicht")
        overview_rows = [
            {"Bereich": "Admin Center", "Status": "Online", "Hinweis": "Streamlit läuft auf Railway"},
            {"Bereich": "Theme-Struktur", "Status": "OK" if missing_count == 0 else "Prüfen", "Hinweis": f"{missing_count} Pflichtbereiche fehlen"},
            {"Bereich": "Shopify Theme Check", "Status": "Bereit" if cli_ok else "Blockiert", "Hinweis": "Shopify CLI verfügbar" if cli_ok else "CLI im Container nicht installiert"},
            {"Bereich": "Git-Prüfung", "Status": "Bereit" if git_ok else "Blockiert", "Hinweis": "Git verfügbar" if git_ok else "Git im Container nicht installiert"},
            {"Bereich": "Supabase", "Status": "Verbunden" if os.getenv("SUPABASE_URL") else "Offen", "Hinweis": "URL konfiguriert" if os.getenv("SUPABASE_URL") else "SUPABASE_URL fehlt"},
        ]
        st.dataframe(overview_rows, use_container_width=True, hide_index=True)

    with right:
        st.subheader("Schnellaktionen")
        if st.button("Gesamtprüfung ausführen", type="primary", use_container_width=True):
            score2, missing2, cli2, git2, integrations2 = health()
            st.success(f"Prüfung abgeschlossen. Health Score: {score2}/100")
            st.write({
                "Theme offen": missing2,
                "Shopify CLI": cli2,
                "Git": git2,
                "Integrationen": f"{integrations2}/5",
            })
        if st.button("Theme-Struktur aktualisieren", use_container_width=True):
            st.dataframe(theme_rows(), use_container_width=True, hide_index=True)
        if st.button("Git-Status laden", use_container_width=True):
            rows, err = git_rows()
            if err:
                st.warning(err)
            elif rows:
                st.dataframe(rows, use_container_width=True, hide_index=True)
            else:
                st.success("Keine lokalen Änderungen gefunden.")

        st.caption(f"Letzte Seitenaktualisierung: {now}")

    st.divider()
    st.subheader("Offene Punkte")
    issues = []
    if missing_count:
        issues.append({"Priorität": "Hoch", "Bereich": "Theme", "Problem": f"{missing_count} Theme-Pflichtbereiche sind im Laufzeitpfad nicht sichtbar.", "Nächster Schritt": "Theme-Quelle/Root verbinden"})
    if not cli_ok:
        issues.append({"Priorität": "Mittel", "Bereich": "Tooling", "Problem": "Shopify CLI fehlt im Railway-Container.", "Nächster Schritt": "CLI im Build installieren oder Check über CI ausführen"})
    if integrations_ok < 5:
        issues.append({"Priorität": "Mittel", "Bereich": "Integrationen", "Problem": f"{5-integrations_ok} Konfiguration(en) fehlen.", "Nächster Schritt": "Variablen prüfen"})
    if not issues:
        issues.append({"Priorität": "-", "Bereich": "System", "Problem": "Keine offenen Systemprüfungen.", "Nächster Schritt": "-"})
    st.dataframe(issues, use_container_width=True, hide_index=True)

with tab_theme:
    st.subheader("Theme-Struktur")
    st.caption(f"Aktuell geprüfter Root-Pfad: {THEME_ROOT}")
    rows = theme_rows()
    st.dataframe(rows, use_container_width=True, hide_index=True)

    c1, c2 = st.columns(2)
    with c1:
        if st.button("Theme-Struktur prüfen", use_container_width=True):
            missing = [r["Bereich"] for r in rows if r["Status"] != "OK"]
            if missing:
                st.error("Nicht gefunden: " + ", ".join(missing))
            else:
                st.success("Shopify-Theme-Struktur vollständig.")
    with c2:
        if st.button("Shopify Theme Check", use_container_width=True):
            code, output = run(["shopify", "theme", "check", "--path", str(THEME_ROOT)])
            if code == 0:
                st.success("Theme Check erfolgreich.")
            else:
                st.warning(output)
            with st.expander("Ausgabe", expanded=code != 0):
                st.code(output or "Keine Ausgabe")

    st.divider()
    st.subheader("Qualitätsmatrix")
    quality = [
        {"Prüfung": "Theme-Dateien", "Status": "OK" if missing_count == 0 else "Offen", "Automatisierbar": "Ja"},
        {"Prüfung": "Shopify Theme Check", "Status": "Bereit" if cli_ok else "CLI fehlt", "Automatisierbar": "Ja"},
        {"Prüfung": "Git-Änderungen", "Status": "Bereit" if git_ok else "Git fehlt", "Automatisierbar": "Ja"},
        {"Prüfung": "Live-Schreibzugriff", "Status": "Getrennt", "Automatisierbar": "Bewusst nein"},
    ]
    st.dataframe(quality, use_container_width=True, hide_index=True)

with tab_data:
    st.subheader("Integrationen")
    st.dataframe(integration_rows(), use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Konfiguration")
    config_rows = [
        {"Schlüssel": "THEME_ROOT", "Wert": os.getenv("THEME_ROOT", "nicht gesetzt"), "Sensitiv": "Nein"},
        {"Schlüssel": "PORT", "Wert": os.getenv("PORT", "Railway dynamisch"), "Sensitiv": "Nein"},
        {"Schlüssel": "SUPABASE_URL", "Wert": "gesetzt" if os.getenv("SUPABASE_URL") else "fehlt", "Sensitiv": "Nein"},
        {"Schlüssel": "SUPABASE_PUBLISHABLE_KEY", "Wert": "gesetzt" if os.getenv("SUPABASE_PUBLISHABLE_KEY") else "fehlt", "Sensitiv": "Ja"},
    ]
    st.dataframe(config_rows, use_container_width=True, hide_index=True)
    st.info("Geheimnisse werden absichtlich nicht im Dashboard ausgegeben.")

with tab_system:
    st.subheader("Laufzeit")
    runtime_rows = [
        {"Eigenschaft": "Python", "Wert": os.sys.version.split()[0]},
        {"Eigenschaft": "Arbeitsverzeichnis", "Wert": str(Path.cwd())},
        {"Eigenschaft": "App-Datei", "Wert": str(Path(__file__).resolve())},
        {"Eigenschaft": "Theme Root", "Wert": str(THEME_ROOT)},
        {"Eigenschaft": "Shopify CLI", "Wert": shutil.which("shopify") or "nicht installiert"},
        {"Eigenschaft": "Git", "Wert": shutil.which("git") or "nicht installiert"},
    ]
    st.dataframe(runtime_rows, use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Git / Diagnose")
    b1, b2 = st.columns(2)
    with b1:
        if st.button("Git-Status", use_container_width=True):
            rows, err = git_rows()
            if err:
                st.warning(err)
            elif rows:
                st.dataframe(rows, use_container_width=True, hide_index=True)
            else:
                st.success("Working Tree sauber.")
    with b2:
        if st.button("Git-Diff Statistik", use_container_width=True):
            code, output = run(["git", "diff", "--stat"], cwd=THEME_ROOT)
            if code == 0:
                st.code(output or "Keine Änderungen.")
            else:
                st.warning(output)

    with st.expander("Diagnosehinweise"):
        st.write(
            "Wenn der Railway-Service nur den Ordner control_center als Build-Root erhält, "
            "kann er Theme-Dateien außerhalb dieses Ordners nicht direkt sehen. "
            "Der Theme-Check benötigt zusätzlich die Shopify CLI im Container oder einen externen CI-Check."
        )

st.divider()
st.caption("LEAFerservice Control Center · Schreibende Live-Aktionen bleiben getrennt und kontrolliert.")