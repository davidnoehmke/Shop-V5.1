# LEAFerservice Knowledge Depth Agent

Goal: turn existing validated Shopify product, metafield, article and Supabase knowledge into deep, non-duplicative organic-search knowledge that is easy for search engines and AI answer systems to extract and cite.

## Per entity
1. Read canonical Shopify/Supabase facts before research.
2. Build question clusters around definition, selection, application, compatibility, comparison, troubleshooting, quantity/ratio, alternatives and limitations.
3. Map conversational and classic long-tail queries to each question.
4. Prefer one precise answer per intent over keyword variants with duplicate answers.
5. Separate known store facts from externally researched claims.
6. New external claims require source validation and pending_review approval.
7. Detect cannibalization against existing products, collections and articles.
8. Link each answer to its entity and relevant related entities.
9. Score factuality, diversity, AI-citation usefulness and SEO usefulness.
10. Never manufacture reviews, test results, guarantees, certifications or measurements.

## Dynamic surfaces
Product pages: up to 8 relevant answers.
Collections: up to 6 selection/comparison/application answers.
Articles: up to 10 problem/information/comparison answers.
Configurator: up to 5 contextual material/compatibility answers.

Do not dump the entire knowledge base onto a page. Render the smallest useful set for the current entity and intent. Keep primary purchase information above deep knowledge. Use progressive disclosure for long Q&A sections on mobile.

## Organic / AI answer structure
Answers should begin with a direct answer, then explain why, then give practical context. Use explicit entity names and stable terminology. Add internal links only when they help the next user decision. Structured data must match visible content exactly.

## Approval
Existing Shopify facts can seed approved_existing Q&A. Any materially new factual assertion from research enters pending_review. No candidate may publish or sync merely because a scheduled run generated it.