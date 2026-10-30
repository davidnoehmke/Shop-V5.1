# Supabase Data-API-Berechtigungen ab 30.10.2026

Stand: 21.10.2026. Geprüfte Ausgangsbasis: `main` bei
`54d78bcc9f753f9bda6cf2ec7491e840bec43e5f` (20 SQL-Migrationen).
Live-Abgleich ausschließlich lesend mit `LEAFerservice-SSOT`
(`vbqimcwaxcydegqlkkgw`, PostgreSQL 17). Keine produktiven DDL/DML,
keine Migration angewendet, keine Readiness-Neuberechnung und kein Reset.

## Ergebnis und konkrete Korrektur

Die Änderung betrifft neue Objekte einschließlich Wiederherstellung/Preview/Reset;
bestehende ACLs bleiben erhalten. Auch `service_role` braucht Objektberechtigungen:
`BYPASSRLS` ersetzt kein `GRANT`. PostgreSQL-Funktionen haben zusätzlich ein
globales `PUBLIC EXECUTE`-Default; ein schemaweites Default-REVOKE allein entfernt
dieses globale Recht nicht. Deshalb werden Funktionen objektbezogen abgesichert.

| Betroffene Ressource | Nachgewiesener Aufrufer und Mindestbedarf | Befund / Korrektur |
| --- | --- | --- |
| `public.content_atoms` | `storefront-assistant` liest veröffentlichte Erklärungen; `leaf-control-api` liest nach Lizenzprüfung. `service_role SELECT`. | RLS und Client-REVOKE vorhanden, Service-GRANT fehlte. Neuer expliziter SELECT-GRANT. |
| `public.content_atom_links` | Lizenzgeschützte Tabellenliste in `leaf-control-api`. `service_role SELECT`. | Gleiche Lücke. Neuer expliziter SELECT-GRANT. |
| `public.evaluate_product_readiness(text)` | Backend-Readiness und `recompute_all_product_readiness()` rufen die INVOKER-Funktion auf. `service_role EXECUTE`, zusätzlich die unten genannten Tabellen-/Helper-Rechte. | Definitionen im Repository ohne eigenes Rechtekonzept. Neuer EXECUTE-GRANT und REVOKE von PUBLIC/anon/authenticated. |
| `public.trg_queue_dirty_metafield()` | Trigger unter der Rolle des Tabellen-Schreibers; liest Registry und ruft ggf. `enqueue_product_sync` auf. | Explizites REVOKE von PUBLIC/anon/authenticated ergänzt. Keine zusätzliche direkte RPC-Freigabe nötig. Trigger-Erstellung bleibt Aufgabe des Migrationseigentümers. |
| Migration `20260926084500_product_control_registry_gated_sync.sql` | Erneutes Einspielen der SQL-Funktionsdefinitionen. | Zwei fehlende Statement-Semikolons nach `$function$` verhinderten syntaktisch einen Replay. Nur diese Terminatoren ergänzt. Bereits angewendete Migrationen werden nicht erneut ausgeführt. |

Die neue Migration verändert ausschließlich ACLs. Sie schreibt keine Geschäftszeilen,
ändert keine Policies, deaktiviert kein RLS, erweitert keine Default-Privilegien und
führt kein SECURITY DEFINER ein. Bereits vorhandene Service-Schreibrechte bleiben
erhalten. Auf einem neuen strikten System erhalten Wissensbausteine nur SELECT:
Ein tatsächlich benötigter externer Authoring-/Metaobject-Worker muss seine
INSERT-/UPDATE-/DELETE-Anforderungen separat belegen; dessen Implementierung liegt
nicht in diesem Repository. Bestehende produktive Writer werden nicht eingeschränkt.

## Vollständiges Inventar der versioniert erzeugten Objekte

Die aufgeführten vorhandenen Rechte werden geprüft und nicht pauschal erweitert.
Alle zwölf erzeugten Tabellen haben RLS. Für Client-Rollen sind sie im Replay
gesperrt. CRUD bedeutet SELECT/INSERT/UPDATE/DELETE, kein TRUNCATE/DDL.

| Tabelle/View | Vorhandener expliziter Service-Vertrag nach Korrektur |
| --- | --- |
| `public.content_approval_queue` | CRUD |
| `public.knowledge_entities` | CRUD |
| `public.knowledge_relations` | CRUD |
| `public.knowledge_qa` | CRUD |
| `public.knowledge_surface_rules` | CRUD |
| `ops.control_commands` | SELECT, INSERT, UPDATE; `USAGE ON SCHEMA ops` explizit |
| `ops.control_audit_log` | SELECT, INSERT; identity-generierte ID, kein zusätzlicher Sequence-GRANT für normalen INSERT nötig |
| `public.content_atoms` | SELECT neu explizit |
| `public.content_atom_links` | SELECT neu explizit |
| `public.public_portfolio_snapshot` | CRUD; trotz Name backend-only |
| `public.shopify_collection_metafield_state` | CRUD |
| `public.storefront_assistant_rate_limits` | CRUD; INSERT/UPDATE beim Zählen, DELETE zur Bereinigung |
| `public.knowledge_dynamic_answers` (View) | SELECT, `security_invoker=true`; darunterliegende Knowledge-Tabellen brauchen ebenfalls SELECT |

| Funktion (mit Signatur) | Vertrag / Besonderheit |
| --- | --- |
| `private.admin_panel_snapshot(text,integer)` | Explizit EXECUTE an anon/authenticated/service_role, Tokenprüfung, bestehendes SECURITY DEFINER und leerer search_path. Nicht erweitert. |
| `public.admin_panel_snapshot(text,integer)` | Gleiche explizite EXECUTE-Rollen, INVOKER-Wrapper. Siehe Einschränkung zum privaten Schema unten. |
| `public.evaluate_product_readiness(text)` | EXECUTE service_role neu explizit; INVOKER bleibt erhalten. |
| `public.trg_queue_dirty_metafield()` | Interner INVOKER-Trigger, kein neuer direkter API-Aufruf. |
| `public.project_storefront_product_content_metafields(text)` | Explizit EXECUTE service_role; CREATE OR REPLACE erhält bestehende ACLs. |
| `public.project_collection_content_metafields(text)` | Explizit EXECUTE service_role. |
| `public.trg_project_storefront_product_content()` | Client-REVOKE vorhanden; vom Eigentümer installierter INVOKER-Trigger. |
| `public.trg_project_collection_content()` | Client-REVOKE vorhanden; vom Eigentümer installierter INVOKER-Trigger. |
| `public.build_ingredient_info(jsonb)` | Explizit EXECUTE service_role, INVOKER, benötigt SELECT auf kanonischem Produktinhalt. |
| `public.consume_storefront_assistant_rate_limit(text,integer,integer)` | Explizit EXECUTE service_role, INVOKER; positiver/negativer Laufzeittest mit echter Zähler-Tabelle. |

Triggeraufrufe brauchen zur Laufzeit kein EXECUTE-Recht des Tabellen-Schreibers auf
die Triggerfunktion. Deren INVOKER-Abhängigkeiten brauchen weiterhin Tabellen- und
Funktionsrechte. Der neue Test führt einen echten INSERT mit dem unveränderten
Triggerkörper bei verweigertem direkten EXECUTE aus (Pfad ohne Queue-Eintrag).

## Nicht versionierte Baseline: verbleibende Wiederherstellungslücke

Die erste Migration referenziert bereits `public.content_articles`; zahlreiche
weitere Basistabellen, Typen, Policies, Funktionen und Schemas werden vorausgesetzt.
Ein vollständiges leeres Supabase-Projekt kann daher mit diesen Migrationen allein
nicht aufgebaut werden. Folgende Mindestanforderungen sind aus dem Code belegbar,
ihre CREATE-/GRANT-Historie aber nicht vollständig im Repository enthalten:

| Pfad / Ressourcen | Erforderlicher Mindestzugriff für den gezeigten Code |
| --- | --- |
| `configurator-project` → `public.configurator_projects` | service_role SELECT, INSERT, UPDATE (Upsert mit Rückgabe). Kein anon/authenticated-Tabellenzugriff nötig; kein DELETE im gezeigten Handler. |
| `leaf-control-api` → dessen `allowedTables` und `public.control_licenses` | service_role SELECT auf erlaubten Tabellen; SELECT/UPDATE auf Lizenzen. Kein pauschaler Client-GRANT aus dieser internen Allowlist ableiten. |
| Assistent → `storefront_product_content`, `shopify_resource_snapshots`, `shopify_metafield_registry`, `shopify_metafield_state`, `knowledge_qa`, `content_articles`, `content_atoms`, `collection_content`, `information_blocks` | service_role SELECT; Secrets über EXECUTE `leaf_read_server_secret(text)` und Zähler über die ausdrücklich erlaubte Rate-Limit-RPC. Keine direkten Client-GRANTs nötig. |
| Produktprojektion → `storefront_product_content`, `shopify_metafield_registry`, `shopify_metafield_state`, `product_sync_queue` | service_role SELECT auf Quellen/Registry; SELECT, INSERT, UPDATE auf Metafield-State; SELECT, UPDATE auf Queue für die neueste Projektionsfunktion. Der Trigger benötigt zusätzlich EXECUTE `enqueue_product_sync(text,text,jsonb,integer,text)`. |
| Collection-Projektion → `collection_content`, Registry, `shopify_collection_metafield_state` | service_role SELECT auf Quellen/Registry; SELECT, INSERT, UPDATE auf Ziel-State. |
| Readiness → `shopify.products`, `shopify.variants`, `product_observations`, `shopify_metafield_registry`, `shopify_metafield_state`, `storefront_product_content`, `product_readiness` | service_role SELECT auf den gelesenen Objekten, SELECT/INSERT/UPDATE auf Readiness; `USAGE ON SCHEMA shopify`. EXECUTE auf `resolve_product_profile(text)`, `seed_required_metafield_state(text)`; deren interne Rechte separat erhalten. |
| Vollständige Readiness-Neuberechnung | EXECUTE `recompute_all_product_readiness()` plus obige Rechte. Definition ist nur live vorhanden. Nicht während dieses Audits aufgerufen. |
| Konfigurator-Katalog: `configurator_components`, `configurator_profiles` | Live gibt es anon/authenticated SELECT mit RLS `enabled=true` bzw. `active=true`. Kein direkter Data-API-Aufrufer im aktuellen Storefront-Code gefunden; Rechte/Policies unverändert lassen und externe Konsumenten vor einem Baseline-Import prüfen. |
| Öffentliche Produkt-/SEO-Projektionen | Live existieren SELECT-Policies auf `storefront_product_content` und `storefront_seo_pages`. Deren Reichweite wird hier nicht verändert oder als sicherer Veröffentlichungsfilter bestätigt. |

Der Live-Katalog bestätigt Service-SELECT/INSERT/UPDATE für die gezielt geprüften
Produkt-, Metafield-, Queue-, Readiness- und Konfigurator-Tabellen sowie EXECUTE auf
die genannten Readiness-/Queue-/Secret-Helper. Das ist kein Nachweis eines
vollständigen Restore-Vertrags oder externer Worker-Laufzeit.

Weitere bewusste Grenzen:

- `USAGE` auf `public` ist eine Supabase-Baseline-Voraussetzung. Das Repository
  stellt diese Schema-Rechte nicht vollständig selbst her.
- Live ist `private` nur postgres/service_role zugänglich. Die expliziten
  anon/authenticated-EXECUTE-GRANTs auf `admin_panel_snapshot` allein beweisen deshalb
  keine funktionierende Wrapper-Kette. Kein pauschales `USAGE private` ergänzen:
  zuerst tatsächlichen Admin-Client und Token-/Funktionsmodell separat prüfen.
- Mehrere ausschließlich live definierte INVOKER-Helper besitzen noch globales
  PUBLIC EXECUTE (u.a. enqueue/resolve/seed/recompute). Das ist kein Grund, ihre
  Basistabellen öffentlich freizugeben. Eine isolierte Bereinigung braucht den
  vollständigen Aufrufervertrag; sie ist nicht Teil dieses minimalen Patches.
- Kein relevanter Readiness-/Sync-/content_atom-Cron-Job wurde im gelesenen
  `cron.job`-Katalog gefunden. Externe Worker bleiben damit nicht ausgeschlossen.
- Security Advisor meldete nur den zusammengefassten INFO-Typ
  `rls_enabled_no_policy` (44 Tabellen). Bei Backend-Tabellen ist das erwartbare
  Default-Deny für Clients; keine `USING (true)`-Policies als vermeintliche Reparatur.
  [Supabase-Erläuterung](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Regression und Freigabe

`npm ci --prefix automation/db-permissions --ignore-scripts --no-audit --no-fund`
und `npm test --prefix automation/db-permissions` verwenden einen gelockten,
testinternen PGlite-PostgreSQL-Laufzeitkern, keine Netzwerkdatenbank oder Secrets.
Die neue CI führt dieselben Tests bei relevanten Pull Requests aus.

Sechs Tests prüfen das Ressourceninventar, den SQL-Splitter, den reproduzierbaren
Fehler vor der Korrektur, alle versionierten ACLs/RLS unter strikten Defaults,
INVOKER/DEFINER-Eigenschaften, echte Service-Lesezugriffe/Rate-Limits/Identity-INSERT,
verweigerte Client-Zugriffe, interne Triggerausführung sowie idempotente Korrektur
ohne Daten-/Policy-Änderungen und mit erhaltenen Legacy-Service-Schreibrechten.
Zusätzlich bestanden die 21 vorhandenen Catalog-Sync-Vertragstests.

Der Test spielt gezielt Objekt-/Berechtigungs-DDL ein, mit kleinen ausdrücklich
unvollständigen Baseline-Fixtures und `check_function_bodies=off`. Geschäfts-DML,
Seeds, Vollprojektionen und Readiness-Funktionskörper werden nicht ausgeführt.
Das ist keine vollständige Migrations-/PostgREST-/GraphQL-/Worker-End-to-End-Prüfung.
Vor einem produktiven Rollout: vollständige Baseline auf isolierter Preview
bereitstellen, Berechtigungen lesen, reale Backend-Verträge testen und alle
relevanten PR-Gates prüfen. Kein automatischer Merge/Produktiv-DB-Push durch dieses Audit.

Bereits auf dem geprüften main fehlgeschlagen: Pipeline unit tests wegen
`SyntaxError: Unexpected token '}'` in `automation/codex/live-links.cjs:72`.
[Fehlerlauf](https://github.com/davidnoehmke/Shop-V5.1/actions/runs/39563088182/job/119098731794).
Der Datenbank-Patch schwächt dieses Gate nicht ab und repariert keine fremde
Storefront-Linklogik. Unabhängiger Controller-Postcheck: Patch, Baseline-Lücken und
CI am exakten PR-Head prüfen; bei roten relevanten Gates nicht mergen.

## Primärquellen

- [Supabase-Änderungsankündigung](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Grants, RLS und Default-Privilegien](https://supabase.com/docs/guides/api/securing-your-api)
- [PostgreSQL CREATE TRIGGER und EXECUTE](https://www.postgresql.org/docs/17/sql-createtrigger.html)
- [PostgreSQL CREATE OR REPLACE FUNCTION und erhaltene Rechte](https://www.postgresql.org/docs/17/sql-createfunction.html)
