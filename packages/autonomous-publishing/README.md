# @mailmypdf/autonomous-publishing

Studio's reusable autonomous publication engine.

## Pipeline

`discover -> deduplicate -> score -> enrich -> evidence -> plan -> verify -> render -> approval -> publish -> analytics`

Publishing defaults to an explicit human approval gate. A publication must opt into automatic publishing in its manifest.

## Runnable MVP

The package can now run an end-to-end preview with only:

- Node 20+
- the monorepo dependencies installed
- `ANTHROPIC_API_KEY` set server-side
- one or more RSS/Atom sources in the publication manifest

From the repository root:

```bash
export ANTHROPIC_API_KEY="..."
pnpm --filter @mailmypdf/autonomous-publishing preview Projects/Publications/ai-industry-daily/publication.config.ts
```

The preview remains behind the approval gate and writes artifacts to:

`Projects/Publications/<publication-id>/editions/<edition-id>/`

Each preview contains:

- `edition.md`
- `edition.html`
- `edition.json` with evidence-linked planned stories and verification results
- `run.json`

## Implemented adapters

- RSS/Atom discovery with bounded network reads
- Claude story scoring
- Claude evidence extraction
- Claude issue planning/drafting
- Claude fact-checking against the evidence packet
- safe HTML preview rendering
- webhook publisher
- no-op preview publisher/analytics
- Horizon service discovery boundary
- Crawl4AI extraction service boundary
- PostgreSQL + pgvector story-memory adapter
- in-memory publication run store

## Existing components, not reinventions

The package is deliberately an orchestration/contracts layer:

- **Claude**: reuses `@mailmypdf/ai` and the existing hardened Anthropic provider. Secrets remain server-side via `ANTHROPIC_API_KEY`.
- **Horizon (MIT)**: preferred production discovery, cross-source aggregation, enrichment and news summarization engine.
- **Crawl4AI (Apache-2.0)**: article extraction when source feeds are incomplete.
- **RSSHub (AGPL)**: independently deployed feed adapter service; do not vendor into this package.
- **PostgreSQL + pgvector**: persistent story memory / semantic repeat detection.
- **FastEmbed (Apache-2.0)**: optional local embeddings.
- **React Email (MIT)**: target production email renderer.
- **listmonk (AGPL)**: independently deployed subscriber/campaign service.
- **Umami (MIT)**: publication analytics.
- **Postiz (AGPL)**: optional independently deployed social publisher.

## Security and provenance

Every factual story is represented by an `EvidencePacket`. Claims must cite known source IDs before the pipeline advances. Provider keys are represented by environment-variable names only; public-prefixed secret variables are rejected.

The default runtime deliberately does not automatically publish. It creates a verified preview and returns `awaiting_approval`. Production delivery should replace the no-op publisher with a configured webhook/listmonk/other publisher only after approval.

## Studio integration

Publication instances live under `Projects/Publications/<publication-id>/publication.config.ts`. The first runnable example is `ai-industry-daily`.

The package exposes adapters so Studio can swap or upgrade external components without moving their source code into the MailMyPDF monorepo or coupling AGPL service code to the reusable package.

## Production next steps

1. Deploy Horizon as the preferred discovery service and point `createHorizonDiscoveryAdapter` at the Studio-owned service endpoint.
2. Deploy Crawl4AI separately for full-article extraction.
3. Run `STORY_MEMORY_SCHEMA_SQL` against Postgres with pgvector enabled and provide a SQL client to `createPgVectorStoryMemory`.
4. Replace preview rendering with React Email templates.
5. Connect listmonk/Resend-compatible delivery through the publisher boundary.
6. Connect Umami and email engagement events through the analytics boundary.
7. Put the pipeline behind Trigger.dev for schedules, retries, durable execution and approval/resume.


## Studio admin workspace

The MailMyPDF app now exposes the publication engine under:

`/admin/publications`

The route is inside the existing authenticated workspace and every publication server action independently verifies the current user has the `admin` role.

The Studio surface supports:

1. inspect publication manifests and source configuration;
2. see which production integrations are configured without exposing secret values;
3. run a preview through the real discovery → Claude → evidence → verification pipeline;
4. persist the exact rendered edition and run state;
5. review the stored HTML in a sandboxed iframe plus verification issues and story/evidence counts;
6. approve and publish the exact stored artifact.

Approval does **not** rerun discovery, research, or drafting. The database approval claim is compare-and-set against `awaiting_approval` and a null reviewer, which prevents a second reviewer or duplicate click from claiming the same run.

## Database

Apply:

`apps/mailmypdf/supabase/migrations/20260916193000_autonomous_publications.sql`

This creates:

- `publication_runs`: durable run state, rendered approval artifacts, reviewer metadata, and delivery metadata;
- `publication_story_memory`: per-publication historical story memory with a reserved 384-dimensional pgvector embedding column and HNSW index.

Both tables have RLS enabled and intentionally expose no browser policies. Studio accesses them through the server-side Supabase admin client.

## Production delivery

The example publication now defaults to **Resend Broadcasts**. listmonk remains available as the self-hosted alternative.

Required for Resend delivery:

- `RESEND_API_KEY`
- `RESEND_SEGMENT_ID`
- `RESEND_FROM` or the existing `RESEND_FROM_ADDRESS`

Broadcast HTML automatically receives Resend's unsubscribe variable when the template does not already contain one.

## Graceful degradation

A production publication does not have to wait for every auxiliary service:

- no Horizon endpoint → RSS/Atom discovery remains available;
- no Crawl4AI endpoint → feed summary evidence is used conservatively;
- no Umami → publishing still works without analytics;
- no Trigger.dev → an admin can run and approve previews manually in Studio.

Delivery is never silently simulated after approval. A real enabled publisher must be configured for production use.
