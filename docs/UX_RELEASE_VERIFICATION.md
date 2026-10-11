# UX-Auslieferung prüfen

Code folgt Branch → PR → CI → Merge → native Shopify-GitHub-Synchronisierung.
Das Theme liegt im Repository-Stamm. Daten folgen Supabase → Shopify.

Der öffentliche Linkcheck verwendet weiterhin die öffentlichen DE/EN-Sitemaps
und prüft jeden gefundenen internen Pfad, Weiterleitungen, Sprachpräfixe,
HTTP-Status sowie Liquid- und Übersetzungsfehler.

Wenn der aktuelle Live-Stand fehlerhaft ist und ein PR diesen Fehler repariert,
kann der Linkcheck den nachweislich passenden unveröffentlichten Theme-Stand
prüfen. Zuerst alle Theme-Dateien des Kandidaten hochladen, API-Prüfsummen
rücklesen und Browser-Flows prüfen. Erst dann im PR-Text festhalten:

`<!-- leaf-preview theme_id=<numerische Theme-ID> source_sha=<40-stellige PR-Head-SHA> -->`

Die Markierung gilt nur für den exakten PR-Head. Nach jeder Änderung neu
hochladen, rücklesen und die Markierung aktualisieren. Eine veraltete Markierung
lässt den Check fehlschlagen. Ohne Markierung prüft er Produktion.
Es werden keine Fehlerarten ausgeblendet oder Routen ausgenommen.

Nach dem Merge erneut ohne Vorschau-Markierung prüfen:

```bash
node automation/codex/live-links.cjs
```

Zusätzlich MAIN-Theme-Dateien und echte Interaktionen rücklesen bzw. testen.
Ein grüner Vorschau-Check beweist keine Live-Auslieferung. Mikrofon und hörbare
Sprachqualität erfordern einen gesonderten Gerätetest.
