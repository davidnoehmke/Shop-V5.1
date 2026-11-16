# LEAFerservice.com — konfigurierbare Lösungen als Shop-Grundprinzip

Status: verbindliches Produkt- und UX-Konzept, **kein Beleg einer Live-Implementierung**.
Beschlossen: 11. Oktober 2026. Markenname ausschließlich **LEAFerservice**.

## Leitidee

Der Kunde beginnt mit seiner Pflanze, seinem Problem oder seinem Raum — nicht mit einem Hersteller. Er bekommt einen verständlichen, **individuell konfigurierbaren** Lösungsweg statt eines starren Bundles. Konfiguration, Komponenten, Mengen, Preise und Erklärungen sind nachvollziehbar; der Kunde behält jederzeit die Kontrolle. Marken fungieren als Herstellerangaben/Filter, nicht als primäre Lösungskategorien.

### Zwei Aushängeschilder mit gleichwertiger Sichtbarkeit

1. **Substrat-Konfigurator** (bestehender Shop-Funktionsbereich): Pflanze und Wachstumssituation -> geeignete Mischung -> bis zu fünf passende Komponenten, in Prozent konsistent (Summe exakt 100 %), Topfvolumen und Materialmengen -> konfigurierbarer Warenkorb. Existierenden Code, JSON und Bestellablauf erhalten, nicht durch eine ungetestete Neuentwicklung ersetzen.
2. **Raum-LED-Planer** (zukünftiger Funktionsbereich, **noch nicht live**): Raum und konkrete Pflanzpositionen -> belastbare Lichtanforderung -> Lampenpositionen, Befestigung, Stückzahl, Steuerung, Stromkostenschätzung -> individueller Warenkorb. Bis die Lösung validiert ist, **keinen funktionsfähigen CTA vortäuschen**; nur ehrliche Vorschau/Ankündigung.

### Weitere nach Nutzen konfigurierbare Lösungen

- Bewässern: Einzelpflanze, Urlaub, große Kübel, mehrere Pflanzen, Reservoire und Zubehör
- Umtopfen und Gefäße: Topfgröße, System, Drainage, Substrat und passendes Zubehör
- Anzucht und Vermehrung: Steckling oder Saatgut, Substrat, Keimhilfen, Feuchtigkeit und Licht
- Pflanzenstandorte / Interieur: Pflanze, Standort, Gefäß, Halterung, Beleuchtung

Diese Module folgen **demselben Projektvertrag**, dürfen aber eigene spezialisierte Bedienoberflächen besitzen. Es soll keine separate Produkt-Datenbank pro Modul geben.

## Kern des gemeinsamen Projektvertrags

Persistierbare, versionierbare und plattformneutrale Struktur mit:
- project ID, mode, schema_version, locale, anonymized owner/session, created/updated timestamps
- problem/goal, plant_profile, plant_stage, plant_count, project_environment, optional room_geometry
- input values and physical units (L, cm, m, W, µmol m-2 s-1, h/day), explicit assumptions and uncertainty
- constraints (budget, space, available supplies, safety), manual adjustments
- recommendations with exact Shopify product GIDs + variant GIDs, quantities, unit prices from current Shopify readback, role and evidence provenance
- explanation of *why*, incompatibilities, missing verified technical data and safe alternative routes
- snapshot version / expected version, user approval, cart reference, status and immutable derivation hash
- no personal room photos stored or sent without explicit consent and proper access controls

Supabase SSOT stores verified profiles, recipes, LED technical data, product compatibility, solution roles and saved projects. GitHub owns implementation/tests, Shopify owns live product/media presentation and commerce, ChatGPT may assist via authorized connectors. Reuse current public.configurator_profiles / public.configurator_components / public.configurator_projects where compatible; do not silently break them.

## Substrat-Konfigurator acceptance contract

- Plant type/condition, container size, watering behavior, setup and target properties are inputs.
- Sliders/percentages sum to exactly **100 %**, showing derived amounts in liters, component limits and warnings.
- Defaults reflect tested product recipes and existing availability; switching plant or container adjusts the result predictably.
- User can revise before adding anything; no accidental forced extras, automatic stock assertions or price promises based on stale snapshots.
- Real Shopify variant/price/current-availability are fetched at the cart edge; errors are understandable.
- Keep fast, native, accessible browser-local UI. Never send a network request on every slider movement.

## Raum-LED-Planer acceptance contract (future)

- Inputs: room length/width/height, plant placements and canopy dimensions, existing daylight conditions and window orientation, mounting distances, plant groups/stages, desired photoperiod, budget and energy price.
- Technical facts: manufacturer-verified power, PPF and distance-specific PPFD maps, beam/coverage data, spectrum, dimmer/driver, mounting/suspension, safety/energy and EU compliance. Read these from registry's \`lighting.*\` fields. If valid PPFD/coverage data are missing, show **"Berechnung nicht belastbar"** and ask for measurement, never fabricate a precise footprint or efficacy claim.
- Output: transparent **plan proposal**, coverage/placement visualization, warning for shaded or unmeasured locations, selectable compatible models and accessories, energy cost estimate using declared wattage and customer tariff, coherent quantities and customer-confirmed cart.
- Do not promise accurate plant light supply based on watts alone or ignore real daylight, canopy distance, heat, electrical load and safe installation.
- Mobile-first project input with step-by-step advanced mode, accessible labels and clear uncertainty.

## Unified shop UX

1. First screen: "Was möchtest du für deine Pflanzen erreichen?" with two prominent hero entrypoints: **Substrat konfigurieren** (working) and **Raumbeleuchtung planen** (coming when ready).
2. Secondary solution cards for watering, seedlings, pots, supporting/arranging plants.
3. One shared project context / advisor; specialized configurators are advanced tools, not disconnected mini shops.
4. Each result: "Das passt zu deinem Vorhaben", why, adjustable quantities/optional extras, component and price transparency, save/share-resume where allowed, add selected items to Shopify cart.
5. Display brand in product identity and filters, not top-level need-first menu. A product can be linked to multiple valid solution uses without duplication.

## Product data contract & sync

- Existing \`leaf_configurator.*\`, \`lighting.*\`, \`leafer.solution_links\`, \`bundle.*\` registered fields feed reusable rules and product-role linking. Use proven customer-relevant facts only; no invented data, no automatic cross-sell for incompatible items.
- Shopify image modifications -> verified Shopify live readback -> Supabase references. GitHub HTML and UX -> reviewed CI/PR -> canonical Supabase projections -> approved Shopify changes.
- ChatGPT and Supabase may edit the same entity through the shared audited, version-protected service; no 4-way conflicting data writes.
- Supplier licenses, status/price protection, manufacturer sales rights, unapproved Soltech listings and catalog holds remain enforced. No change to product publication or prices as part of this design.
- All recommendation logic excludes unpublished/unauthorized/unavailable items from public actionable cart paths.

## Rollout without modifying the live storefront prematurely

1. Document solution taxonomy and role mappings; audit existing substrate configurator, metatypes and present product catalog.
2. Stabilize its behavior, mobile UI, calculations and cart/pricing readback. Add clear homepage flagship navigation only after tests.
3. Create isolated LED planner prototype with a small set of **verified** lamps/specs, offline scenario tests, and safe error states.
4. Integrate reusable project contract, saved projects, cart adapter and versioned Supabase flows.
5. Enable the LED planner publicly only after mobile/desktop UX, accessibility, safety, calculation, product matching, performance and CI pass.
6. Incrementally add watering, repotting, seedlings and living-space project modes. No forced new collections or speculative bundles.

## Verification and constraints

- Preserve all existing code and theme behavior unless reviewed in a dedicated PR.
- Draft UX and strategy do not constitute implementation, readiness, or deployment.
- Do not add a published LED planner link until the feature is tested.
- Keep a single neutral public project-data schema, reuse the existing LEAF advisor shell and keep expensive work away from high-frequency slider events.
