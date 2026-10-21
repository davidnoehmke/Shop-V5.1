# PR #210: Enterprise V8 Daten- und Codeprüfung

Prüfdatum: 20.10.2026 (Europe/Berlin). Ausgangs-Head: f79b5594cb48e34d90ceb98074df3728309e8067; main: 0f931f7bb8b9ab4c6b186cb2667d6acda6f468c9. Draft offen lassen, nicht mergen.

## Quellen und Umfang

Live gelesen: Shopify Admin (Shop edquz9-1p.myshopify.com), sämtliche Treffer der Produktsuche inklusive vendor:Blumat, Varianten, Metafelder, Veröffentlichungen und englische Produktübersetzungen; alle jeweiligen Pagination-Flags false. Supabase LEAFerservice-SSOT (vbqimcwaxcydegqlkkgw): storefront_product_content, product_candidate_packages sowie zugehörige product_observations/product_readiness-Zählung. GitHub PR, main, freeze/best-verified, Rulesets und CI. Keine Produkt-/Supabase-Daten geändert.

Liquid fragt Supabase nicht direkt ab. Die Anbindung erfolgt über die Shopify-Projektion (leafer.*, irrigation_spec.* und optionale custom.homepage_*). Es gibt keinen geprüften automatischen Nachweis, dass Änderungen in Supabase bereits nach Shopify synchronisiert sind.

## Vollständigkeit und Identität

19 Blumat-Produkte, 19 Varianten, eindeutige Shopify-IDs, Handles und SKUs. Keine doppelten Blumat-Handles in storefront_product_content. Keine automatischen Zusammenführungen: Classic/XL bzw. Easy/XL sind unterschiedliche Modelle. Alle vier Default-Handles existieren. Blumat Digital ist jedoch in keinem Kanal veröffentlicht und öffentlich nicht erreichbar; es darf nicht zur Behebung der Vorschau veröffentlicht werden.

storefront_product_content: nur 3 Datensätze (Classic, Easy, Set12), somit 16 fehlende Inhaltsdatensätze. product_candidate_packages: dagegen 19 Kandidaten, sämtlich mit verknüpfter Shopify-GID. 11 Kandidaten-Handles weichen von Shopify ab (siehe Tabelle); nach stabiler GID zuordnen, daraus keine neuen Produkte erzeugen. Kandidatenstatus published ist kein Nachweis einer Kanalveröffentlichung: bei 16 Produkten sind keine Veröffentlichungen vorhanden. Kandidaten führen weiterhin Beschreibungs-/SEO-Blocker. product_observations: 0 verknüpfte Zeilen; product_readiness: nur 1 verknüpfte Zeile. Diese Tabellen bilden somit keinen vollständigen aktuellen Blumat-Prüfstand.

| Shopify-Handle | Produkt-ID | SKU | Preis EUR (unverändert) | Onlineshop veröffentlicht | storefront_product_content | Kandidaten-Handle bei Abweichung |
|---|---|---|---:|---|---|---|
| blumat-classic-automatische-pflanzenbewasserung-3er-set | 15562125246849 | LF-BLUMAT-CLASSIC-3 | 10.89 | ja | ja | blumat-classic-pack |
| blumat-easy-flaschenadapter-fur-pflanzenbewasserung-3er-set | 15564431819137 | BLUMAT-EASY-23308 | 10.39 | ja | ja | blumat-easy-pack |
| tropf-blumat-set12 | 15564432015745 | BLUMAT-SET12-30009 | 62.90 | ja | ja | blumat-tropf-set12 |
| blumat-classic-xl-pack | 15567475507585 | BLUMAT-10520 | 10.89 | nein | fehlt | identisch |
| blumat-easy-xl-pack | 15567475671425 | BLUMAT-22202 | 10.39 | nein | fehlt | identisch |
| tropf-blumat-maxi | 15567475802497 | BLUMAT-33000 | 12.99 | nein | fehlt | blumat-tropf-maxi |
| tropf-blumat-erweiterung | 15567475835265 | BLUMAT-32003 | 9.89 | nein | fehlt | blumat-tropf-erweiterung |
| blumat-digital | 15567475933569 | BLUMAT-50205 | 44.90 | nein | fehlt | identisch |
| blumat-druckreduzierer | 15567476031873 | BLUMAT-36001 | 31.99 | nein | fehlt | identisch |
| blumat-hochtankanschluss | 15567476097409 | BLUMAT-30238 | 3.49 | nein | fehlt | identisch |
| blumat-zufuhrschlauch-8-mm | 15567476195713 | BLUMAT-30405 | 10.79 | nein | fehlt | blumat-zufuhrschlauch-8mm |
| blumat-wasserfilter-fur-hochtank | 15567476326785 | BLUMAT-30250 | 5.49 | nein | fehlt | blumat-wasserfilter-hochtank |
| tropf-blumat-set40 | 15567476457857 | BLUMAT-31006 | 209.90 | nein | fehlt | blumat-tropf-set40 |
| blumat-verteiltropfer-set | 15567476621697 | BLUMAT-41005 | 12.99 | nein | fehlt | identisch |
| blumat-tropfschlauch-3-mm | 15567476720001 | BLUMAT-35509 | 13.49 | nein | fehlt | blumat-tropfschlauch-3mm |
| blumat-absperrventil-8-mm | 15567476851073 | BLUMAT-32102 | 3.79 | nein | fehlt | blumat-absperrventil-8mm |
| blumat-schlauchverbinder-t-stucke-winkel | 15567476916609 | BLUMAT-32805 | 2.59 | nein | fehlt | blumat-schlauchverbinder-set |
| blumat-verstellsicherung | 15567476982145 | BLUMAT-3411 | 0.25 | nein | fehlt | identisch |
| blumat-digital-schutzkappe | 15567477047681 | BLUMAT-5005 | 3.29 | nein | fehlt | identisch |

## Widersprüche und offene Datenprüfungen

- Classic: Shopify 10,89 EUR; Supabase-Snapshot current_shopify_price_eur 12,73 EUR.
- Easy: Shopify 10,39 EUR; Supabase-Snapshot 11,44 EUR.
- Set12: Shopify 62,90 EUR; Supabase-Snapshot 0,00 EUR plus alter Preisblocker.
- Alle drei Supabase-release.shopify_status noch DRAFT, Shopify tatsächlich ACTIVE und auf zehn zurückgegebenen Kanälen veröffentlicht. Freigabe-/GPSR-/Bild-/Kalkulationsmarker in Supabase sind weiterhin false. Beobachtete Veröffentlichung ersetzt keine fachliche Freigabe.
- Alle 19 Shopify-Produkte ACTIVE; nur die ersten drei veröffentlicht. Alle Varianten mit inventoryQuantity=0, inventoryPolicy=CONTINUE und tracked=false. Damit bedeutet 0 nicht ausverkauft. Nicht veröffentlichte Produkte sind trotzdem nicht im Onlineshop bestellbar. Keine Lieferzeit oder reale Lieferfähigkeit daraus ableiten; kein Checkout/Kauf ausgeführt.
- GPSR-Herstellername, Adresse und Kontakt sind vorhanden. review_status bleibt bei drei Produkten safety_docs_and_electrical_battery_checks_pending und bei 16 pending. Vorhandene Felder sind kein Nachweis abgeschlossener Sicherheitsprüfung. Keine GPSR-Vollständigkeit bestätigt.
- Die drei intros stimmen exakt zwischen Supabase und leafer.intro überein. Die Felder plants_supported, water_source, power_supply, water_tank_included und model_number stimmen bei diesen drei Produkten mit den entsprechenden Supabase-specification-Werten überein. Die übrigen 16 Produkte haben in der gelesenen Projektion keine irrigation_spec-Eigenschaften und überwiegend nur leafer.subtitle/primary_function.
- custom.homepage_intro und custom.homepage_badge sind in den gelesenen Blumat-Metafeldern nicht gesetzt. Der ursprüngliche Fallback hatte für die 16 neuen Artikel keine Kurzbeschreibung.
- Alle 19 Produkte besitzen ein featuredImage. Neuere Herstellerabbildungen in Shopify widersprechen alten Supabase-KI-Bild-/Prüfmarkierungen bei Easy/Set12; keine automatische Bildfreigabe oder Verifikation der Bildrechte vorgenommen.
- Shopify liefert für alle 19 Produkte keine englischen Produktübersetzungen zurück. Englische Oberfläche und lokalisierte Routen lösen nicht fehlende Übersetzungen von Titeln, Beschreibungen und Eigenschaftswerten. Metafeldübersetzungen sind nicht separat als vollständig verifiziert.

## Codekorrekturen

- Ungültigen Section-Namen auf maximal 25 Zeichen gekürzt (vorher 26; Upload-Fehler).
- Produktwelt-Link von nicht vorhandenem fertige-substratmischungen auf vorhandenes pflanzsubstrate-mischungen korrigiert. Produktwelt-Links erhalten den aktiven routes.root_url-Sprachpfad; Produktlinks nutzen Shopifys natives item.url.
- Alle statischen Vorschau-Texte in vorhandene DE/EN-Locale-Dateien aufgenommen.
- Bis zu 20 Blumat-Produkte im Theme-Editor auswählbar. Leere Auswahl nutzt die vier ursprünglichen kuratierten Handles. Dies ist bewusst ein Schaufenster, kein vollständiger Katalogexport. Fehlende/unveröffentlichte Produkte werden nicht als falsche Platzhalter oder tote Produktlinks eingebaut; Hinweis nur im Theme-Editor, zusätzlich neutraler öffentlicher Leerzustand.
- Preis bleibt direkt aus Shopify, mit Währung und Ab-Kennzeichnung bei variierenden Preisen. Keine Preisänderung.
- Verfügbarkeit über item.available mit Bestellbar/Derzeit nicht verfügbar. Keine erfundene Lager- oder Lieferzeitzusage.
- Kurzbeschreibung: custom.homepage_intro -> leafer.intro -> leafer.subtitle -> Produktbeschreibung; HTML entfernt und Text escaped. Nur vorhandene irrigation_spec-Eigenschaften zeigen; false beim Tank bleibt Nein, fehlende Daten bleiben leer.
- Kleinere Hero-Überschrift, einspaltige mobile Karten, Umbruch langer Titel, Fokusmarkierung und passende responsive Bildgrößen.

## Validierung und Grenzen

- Shopify Theme Check für die drei geänderten Theme-Dateien: bestanden nach Korrektur des Schema-Namens.
- 96 vorhandene Pipeline-/Runtime-Tests und 5 mobile CSS-Tests: bestanden.
- Zusätzlicher lokaler LiquidJS-Renderingtest: DE/EN, aktuelle Preise, fehlendes Digital, falscher Vendor, konfigurierbare Produktauswahl, Verfügbarkeit, Ab-Preis, fehlendes Bild/Metafeld und false-Tank sowie Leer-/Editorzustand bestanden. Shopify-spezifische Bild-/Währungsfilter im lokalen Test ersetzt; kein Beweis für Shopify-Laufzeit.
- Lokale Chromium-Layoutmessung bei 320, 375, 390, 430, 640, 1280 und 1440 px ohne horizontalen Überlauf. Mit Systemschriften erneut lokal gerendert; Textumbruch kontrolliert, Produktbilder in diesem lokalen Test nicht geladen. Keine Shopify-Laufzeitfreigabe daraus. Echte Shopify-Desktop-/Mobilvorschau noch nicht bestätigt. Kein leaf-preview-Erfolgsmarker gesetzt.
- Ausgangs-CI: vier Jobs bestanden, Public DE/EN link verification fehlgeschlagen (455 Routen, neun 404), u.a. Blumat Digital, Set40, Zufuhrschlauch, Erweiterung und unveröffentlichte Bewässerungsseite/-Collection. Diese externen Produkt-/Veröffentlichungsprobleme dürfen nicht durch automatische Publikation oder abgeschwächte Tests kaschiert werden.
- Shopify-Installation: themeDuplicate lieferte newTheme=null ohne Fehler; keine neue Theme-ID im Read-back. themeCreate(role=UNPUBLISHED) meldete Src is empty. Bisher keine verifizierte neue Vorschau; keine bestehende Vorschau überschrieben.

## Aktuelle öffentliche Linkprüfung

46 DE/EN-Routen geprüft: die drei veröffentlichten Blumat-Produkte in beiden Sprachen HTTP 200; die 16 unveröffentlichten Produkte in beiden Sprachen HTTP 404. Die korrigierten Substrat- und Beleuchtungscollections liefern HTTP 200. /pages/substrat-konfigurator leitet in beiden Sprachen unter Erhalt der Sprache auf /pages/individuelles-substrat um. Der alte Fertigsubstrat-Link liefert zwar HTTP 200, leitet aber auf die Startseite mit SEO-Fragment um und ist daher sachlich falsch. Keine Liquid-Fehler in diesen Antworten.

## Unabhängiger Controller-Nachcheck vor Freigabe

Exakten überarbeiteten PR-Head, CI, Datenkonflikte und unveröffentlichte Theme-ID separat prüfen. Echte DE/EN-Produktlinks und mobile 320–430 px sowie 200-%-Zoom im Shopify-Theme prüfen. Keine Veröffentlichung, kein Merge und keine Backend-Auslieferung aus diesem Auftrag ableiten. Die im Ausgangs-PR bereits vorhandene Änderung an storefront-assistant wurde unverändert belassen und nicht deployt.
