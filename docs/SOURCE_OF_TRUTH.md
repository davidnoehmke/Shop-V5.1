# Source of truth

## Verbindlicher Produktionszustand

| Bereich | Autorität | Rolle |
|---|---|---|
| Produkt-/Content-/SEO-Daten | Supabase | einzige editierbare SSOT |
| Storefront/Commerce | Shopify | Projektion, Checkout, Sales Channels, Rücklesequelle |
| Orchestrierung | ChatGPT | kontrollierte Research-, Prüf- und Owner-Workflows |
| Code/Migrationen | GitHub `davidnoehmke/Shop-V5.1` | versionierte Implementierung, keine Runtime |
| `control_center/` | Legacy | Entwicklungs-/Archivartefakt, nicht produktiv |
| Railway | ausgeschlossen | keine Runtime, kein Sync-Bus, keine Business-Logik |
| Notion | getrennt | keine produktive Datenquelle |
| Google Sheets / Apps Script | getrennt | Legacy, keine produktive Datenquelle |

## Konfliktregeln

- Supabase gewinnt bei Produktinhalt, VK-Preis, Produktidentität, Produktstatus und Metafeld-Schema gemäß `commerce_ssot_policy`.
- Shopify-IDs und Handles werden erhalten und als Projektion/Rücklese-Referenz verwendet.
- Automationen dürfen aktive Produkte nicht automatisch auf Draft/Archived zurücksetzen.
- Kein bidirektionaler Notion-/Sheets-Rücksync darf den produktiven Pfad beeinflussen.
- Railway darf nicht als Runtime, Sync-Bus, Business-Logik oder Content-Quelle reaktiviert werden.

## Legacy

Historische Railway-, Notion-, Google-Sheets-, LEAF-OS- und alternative Sync-Pfade sind nicht Teil der produktiven Architektur. Sie dürfen nur als Dokumentation/Archiv existieren, solange sie keine Trigger oder schreibenden Verbindungen aktivieren.
