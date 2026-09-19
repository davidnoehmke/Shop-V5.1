# LEAFerservice Shop V5.1

Kanonische, versionierbare Grundlage für den LEAFerservice-Shop. Das Repository
trennt den deploybaren Shopify-Theme-Code von Sync, Experimenten und
Dokumentation, ohne eine zweite Theme-Kopie zu erzeugen.

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `theme/` | vollständiger Shopify-Online-Store-2.0-Theme-Root |
| `automation/google-apps-script/` | Legacy-Sync-Code, nicht Teil der produktiven Route |
| `automation/experiments/` | optionale, nicht automatisch aktive Prototypen |
| `automation/ci-examples/` | inaktive Deployment-Vorlagen |
| `docs/` | Architektur, Metafeld-Vertrag, SEO, Deployment und QA |

## Aktueller Stand

Der Theme-Code basiert auf `LEAFerservice_Master_Theme_2026-09-14_v3(3)` vom
14.09.2026 und enthält unter anderem Substrat- und Projekt-Konfigurator,
Produkt-/Collection-Content, Cross-Selling, Trust-Elemente, FAQ-, Produkt- und
Breadcrumb-Structured-Data sowie die zuletzt ergänzten UX-/SEO-Bausteine.

Die produktive Route ist verbindlich: Supabase ist die einzige editierbare SSOT für Commerce- und Content-Daten, Shopify ist Storefront/Projektionsziel und Rücklesequelle, GitHub versioniert Code. Railway hostet ausschließlich den Admin Hub und ist keine Datenquelle. Notion und Google Sheets sind aus dem produktiven Datenpfad getrennt. Legacy-Sync-Code bleibt nur als inaktive Referenz erhalten und darf nicht automatisiert ausgeführt werden. Zugangsdaten und Runtime-Daten werden nicht in Git versioniert.

## Entwicklung

```bash
shopify theme check --path theme
shopify theme push --unpublished --store="$SHOPIFY_STORE" --path theme
```

Vor einer Veröffentlichung die Checkliste in `docs/DEPLOYMENT.md` ausführen.
Der aktuelle Theme-Check-Stand ist in `docs/VALIDATION.md` festgehalten.
Die getrennten Runtime-Secrets, Sicherheitsschalter und der schreibfreie
Konfigurations-Dry-Run sind in `docs/AUTOMATION_RUNTIME.md` dokumentiert.

## Verwandte Repositories

- [LeafersShop/leafertheme_V1](https://github.com/LeafersShop/leafertheme_V1) –
  vorgesehenes Theme-only-Mirror
- [davidnoehmke/leaferpage](https://github.com/davidnoehmke/leaferpage) –
  Headless-/Hydrogen-Arbeitsstand
- [davidnoehmke/LEAF-OS](https://github.com/davidnoehmke/LEAF-OS) –
  ältere Oxygen-/Agent-Experimente
