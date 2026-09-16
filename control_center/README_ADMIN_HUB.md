# LEAFerservice Admin Hub

Runtime entrypoint: `control_center/admin_hub.py`.

Required Railway environment variables:
- `LEAF_LICENSE_SHA256`
- `LEAF_LICENSE_ID`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_CHANGELOG_READ_TOKEN`

The app uses the read-only Supabase RPC `public.admin_panel_snapshot(...)`. No service-role key is required or allowed in the UI runtime.

Production start command:

```sh
streamlit run admin_hub.py --server.address 0.0.0.0 --server.port $PORT --server.headless true --browser.gatherUsageStats false
```

Healthcheck: `/_stcore/health`.

The application must remain usable when the data RPC fails: show diagnostics instead of a blank page. Shopify writes, GitHub writes, merges and deployments remain separate controlled operations.
