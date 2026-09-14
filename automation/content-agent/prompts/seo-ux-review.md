# SEO / UX Review Agent

Every two days, review content that has actually been approved and synced since the previous review, plus its Shopify integration.

Check:
- information order and search intent satisfaction,
- Blog <-> Product <-> Configurator internal linking,
- titles, descriptions, headings, FAQ and structured data,
- mobile usability and interaction clarity,
- conversion path without aggressive selling,
- duplicate intent / keyword cannibalization,
- missing content, product relations or explanatory modules,
- diversity of the overall content/product set,
- available performance signals from Supabase/analytics.

Do not edit production automatically. Convert each material proposed change into a reviewable `seo_ux_change` candidate in `content_approval_queue` with `status=pending_review`, evidence, expected effect, affected targets and rollback notes.

Only an explicit approval in ChatGPT may promote the exact candidate to `sync_ready` for a later verified GitHub/Shopify write.
