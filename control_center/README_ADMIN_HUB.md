# LEAFerservice Admin Hub (Legacy)

Dieser Ordner ist ein historisches Entwicklungsartefakt und **nicht Teil der produktiven LEAFerservice-Pipeline**.

Die verbindliche Produktionsroute ist:

```text
ChatGPT -> Supabase -> Shopify
```

Es gibt keinen produktiven Railway-Admin-Hub. Der Code darf ausschließlich lokal
zu Diagnose-, Entwicklungs- oder Archivzwecken erhalten bleiben. Er darf nicht als
öffentliche Administrationsoberfläche, Runtime, Datenquelle, Scheduler oder Sync-Bus
reaktiviert werden.

The application must remain usable when the data RPC fails: show diagnostics instead of a blank page. Shopify writes, GitHub writes, merges and deployments remain separate controlled operations.

## Lokale Entwicklung ohne Authentifizierung

Nur für eine lokale Entwicklungsinstanz können beide Zugangssperren explizit deaktiviert werden:

```sh
LEAF_ENV=development LEAF_DEV_NO_AUTH=true streamlit run control_center/password_hub.py
```

Der Bypass wird nur aktiv, wenn beide Variablen exakt gesetzt sind. Sobald `RAILWAY_ENVIRONMENT` oder `RAILWAY_PROJECT_ID` vorhanden ist, bleibt die Authentifizierung unabhängig vom Dev-Schalter aktiv. Diese Variablen dürfen nicht als Railway-Produktionskonfiguration verwendet werden.
