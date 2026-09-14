# Source of truth

## Shopify Theme

| Quelle | Status | Verwendung |
|---|---|---|
| `LEAFerservice_Master_Theme_2026-09-14_v3(3).zip` | lokaler Master-Export, SHA-256 `53a97b1a…` | Primäre Theme-Grundlage |
| Shopify `Leaferservice Shop` · `gid://shopify/OnlineStoreTheme/189655417217` | unveröffentlicht, 97 Dateien | Referenz für den letzten Shopify-Stand |
| Shopify `Leaferservice Shop` · `gid://shopify/OnlineStoreTheme/189741891969` | Live, 88 Dateien | Produktionsreferenz, nicht als Schreibziel |
| Shopify `Kopie von Leaferservice Shop` · `gid://shopify/OnlineStoreTheme/190356259201` | unveröffentlicht, 88 Dateien | ältere Kopie, nicht primär |
| `davidnoehmke/Shop-V5.1/theme` | Ziel-Repository | kanonischer deploybarer Theme-Root |

Der lokale Master enthält zusätzliche, bereits erarbeitete Sections und Templates
wie den Projekt-Konfigurator, Entscheidungshelfer, Breadcrumbs, Collection Guide,
Component Signature und die erweiterten Substrat-/Produktbausteine. Sein Inhalt
wird in `davidnoehmke/Shop-V5.1/theme` direkt im Theme-Root versioniert.
Für die versionierbare Grundlage wurde die FAQ-Key-Liste in
`snippets/product-faq-structured-data.liquid` normalisiert, damit die
Liquid-Prüfung den Loop zuverlässig akzeptiert. Zusätzlich wurden nur
prüfungsrelevante Integrationsfehler bereinigt: fehlende Bilddimensionen,
zu lange Section-Schemanamen, veraltete Asset-Fallbacks und fehlende deutsche
SEO-Übersetzungen. Die übrigen Kompatibilitätswarnungen sind in
`docs/VALIDATION.md` dokumentiert.

## Automation

`automation/google-apps-script/` stammt aus dem zuletzt bereitgestellten
bidirektionalen `LEAFerservice_Shopify_Notion_Bidirectional_Sync.zip` und enthält
die am 14.09. gehärtete, credential-freie Fassung.

Der Sync trennt bewusst:

- Shopify als führende Quelle für Live-Commerce-Felder
- Notion als redaktionelle Wissens- und Content-Basis
- Google Sheets als kontrollierte Freigabe-/Audit-Schicht

`davidnoehmke/Shop-V5.1` enthält Theme, Sync, Dokumentation und Experimente in
getrennten Pfaden. `theme/` bleibt die alleinige Quelle für deploybaren
Theme-Code.

Tokens, Spreadsheet-IDs und Datenbank-IDs werden erst bei der privaten
Installation in Script Properties hinterlegt.

## Verwandte Repositories

- `LeafersShop/leafertheme_V1` – vorgesehenes Theme-only-Mirror
- `davidnoehmke/leaferpage` – Headless-/Hydrogen- und Theme-Arbeitsstand
- `davidnoehmke/LEAF-OS` – Agent-/Substratwelt-Arbeitsstand
- `davidnoehmke/seo-performing-leaferservice` – SEO-Arbeitsstand
- `davidnoehmke/Leaferservice-Knowledge-organic-grouth` – Wissens-/Content-Repository
