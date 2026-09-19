# LEAFerservice Shop V5.1

Kanonische, versionierbare Grundlage für LEAFerservice.

## Verbindliche Produktionsroute

```text
Supabase (SSOT)
      │
      ▼
Shopify (Storefront / Commerce-Projektion)
```

GitHub versioniert ausschließlich Code, Migrationen, Prüfregeln und Dokumentation.
Railway hostet ausschließlich den read-only Admin Hub und ist keine Daten- oder
Sync-Quelle. Notion, Google Sheets, LEAF-OS und frühere Parallel-Syncs gehören
nicht zum produktiven Datenpfad.

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `theme/` | Shopify Online Store 2.0 Theme |
| `supabase/migrations/` | versionierte Supabase-Schemaänderungen |
| `control_center/` | read-only Admin Hub auf Basis von Supabase |
| `automation/content-agent/` | Verträge und Vorlagen für kontrollierte Content-Vorbereitung |
| `automation/codex/` | Policy-/Delivery-Helfer und Tests für CI, kein Scheduler |
| `.github/workflows/ci.yml` | reine Validierung/Tests bei PR und Push |
| `docs/` | Architektur, SEO, Deployment und QA |

## Betriebsregeln

- Supabase ist die einzige editierbare SSOT für Produkt-, Content-, SEO- und Konfiguratordaten.
- Shopify ist Storefront, Commerce-Ziel und Verifikations-/Rücklesequelle.
- Automatisches Zurückstufen aktiver Produkte auf Draft/Archived ist verboten.
- Bestandsverfolgung bleibt deaktiviert; Varianten dürfen weiterverkauft werden.
- Kein Notion-, Google-Sheets-, LEAF-OS- oder Railway-Datensync ist Teil der Produktionsroute.
- Veröffentlichungen und schreibende Änderungen bleiben über die vorgesehenen Freigaben kontrolliert.
- Secrets und Runtime-Zugangsdaten werden nicht in Git versioniert.

## Entwicklung

```bash
shopify theme check --path theme
shopify theme push --unpublished --store="$SHOPIFY_STORE" --path theme
```

Vor einer Veröffentlichung die Checkliste in `docs/DEPLOYMENT.md` ausführen.
