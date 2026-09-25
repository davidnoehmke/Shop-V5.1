# LEAFerservice development architecture

```text
ChatGPT
  └─ controlled orchestration, research and owner-approved work
        │
        ├──────────────► Supabase
        │                 └─ authoritative SSOT for product/content/SEO/configurator data
        │                       │
        │                       └──────────────► Shopify data/content projection
        │
        └──────────────► GitHub
                          └─ versioned code, migrations, PRs, CI and release gate
                                │
                                └──────────────► Shopify theme/code projection

Shopify
  └─ storefront, products, collections, metafields, checkout, channels
        │
        ▼
Customers / search engines / sales channels
```

## Verbindliche Grenzen

- ChatGPT ist die kontrollierte Orchestrierungs- und Owner-Oberfläche.
- Supabase ist die einzige editierbare SSOT für Commerce-, Content-, SEO- und Konfiguratordaten.
- GitHub ist die versionierte Implementierungs- und Freigabeschicht für Code, Theme, Migrationen, Prüfregeln und CI.
- Shopify ist Projektionsziel und Rücklesequelle, nicht konkurrierende SSOT.
- Daten-/Contentänderungen laufen kontrolliert ChatGPT -> Supabase -> Shopify.
- Theme-/Codeänderungen laufen zwingend ChatGPT -> GitHub PR -> CI -> Merge -> Shopify.
- Supabase-Schemaänderungen werden versioniert in GitHub geführt und kontrolliert gegen Supabase angewendet.
- Railway, Notion, Google Sheets und LEAF-OS sind nicht Teil der produktiven Route.
- Legacy-Syncs, Admin-Hub-Runtimes und Experimente dürfen keine produktiven Trigger ausführen.
- Schreibende Änderungen an Shopify erfolgen nur aus einem freigegebenen Supabase-Projektionspfad oder einem gemergten und geprüften GitHub-Release.
- Bestehende aktive Produkte dürfen durch Automationen nicht automatisch deaktiviert oder zurückgestuft werden.

## Headless-/Decoupling-Regel

Shopify darf ausgetauscht werden, ohne die fachliche Datenbasis neu zu modellieren. Supabase hält die fachliche Wahrheit; GitHub hält die Implementierung. Shopify ist die aktuelle Commerce- und Storefront-Projektion.
