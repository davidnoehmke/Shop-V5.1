# LEAFerservice Admin Hub (Legacy)

Dieser Ordner ist ein historisches Entwicklungsartefakt und **nicht Teil der produktiven LEAFerservice-Pipeline**.

Die verbindliche Produktionsroute ist:

```text
ChatGPT -> Supabase -> Shopify
```

Es gibt keinen produktiven Railway-Admin-Hub. Der Code darf ausschließlich lokal
zu Diagnose-, Entwicklungs- oder Archivzwecken erhalten bleiben. Er darf nicht als
öffentliche Administrationsoberfläche, Runtime, Datenquelle, Scheduler oder Sync-Bus
reaktiviert werden.

Shopify-Schreibvorgänge und Supabase-Änderungen bleiben kontrollierte Operationen
mit Owner-Freigabe; GitHub dient nur Code, CI, Migrationen und Dokumentation.
