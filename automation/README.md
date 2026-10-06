# Automation

## Einzige produktive Datenroute

`ChatGPT -> Supabase (SSOT) -> Shopify (Storefront / Commerce-Projektion)`

ChatGPT übernimmt kontrollierte Orchestrierung und Vorbereitung. Supabase bleibt
die einzige editierbare SSOT und Shopify die einzige produktive Commerce-Projektion.
Dieses Repository enthält keinen produktiven Zeitplaner oder Runtime-Pfad für
Railway, Notion, Google Sheets oder LEAF-OS.

## Verbleibende Komponenten

- `content-agent/`: Verträge, Prompts und Hilfsdateien für kontrollierte Content-Vorbereitung. Keine automatische Veröffentlichung.
- `codex/`: Policy-, Prüf- und Delivery-Helfer, die von CI-Tests verwendet werden. Kein eigenständiger Scheduler.

Die einzige GitHub Action ist `.github/workflows/ci.yml`; sie validiert Repository,
Theme, Migrationen und Pipeline-Code. Sie synchronisiert keine Fremddatenbank und
aktiviert keine externe Legacy-Verbindung.


## Storefront-Freeze

Seit 2026-09-19 sind proaktive Theme-/SEO-UX-Umbauten deaktiviert. Der Content-Agent
bereitet standardmäßig nur Produkt- und Blog-Kandidaten vor. SEO-/UX-Änderungen sind
nur on-demand zulässig, wenn ein verifizierter Fehler, ein belastbares Signal aus
Search Console/Analytics, eine zwingende technische/rechtliche Anforderung oder eine
explizite Owner-Freigabe vorliegt.
