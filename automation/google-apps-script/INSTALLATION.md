# LEAFerservice Shopify-Sync

Ziel ist die zentrale Pflege in der Google-Tabelle „LEAFerservice | content_db“ mit einem kontrollierten Apps-Script-Abgleich zu Shopify.

## Installation

1. Öffne die private Zieltabelle „LEAFerservice | content_db“.
2. Wähle Erweiterungen → Apps Script.
3. Ersetze den Inhalt von Code.gs durch die bereitgestellte Datei Code.gs.
4. Aktiviere in den Projekteinstellungen die Manifestdatei und ersetze appsscript.json durch die bereitgestellte Version.
5. Speichern, die Tabelle neu laden und das neue Menü „Shopify Sync“ öffnen.
6. „1 · Verbindung einrichten“ wählen und Shop-Domain sowie Admin-API-Token eingeben.
7. „2 · Verbindung testen“ ausführen.
8. „3 · Shopify-IDs abgleichen“ ausführen. Dieser Schritt liest Shopify nur und verhindert Dubletten durch eindeutige SKU-/Handle-Prüfung.
9. In Shopify_Sync nur gewünschte Zeilen in Spalte A freigeben.
10. Zuerst immer „4 · Dry-Run erstellen“ ausführen.

## Aktueller Sicherheitszustand

- Shopify_Config steht auf DRY_RUN.
- UPDATE_ONLY ist TRUE.
- ALLOW_PUBLISH ist FALSE.
- SYNC_INVENTORY ist FALSE.
- Alle 71 Freigabe-Checkboxen sind FALSE.
- Das Script enthält keine Funktion zur Produktneuanlage.
- Der Produktstatus wird nicht an Shopify gesendet.
- Bestand 50 ist gelb markiert und nur eine Annahme aus der Katalogvorgabe.

## Benötigte Shopify-Berechtigungen

Die Custom App benötigt mindestens read_products und write_products. Für Bestände sind zusätzliche Inventory-Berechtigungen und eine geprüfte Location-GID nötig; der Bestands-Sync ist in dieser Version absichtlich gesperrt.

## Live-Sync

Live ist nur möglich, wenn alle folgenden Bedingungen erfüllt sind:

1. MODE in Shopify_Config wird bewusst auf LIVE gesetzt.
2. Die einzelne Zeile ist in Shopify_Sync freigegeben.
3. ID-Abgleich ist eindeutig und Sync-Aktion lautet UPDATE.
4. Beim Start wird exakt LIVE eingegeben.

Auch dann werden weder neue Produkte erstellt noch vorhandene Produkte veröffentlicht.

## Datenzuordnung

- Produkte: Kernfelder, Beschreibung, SEO und leafer.content_db
- Varianten: Preis per Variant-GID
- FAQ: leafer.faq
- Cross Selling: leafer.cross_sell_products und leafer.cross_sell_payload
- SEO: Shopify-SEO und leafer.seo_payload
- Probleme, Lösungen, Bilder, Blogs und Pflanzen: optionale Shop-JSON-Metafelder ohne Theme- oder Artikel-Veröffentlichung
- Analytics: derzeit ausgeschlossen, da die Schlüsselspalten A:E in allen 71 Datenzeilen leer sind

## Shopify → Notion Rücksync

Die aktuelle Version enthält zusätzlich einen sicheren Rückkanal. Shopify ist
für Live-Commerce-Felder führend; redaktionelle Inhalte in Notion werden nicht
überschrieben.

1. Teile die Notion-Datenbank „LEAFerservice Produktdatenbank – Backup 2026-07-20“
   mit deiner Notion-Integration.
2. Öffne im Tabellenmenü „Shopify Sync“ den Punkt „9 · Shopify → Notion
   Automatik einrichten“.
3. Hinterlege den Notion-Integration-Token und die private Datenbank-ID
   deiner Notion-Produktdatenbank.
4. Führe zuerst „7 · Shopify → Notion Rücksync (Dry-Run)“ aus.
5. Nach erfolgreicher Prüfung läuft der Rücksync stündlich automatisch.

Zurückgeschrieben werden Titel, Shopify-GID, Handle, Status, Vendor, Produktlink,
SKUs, Varianten/Größen, erster Variantenpreis und Synchronisationszeitpunkt.
HTML-Produktbeschreibung, FAQs, Rezepturen, SEO-Briefings, Cross-Selling und
Kalkulationsdaten bleiben unangetastet. Neue Shopify-Produkte werden als neue
Notion-Datensätze angelegt.
