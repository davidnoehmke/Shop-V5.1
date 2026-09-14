# LEAFerservice Metafeld-Vertrag

Das Theme liest redaktionelle und konfigurationsbezogene Inhalte aus Shopify-
Metafeldern. Der Apps-Script-Sync schreibt nur die ausdrücklich dokumentierten
Update-only-Felder. Die tatsächlichen Definitionen im Shopify-Admin bleiben die
Runtime-Konfiguration und müssen vor einem Live-Lauf geprüft werden.

## Vom Sync geschriebene Felder

| Owner | Namespace / Key | Typ im Sync | Zweck |
| --- | --- | --- | --- |
| Produkt | `leafer.content_db` | `json` | vollständiger freigegebener Produktdatensatz |
| Produkt | `leafer.faq` | `json` | sichtbare, freigegebene FAQ-Zeilen |
| Produkt | `leafer.seo_payload` | `json` | freigegebenes SEO-Payload |
| Produkt | `leafer.cross_sell_payload` | `json` | redaktionelle Cross-Selling-Zuordnung |
| Produkt | `leafer.cross_sell_products` | `list.product_reference` | eindeutige referenzierte Zielprodukte |
| Shop | `leafer.problems` | `json` | globale Problemlösungsdaten |
| Shop | `leafer.solutions` | `json` | globale Lösungsdaten |
| Shop | `leafer.images` | `json` | globale Bild-/Assetdaten |
| Shop | `leafer.blogs` | `json` | globale Blogdaten |
| Shop | `leafer.plants` | `json` | globale Pflanzendaten |

Der Rücksync Shopify → Notion schreibt Commerce-Felder in bestehende Notion-
Datensätze oder legt bei fehlender Shopify-GID einen neuen Datensatz an. Er
überschreibt keine redaktionellen HTML-, FAQ-, Rezeptur-, SEO- oder
Kalkulationsfelder.

## Vom Theme gelesene Produktfelder

Die folgenden Felder werden im Theme als `.value` verwendet. Die vorhandenen
Shopify-Definitionen sind maßgeblich; neue Definitionen nur mit passendem Typ
und nach Prüfung der vorhandenen Inhalte anlegen.

| Namespace | Keys / typische Verwendung |
| --- | --- |
| `custom` | `seo_title`, `seo_description`, `faq`, `cross_sell_products`, `use_case`, `light_style`, `lighting_position`, `recommended_room` |
| `leafer` | `intro`, `subtitle`, `primary_function`, `suitable_for`, `component_type`, `mix_type`, `ingredients`, `mixing_ratio`, `recipe_matrix`, `recipe_version`, `application_steps`, `additive_application`, `water_behavior`, `planter_type`, `difficulty`, `use_as`, `warning`, `usp_1`–`usp_4`, `recommended_substrates`, `recommended_planters`, `cross_sell_products`, `product_pass_pdf`, `variant_content`, `faq_1`–`faq_4` |
| `leaf_configurator` | `enabled`, `role`, `component_profile`, `plant_groups`, `volume_liters` |

## Vom Theme gelesene Collection-Felder

Für Collection-Guides und die Startseiten-Journey werden unter anderem folgende
`leafer`-/`custom`-Felder genutzt:

- `leafer.intro`, `leafer.guide`, `leafer.keywords`, `leafer.faq`
- `custom.homepage_eyebrow`, `custom.homepage_intro`,
  `custom.homepage_badge`, `custom.homepage_cta`

## FAQ-Format

Die produktbezogene FAQ-JSON-LD-Ausgabe erwartet in `leafer.faq_1` bis
`leafer.faq_4` jeweils den Text im Format:

```text
Frage||Antwort
```

Nur sichtbare und inhaltlich vollständige Fragen verwenden. Die Ausgabe wird
unterdrückt, wenn kein vollständiges Paar vorhanden ist.

## Grenzen

Metafeld-Inhalte, Produktbilder, Collection-Zuordnungen, Navigation und
Übersetzungen sind keine Git-Dateien. Sie werden in Shopify gepflegt und können
über den kontrollierten Sync bzw. separate Exporte nachvollziehbar gemacht
werden. Der Sync legt absichtlich keine neuen Shopify-Produkte an und ändert
weder Veröffentlichung noch Bestand.
