# Automation

## Produktive Route

Die einzige produktive Datenroute lautet:

`Supabase (SSOT) -> Shopify (Storefront/Projection)`

GitHub versioniert Implementierung und Prüfregeln. Railway hostet nur den Admin Hub und ist keine Datenquelle oder Sync-Schicht.

## Legacy

`google-apps-script/` enthält historischen Shopify/Google-Sheets/Notion-Sync-Code. Dieser Pfad ist ausdrücklich deaktiviert und nicht Teil der produktiven Architektur. Er darf keine Trigger, Rücksyncs oder schreibenden Automationen gegen Shopify, Supabase oder Notion betreiben.

`experiments/` enthält optionale Prototypen. Sie werden nicht automatisch geladen oder ausgeführt.
