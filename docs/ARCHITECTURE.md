# LEAFerservice development architecture

```text
Shop-V5.1/theme/
        │
        ├── storefront UX, SEO, structured data, configurators
        │
Shopify runtime data
        │
        ├── products, variants, collections, metafields and theme settings
        │
Google Sheets approval layer
        │
        ├── dry-run, ID matching, controlled update-only sync
        │
Notion content database
        │
        └── editorial knowledge, FAQ, recipes, SEO and cross-selling
```

## Boundaries

- Theme code must remain deployable as a Shopify Online Store 2.0 theme and is
  maintained under `theme/`.
- Automation code must not embed credentials.
- Data mutations require explicit approval and a preceding dry-run.
- Theme settings and product metafields remain the runtime configuration layer;
  repository files are the versioned implementation layer. Automation and
  documentation remain outside `theme/`.
