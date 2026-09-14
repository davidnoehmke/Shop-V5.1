# Theme-Deployment

Das kanonische Theme liegt unter `theme/` in
[davidnoehmke/Shop-V5.1](https://github.com/davidnoehmke/Shop-V5.1).
Dieses Repository enthält zusätzlich die Integrations-Dokumentation und
optionale Beispiele; ein normaler Commit veröffentlicht nichts automatisch.

## Sicherer Standard

```bash
git clone https://github.com/davidnoehmke/Shop-V5.1.git
cd Shop-V5.1
shopify theme check --path theme
shopify theme push --unpublished --store="$SHOPIFY_STORE" --path theme
```

Das Live-Theme wird erst nach visueller Prüfung der unveröffentlichten Kopie
und einer expliziten Freigabe angesprochen. Tokens, Shop-Domain und Theme-ID
gehören ausschließlich in Shopify CLI bzw. Secret-Variablen.

## Vor der Veröffentlichung

- Theme Check ausführen und neue Findings prüfen.
- Startseite, Produktseite, Collection, Suche, Warenkorb und 404 mobil testen.
- Konfigurator mit leeren, vollständigen und ungültigen Eingaben testen.
- FAQ-, Produkt- und Breadcrumb-JSON-LD im gerenderten HTML prüfen.
- Metafeld-Inhalte und Cross-Selling in der unveröffentlichten Kopie prüfen.
- Checkout, Rabatt, Kontakt-/Rückruf- und Download-Flows testen.
