# Legacy: Shopify / Google Sheets / Notion Sync

Dieser Pfad ist außer Betrieb.

Der frühere bidirektionale Shopify↔Google-Sheets↔Notion-Sync ist **nicht Teil der produktiven LEAFerservice-Architektur**. Es dürfen keine Trigger eingerichtet, keine Tokens hinterlegt und keine Live-Syncs gestartet werden.

## Aktuelle produktive Route

`Supabase (SSOT) -> Shopify (Storefront/Projection)`

GitHub versioniert Code und Migrationen. Railway hostet ausschließlich den Admin Hub. Notion und Google Sheets sind getrennt und dürfen keine Commerce- oder Content-Daten in Shopify zurückschreiben.

Diese Datei bleibt nur als historische Referenz erhalten.
