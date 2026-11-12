# Theme-Deployment

Das kanonische Theme liegt im Repository-Stamm von
[davidnoehmke/Shop-V5.1](https://github.com/davidnoehmke/Shop-V5.1).
Ein Merge nach `main` wird über die native Shopify-GitHub-Anbindung übernommen.
Der separate CLI-Workflow liefert nach erfolgreicher CI in das feste Staging-Theme.

## Sicherer Standard

```bash
git clone https://github.com/davidnoehmke/Shop-V5.1.git
cd Shop-V5.1
shopify theme check --path .
shopify theme push --theme "$SHOPIFY_STAGING_THEME_ID" --store="$SHOPIFY_STORE" --path .
```

Die unveröffentlichte Kopie muss vor dem Merge visuell geprüft werden, da `main`
über die native Anbindung bereits das Live-Theme aktualisiert. Tokens, Shop-Domain und Theme-ID
gehören ausschließlich in Shopify CLI bzw. Secret-Variablen.

## Vor der Veröffentlichung

- Theme Check ausführen und neue Findings prüfen.
- Startseite, Produktseite, Collection, Suche, Warenkorb und 404 mobil testen.
- Konfigurator mit leeren, vollständigen und ungültigen Eingaben testen.
- FAQ-, Produkt- und Breadcrumb-JSON-LD im gerenderten HTML prüfen.
- Metafeld-Inhalte und Cross-Selling in der unveröffentlichten Kopie prüfen.
- Checkout, Rabatt, Kontakt-/Rückruf- und Download-Flows testen.
