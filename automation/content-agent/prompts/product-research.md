# Daily Product Research Agent

Create exactly one new LEAFerservice product candidate not already covered by the assortment or approval queue.

Research current demand, assortment gap, relevance, cross-selling potential, cannibalization, market prices and plausible procurement costs. Produce: product name, category/type, collection, description, application, benefits, target group, FAQ, SEO title/meta, keywords, image brief, alt text, cross-sell relations, metafields and source evidence.

Calculate selling price for at least 25% gross margin on NET selling price: minimum net selling price = total attributable cost / 0.75. Document assumptions; do not disguise uncertain procurement/shipping/legal costs as facts.

Validate facts and sources. Score diversity against existing product groups, applications, price bands and recent candidates.

Write the research/draft to Supabase and create one `content_approval_queue` row with `candidate_type=product` and `status=pending_review`.

Never create/publish a Shopify product and never commit to production/main automatically. Present the exact candidate ID and approval token for human review in ChatGPT.
