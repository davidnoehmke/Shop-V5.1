# LEAFerservice Admin Hub

Runtime entrypoint: `control_center/password_hub.py`.

Required Railway environment variables:
- `ADMIN_USERNAME` (optional, defaults to `Admin`)
- `ADMIN_PASSWORD_SHA256`
- `LEAF_LICENSE_SHA256`
- `LEAF_LICENSE_ID`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_CHANGELOG_READ_TOKEN`

Owner sessions remain valid for 48 hours after a successful login. The password is never stored in the repository; only its SHA-256 value is expected as a Railway environment variable.

The app uses the read-only Supabase RPC `public.admin_panel_snapshot(...)`. No service-role key is required or allowed in the UI runtime.

Production start command:

```sh
streamlit run password_hub.py --server.address 0.0.0.0 --server.port $PORT --server.headless true --browser.gatherUsageStats false
```

Healthcheck: `/_stcore/health`.

The application must remain usable when the data RPC fails: show diagnostics instead of a blank page. Shopify writes, GitHub writes, merges and deployments remain separate controlled operations.

## Lokale Entwicklung ohne Authentifizierung

Nur für eine lokale Entwicklungsinstanz können beide Zugangssperren explizit deaktiviert werden:

```sh
LEAF_ENV=development LEAF_DEV_NO_AUTH=true streamlit run control_center/password_hub.py
```

Der Bypass wird nur aktiv, wenn beide Variablen exakt gesetzt sind. Sobald `RAILWAY_ENVIRONMENT` oder `RAILWAY_PROJECT_ID` vorhanden ist, bleibt die Authentifizierung unabhängig vom Dev-Schalter aktiv. Diese Variablen dürfen nicht als Railway-Produktionskonfiguration verwendet werden.
