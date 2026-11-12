# Headless storefront design contract

The user approved this palette on 2026-10-30. It is binding across the complete
LEAFerservice headless storefront, both DE and EN: navigation, homepage, all brand
and topic worlds, product and collection pages, blog, service/legal pages, search,
account, cart, configurator and LEAF assistant.

Name: **Botanical Minimalism – Warm Sage & Cream**.

| Color | Exact value | Token | Role |
| --- | --- | --- | --- |
| Cremeweiß | #F5F0E6 | --leaf-cream | Page surfaces, text on dark olive |
| Sandbeige | #DDD1BE | --leaf-sand | Warm accent surfaces, light details on olive |
| Salbeigrün | #A3AD95 | --leaf-sage | Decorative accents, mixed light surfaces |
| Eukalyptusgrün | #788C7B | --leaf-eucalyptus | Control borders, decorative accents |
| Dunkles Olivgrün | #454D3D | --leaf-olive | Body text, links, primary buttons, dark sections |
| Warmes Taupe | #A89B8B | --leaf-taupe | Decorative accents and mixed light surfaces |

## Implementation rules

- `app/styles/palette.css` is the only source of literal UI color values.
  Use its tokens in CSS, including brand colors; no independent brand palettes,
  named colors, hard-coded hex/RGB/HSL colors or inline UI color literals.
- Use transparent or cream mixes of these six colors for gradients, shadows,
  borders and softer surfaces. Derived colors are not new palette entries.
- Ordinary text: olive on cream/sand or mixed light surfaces, cream on olive.
  Olive/cream contrast is approximately 7.76:1; olive/sand is 5.85:1.
  Sage, eucalyptus and taupe are not small-text foreground/background pairs.
- The global focus treatment uses an olive outline and a cream separation ring.
  Errors must also have text, an icon or a shape; never communicate only by color.
- Adjacent section gradients share their endpoint tokens. Preserve gentle
  scroll reveals, native anchor scrolling and reduced-motion support.
- Product photographs, logos and authored article media retain their actual
  colors; do not recolor them. The external Shopify checkout is outside this
  headless UI contract.
- Preserve the existing Helvetica typography. This palette approval does not
  authorize replacing it with the serif suggestion visible in the reference.
- `tests/palette.test.mjs` guards the exact values, global loading, contrast
  combinations and CSS token usage in the existing CI test command.

## Release verification

Check DE/EN, each page family, overlays, focus, form states, cart, 375px and
desktop, zoom, reduced motion and section seams on the deployed preview.
Do not mark the change live until CI and production read-back pass.
