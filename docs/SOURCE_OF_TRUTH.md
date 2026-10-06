# Source of truth

## Verbindlicher Produktionszustand

| Bereich | Autorität | Rolle |
|---|---|---|
| Produkt-/Content-/SEO-Daten | Supabase | einzige editierbare fachliche SSOT |
| Storefront/Commerce | Shopify | Projektion, Checkout, Sales Channels, Rücklesequelle |
| Orchestrierung | ChatGPT | kontrollierte Research-, Prüf- und Owner-Workflows |
| Code/Theme/Migrationen | GitHub `davidnoehmke/Shop-V5.1` | versionierte Implementierung, PR-/CI-Release-Gate, keine Runtime |
| `control_center/` | Legacy | Entwicklungs-/Archivartefakt, nicht produktiv |
| Railway | ausgeschlossen | keine Runtime, kein Sync-Bus, keine Business-Logik |
| Notion | getrennt | keine produktive Datenquelle |
| Google Sheets / Apps Script | getrennt | Legacy, keine produktive Datenquelle |

## Projektionspfade

### Daten und Content

`ChatGPT -> Supabase -> Shopify`

Supabase hält die fachliche Wahrheit. Shopify erhält nur freigegebene Projektionen und
liefert technische Readbacks wie GIDs, Handles, URLs, Status und Verifikation zurück.

### Theme, Code und Struktur

`ChatGPT -> GitHub Branch -> Pull Request -> CI -> Merge -> Shopify`

Theme- oder Codeänderungen dürfen nicht direkt an GitHub vorbei in Produktion gelangen.
Für Supabase-Schema-/Policy-Änderungen bleibt GitHub die versionierte Migrationsquelle.

## Konfliktregeln

- Supabase gewinnt bei Produktinhalt, VK-Preis, Produktidentität, Produktstatus und Metafeld-Schema gemäß `commerce_ssot_policy`.
- Shopify-IDs und Handles werden erhalten und als Projektion/Rücklese-Referenz verwendet.
- Theme-/Storefront-Struktur wird nur aus einem gemergten und geprüften GitHub-Stand projiziert.
- Automationen dürfen aktive Produkte nicht automatisch auf Draft/Archived zurücksetzen.
- Kein bidirektionaler Notion-/Sheets-Rücksync darf den produktiven Pfad beeinflussen.
- Railway darf nicht als Runtime, Sync-Bus, Business-Logik oder Content-Quelle reaktiviert werden.

## Headless-/Decoupling-Regel

Die fachliche Datenbasis darf nicht an Shopify gebunden sein. Ein späteres Ablösen des
Shopify-Frontends darf keinen Neuaufbau von Pflanzen-, Produkt-, Content-, SEO- oder
Konfiguratordaten erfordern. Supabase bleibt SSOT; GitHub bleibt Implementierungs- und
Release-Schicht.

## Legacy

Historische Railway-, Notion-, Google-Sheets-, LEAF-OS- und alternative Sync-Pfade sind nicht Teil der produktiven Architektur. Sie dürfen nur als Dokumentation/Archiv existieren, solange sie keine Trigger oder schreibenden Verbindungen aktivieren.
