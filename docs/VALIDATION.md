# Offline validation

## Result

The latest local Theme Check run completed against `theme/` without a Liquid
syntax error after fixing the FAQ JSON-LD loop in
`theme/snippets/product-faq-structured-data.liquid` and the import-time
compatibility findings in the generated SEO/PageFly code.

The current master contains 38 warnings and 0 errors. The remaining warnings
are inherited from the working theme and generated compatibility code; they are
recorded here rather than silently changing behavior during the repository
split.

| Check | Count | Interpretation |
|---|---:|---|
| `DeprecatedTag` | 1 | Legacy `include` usage in the layout |
| `RemoteAsset` | 1 | PageFly remote asset reference |
| `VariableName` | 11 | Naming style findings in SEO/PageFly compatibility code |
| `HardcodedRoutes` | 4 | Collection links that can be migrated to Shopify `routes` objects |
| `UnclosedHTMLElement` | 8 | Conditional group markup in `sections/substrate-world.liquid`; verify visually before changing |
| `DeprecatedFilter` | 5 | Legacy PageFly/SEO compatibility filters |
| `UndefinedObject` | 8 | Snippet context variables such as `section`; valid when rendered from the intended section context |

The Apps Script, manifest, JSON configuration, and standalone JavaScript
experiment pass local syntax/JSON checks. No credentials are stored in the
repository.

## Recommended next pass

1. Replace hardcoded collection paths with `routes.*` values.
2. Review the conditional markup in `substrate-world.liquid` in Shopify's
   preview before restructuring it.
3. Migrate legacy `include`/`img_url` usages where PageFly compatibility is no
   longer required.
