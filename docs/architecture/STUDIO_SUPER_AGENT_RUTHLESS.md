# Studio Super Agent — Ruthless Investigator Integration

Studio now has one administrator-only Super Agent workspace:

- **Investigate**: delegates directly to the existing Ruthless Investigator Director and its research council.
- **Develop**: uses existing `@mailmypdf/dev-agent-swarm` local, isolated Claude/Codex chat sessions and reviewer/tester/SEO gates.
- **Engine Workbench**: the existing shared capability catalog, linked from Super Agent.

This is *not* a fork of the investigator engine. The investigator owns research cycles,
competing hypotheses, provenance/source lineage, evidence, model routing,
budget enforcement, observations, adversarial review, and resumable state.

## Setup

1. Run `mycomind4-arch/ruthlessinvestigator`'s investigation API (default local port 3001).
2. Configure the MailMyPDF server:
   - `STUDIO_RUTHLESS_API_URL=http://127.0.0.1:3001` for **local same-machine use only**.
   - For remote access, use an HTTPS origin and set `STUDIO_RUTHLESS_API_TOKEN` (>=32 random characters).
3. On the Ruthless API, set matching `RUTHLESS_API_TOKEN` for remote use, and explicitly set `HOST` for the authorized network binding. The Ruthless security change must be deployed before exposing the API remotely.
4. Sign in with an administrator account and open `/studio/super-agent`.

**Important:** The Cloudflare-hosted MailMyPDF Worker cannot reach a Ruthless API at
`127.0.0.1` on your own computer. A Cloudflare-accessible Ruthless deployment
or private network proxy is necessary for remote Studio use.

## Endpoints

- `GET /api/studio/ruthless?action=health|list|state|events|runs|cost&id=...`
- `POST /api/studio/ruthless` accepts a strict action schema:
  `start`, `intervene`, `pause`, `resume`, `reopen`, `refresh`.
- All requests require existing Studio admin authentication, same-origin checks,
  and server-side URL configuration. The browser does **not** receive the
  Ruthless service token.
- Server bridge disallows arbitrary hostnames, paths, proxy methods, redirects,
  and non-HTTPS remote endpoints. Research budgets are capped at $50 per run.
- Developer chats reuse the already-protected, local-development-only Studio
  endpoints under `/api/studio/chat/*`. Never expose those shell-editing tools
  to the remote worker.

## Current behavior and limitations

- The right inspector shows source-backed evidence, hypotheses and council events.
- The chat composer launches an investigation or delivers an intervention to
  the *real* running director; a queued intervention is not presented as a result.
- A converged investigation must be reopened explicitly before intervention.
- No live research is claimed when Ruthless reports mock-mode providers.
- A user-initiated handoff copies an unverified assessment into the developer
  composer; it does not automatically send it or authorize implementation.
- Development agent edits stay in their isolated git worktree until separately
  reviewed and integrated.
- The investigation engine's own persistence and auth govern its internal
  storage; this integration does not copy case records into MailMyPDF.
- Cross-case persistence, attachments, richer source-review tools, unified
  institutional memory, and a deployed remote investigator endpoint are
  separate follow-up work. Do not imply those are operational.

## Verification

`pnpm --filter ./mailmypdf exec tsx --test tests/studio-ruthless-integration.test.ts`

Also run the app build and existing Studio/agent regression tests, plus Ruthless's
own `npm test` and `npm run build`, before deploying either service.
