# LEAFerservice development architecture

```text
ChatGPT
  └─ controlled orchestration, research and owner-approved work
        │
        ▼
Supabase
  └─ authoritative SSOT for product/content/SEO/configurator data
        │
        ▼
Shopify
  └─ storefront, products, collections, metafields, checkout, channels
        │
        ▼
Customers / search engines / sales channels

GitHub
  └─ versioned code, migrations, CI and documentation only
```

## Verbindliche Grenzen

- Die produktive Pipeline ist ausschließlich ChatGPT -> Supabase -> Shopify.
- Supabase ist die einzige editierbare Datenquelle für Commerce- und Content-Daten.
- Shopify ist Projektionsziel und Rücklesequelle, nicht konkurrierende SSOT.
- GitHub enthält Code, Migrationen, CI und Dokumentation, aber keine produktive Runtime und keine operative Content-SSOT.
- Railway, Notion, Google Sheets und LEAF-OS sind nicht Teil der produktiven Route.
- Legacy-Syncs, Admin-Hub-Runtimes und Experimente dürfen keine produktiven Trigger ausführen.
- Schreibende Änderungen an Shopify erfolgen nur kontrolliert aus dem festgelegten Supabase-Projektionspfad.
- Bestehende aktive Produkte dürfen durch Automationen nicht automatisch deaktiviert oder zurückgestuft werden.
