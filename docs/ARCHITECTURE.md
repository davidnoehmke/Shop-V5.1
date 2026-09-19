# LEAFerservice development architecture

```text
Supabase
  └─ authoritative SSOT for product/content/SEO/configurator data
        │
        ▼
Shopify
  └─ storefront, products, collections, metafields, channels
        │
        ▼
Customers / search engines / sales channels

GitHub
  └─ versioned code and migrations

Admin Hub
  └─ read-only operational view over Supabase

Railway
  └─ hosting runtime for Admin Hub only
```

## Verbindliche Grenzen

- Supabase ist die einzige editierbare Datenquelle für Commerce- und Content-Daten.
- Shopify ist Projektionsziel und Rücklesequelle, nicht konkurrierende SSOT.
- GitHub enthält Code, Migrationen und Dokumentation, aber keine operative Content-SSOT.
- Railway hostet den Admin Hub; Railway ist weder Datenquelle noch Sync-Bus.
- Notion und Google Sheets sind nicht Teil der produktiven Route.
- Legacy-Syncs und Experimente dürfen keine produktiven Trigger ausführen.
- Schreibende Änderungen an Shopify erfolgen nur kontrolliert aus dem festgelegten Supabase-Projektionspfad.
- Bestehende aktive Produkte dürfen durch Automationen nicht automatisch deaktiviert oder zurückgestuft werden.
