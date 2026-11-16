# LEAFerservice Hydrogen pilot

Canonical implementation: `davidnoehmke/Shop-V5.1/headless`.

See `../docs/HEADLESS_VENSO_PILOT.md` for provenance, architecture, preview
configuration and verification. This pilot does not replace the live theme.

```sh
npm ci
npm run codegen
npm run typecheck
npm run lint
npm test
npm run build
npm run check:build
```

Open `/marken/venso` in a configured Hydrogen/Oxygen preview. Product, variant,
price and cart data come from the real Shopify Storefront API projection.
