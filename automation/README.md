# Automation

## Einzige produktive Datenroute

`Supabase (SSOT) -> Shopify (Storefront / Commerce-Projektion)`

Dieses Repository enthält keinen produktiven Zeitplaner für Notion, Google Sheets,
LEAF-OS oder Railway. Railway ist ausschließlich Hosting für den read-only Admin Hub.

## Verbleibende Komponenten

- `content-agent/`: Verträge, Prompts und Hilfsdateien für kontrollierte Content-Vorbereitung. Keine automatische Veröffentlichung.
- `codex/`: Policy-, Prüf- und Delivery-Helfer, die von CI-Tests verwendet werden. Kein eigenständiger Scheduler.

Die einzige GitHub Action ist `.github/workflows/ci.yml`; sie validiert Repository,
Theme, Migrationen und Pipeline-Code. Sie synchronisiert keine Fremddatenbank und
aktiviert keine externe Legacy-Verbindung.
