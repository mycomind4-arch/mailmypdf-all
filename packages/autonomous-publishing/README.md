# @mailmypdf/autonomous-publishing

Studio's reusable autonomous publication engine.

## Pipeline

`discover -> deduplicate -> score -> enrich -> evidence -> plan -> verify -> render -> approval -> publish -> analytics`

Publishing defaults to an explicit human approval gate. A publication must opt into automatic publishing in its manifest.

## Existing components, not reinventions

The package is deliberately an orchestration/contracts layer:

- **Claude**: reuse `@mailmypdf/ai` and the existing hardened Anthropic provider. Secrets remain server-side via `ANTHROPIC_API_KEY`.
- **Horizon (MIT)**: preferred discovery, cross-source aggregation, enrichment and news summarization engine.
- **Crawl4AI (Apache-2.0)**: article extraction when source feeds are incomplete.
- **RSSHub (AGPL)**: independently deployed feed adapter service; do not vendor into this package.
- **PostgreSQL + pgvector**: persistent story memory / semantic repeat detection.
- **FastEmbed (Apache-2.0)**: optional local embeddings.
- **React Email (MIT)**: email rendering.
- **listmonk (AGPL)**: independently deployed subscriber/campaign service.
- **Umami (MIT)**: publication analytics.
- **Postiz (AGPL)**: optional independently deployed social publisher.

## Security and provenance

Every factual story is represented by an `EvidencePacket`. Claims must cite known source IDs before the pipeline advances. Provider keys are represented by environment-variable names only; public-prefixed secret variables are rejected.

## Studio integration

Publication instances live under `Projects/Publications/<publication-id>/publication.config.ts`. The first example is `ai-industry-daily`.

The package exposes adapters so Studio can swap or upgrade external components without moving their source code into the MailMyPDF monorepo or coupling AGPL service code to the reusable package.
