# LEAFerservice Metafeld-Vertrag

Das Theme liest redaktionelle, SEO- und konfigurationsbezogene Inhalte aus Shopify-Metafeldern. Ziel ist eine gemeinsame Inhaltsquelle für sichtbaren Content, Meta-Daten und strukturierte Daten.

## SEO Content Contract

Für Produkte und Collections gilt dieselbe Priorität: explizite SEO-Felder -> strukturierte LEAFer-Felder -> Shopify Standardinhalt als Fallback.

| Owner | Feld | Zweck |
| --- | --- | --- |
| Produkt/Collection | `custom.seo_title` | kontrollierter Seitentitel |
| Produkt/Collection | `custom.seo_description` | kontrollierte Meta Description |
| Produkt/Collection | `leafer.longtail_keywords` | priorisierte Longtail-Cluster, bevorzugt `list.single_line_text_field` |
| Produkt/Collection | `leafer.keywords` | bestehender Keyword-Fallback |
| Produkt/Collection | `leafer.search_intent` | Suchintention / semantisches Seitenthema |
| Produkt | `custom.use_case` | primärer Einsatzbereich |
| Produkt | `leafer.suitable_for` | Eignungs-Fallback |
| Collection | `leafer.guide` | redaktioneller Guide / Themenkontext |

Longtail-Begriffe dürfen nicht als versteckter Spam-Text ausgegeben werden. Sie müssen den sichtbaren Inhalten entsprechen und werden zentral vom Theme aufgelöst. Produkt-, Collection-, FAQ-, HowTo-, Meta- und JSON-LD-Ausgaben sollen semantisch aus demselben Datensatz gespeist werden.

## Einheitlicher SEO- und Content-Vertrag

Für Produkte und Collections gilt: explizite SEO-Felder → strukturierte LEAFer-
Felder → Shopify-Standardinhalt als Fallback. Sichtbarer Inhalt hat Vorrang vor
maschinenlesbarer Ausgabe. JSON-LD darf keine Aussagen erfinden, die für Nutzer
auf der Seite nicht inhaltlich vertreten sind.

Zusätzliche redaktionelle Felder:

| Owner | Namespace / Key | Empfohlener Typ | Zweck |
| --- | --- | --- | --- |
| Produkt/Collection | `custom.seo_title` | single line text | kontrollierter Seitentitel |
| Produkt/Collection | `custom.seo_description` | multi line text | kontrollierte Meta Description |
| Produkt/Collection | `leafer.longtail_keywords` | list.single_line_text_field | priorisierter Longtail-Cluster als redaktionelle Eingabe |
| Produkt/Collection | `leafer.search_intent` | single line text | Suchintention / semantisches Seitenthema |

`leafer.longtail_keywords` wird bewusst nicht als `meta keywords` oder versteckte
Keyword-Liste ausgegeben. Primäre Suchbegriffe werden natürlich in Titel, Intro,
Guide, Anwendung oder FAQ verwendet, wenn sie zum Inhalt passen. Sekundäre
Varianten gehören in hilfreiche sichtbare Inhalte und interne Verlinkungen statt
in Keyword-Stuffing.

## Vom Sync geschriebene Felder

- `leafer.content_db` (json): vollständiger freigegebener Produktdatensatz
- `leafer.faq` (json): sichtbare FAQ-Daten
- `leafer.seo_payload` (json): freigegebenes SEO-Payload
- `leafer.cross_sell_payload` (json): Cross-Selling-Zuordnung
- `leafer.cross_sell_products` (list.product_reference): Zielprodukte

## Vom Theme gelesene Produktfelder

`custom`: `seo_title`, `seo_description`, `faq`, `cross_sell_products`, `use_case`, `light_style`, `lighting_position`, `recommended_room`.
Die folgenden Felder werden im Theme als `.value` verwendet. Die vorhandenen
Shopify-Definitionen sind maßgeblich; neue Definitionen nur mit passendem Typ
und nach Prüfung der vorhandenen Inhalte anlegen.

| Namespace | Keys / typische Verwendung |
| --- | --- |
| `custom` | `seo_title`, `seo_description`, `faq`, `cross_sell_products`, `use_case`, `light_style`, `lighting_position`, `recommended_room` |
| `leafer` | `intro`, `subtitle`, `primary_function`, `suitable_for`, `component_type`, `mix_type`, `ingredients`, `mixing_ratio`, `recipe_matrix`, `recipe_version`, `application_steps`, `additive_application`, `water_behavior`, `planter_type`, `difficulty`, `use_as`, `warning`, `usp_1`–`usp_4`, `recommended_substrates`, `recommended_planters`, `cross_sell_products`, `product_pass_pdf`, `variant_content`, `faq_1`–`faq_4`, `longtail_keywords`, `search_intent` |
| `leaf_configurator` | `enabled`, `role`, `component_profile`, `plant_groups`, `volume_liters` |

`leafer`: `intro`, `subtitle`, `primary_function`, `suitable_for`, `component_type`, `mix_type`, `ingredients`, `mixing_ratio`, `recipe_matrix`, `recipe_version`, `application_steps`, `additive_application`, `water_behavior`, `planter_type`, `difficulty`, `use_as`, `warning`, `usp_1`–`usp_4`, `recommended_substrates`, `recommended_planters`, `cross_sell_products`, `product_pass_pdf`, `variant_content`, `faq_1`–`faq_4`, `keywords`, `longtail_keywords`, `search_intent`.

## Collection-Felder

`leafer.intro`, `leafer.guide`, `leafer.keywords`, `leafer.longtail_keywords`, `leafer.search_intent`, `leafer.faq` sowie die bestehenden Homepage-Felder.
- `leafer.intro`, `leafer.guide`, `leafer.keywords`, `leafer.longtail_keywords`, `leafer.search_intent`, `leafer.faq`
- `custom.seo_title`, `custom.seo_description`
- `custom.homepage_eyebrow`, `custom.homepage_intro`,
  `custom.homepage_badge`, `custom.homepage_cta`

## FAQ-Format

`leafer.faq_1` bis `leafer.faq_4` verwenden `Frage||Antwort`. Nur sichtbare und vollständige Paare werden als FAQPage ausgegeben.

## Qualitätsregel

Longtail-Cluster werden pro Ressource nach tatsächlicher Suchintention gepflegt. Keine globale Wiederholung identischer Keyword-Listen. Primäre Longtails gehören natürlich in Titel/Intro/Guide/FAQ, sofern redaktionell passend; sekundäre Varianten werden über FAQ, Anwendung, interne Links und semantische Felder verteilt. JSON-LD darf keine Aussagen enthalten, die auf der Seite nicht inhaltlich vertreten sind.

## Qualitäts- und UX-Regeln

- Kein versteckter SEO-Text und kein Keyword-Stuffing.
- Strukturierte Daten spiegeln sichtbaren Inhalt.
- Product-Schema bleibt in der bestehenden Commerce-SEO-Schicht; das Theme legt
  kein zweites konkurrierendes Product-Schema darüber.
- Fachliche Tiefe wird progressiv über Intro, Tabs/Details, Anwendung und FAQ
  zugänglich gemacht, statt die Kaufentscheidung oberhalb des Folds zu überladen.
- Mobile Bedienbarkeit, Tastaturfokus, Reduced Motion und ausreichend große
  Interaktionsflächen dürfen bei SEO-Änderungen nicht regressieren.

## Grenzen

Metafeld-Inhalte, Produktbilder, Collection-Zuordnungen, Navigation und Übersetzungen sind keine Git-Dateien. Vollständige Abdeckung erfordert deshalb zusätzlich die Befüllung der entsprechenden Shopify-Metafelder. Das Theme stellt dafür nun einen einheitlichen Resolver und Fallbacks bereit.
