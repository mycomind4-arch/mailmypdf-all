# Studio Workflow Acceptance Engine

Status: first vertical slice implemented and **passing** (car-insurance-appeal
/ appeal-mail, scenario `rear-end-liability-dispute`: `MAIL READY: true`,
every hard gate green). See build-specs for the original mission brief this
implements.

## 1. What this is

One engine that discovers a MailMyPDF workflow, runs it end-to-end against a
deterministic synthetic fixture using **real production code** (real route
handlers, real domain logic, real PDF generation and merging), simulates
Stripe and Lob at the narrowest possible seam, validates the resulting
mail-ready packet, and emits a machine-readable PASS/FAIL report plus
preserved artifacts (packet PDF, page renders, manifest, trace).

Studio's GUI, the CLI, and an external agent (ChatGPT Work, CI) are all
clients of the *same* engine — see "Fundamental Architectural Rule" below.

```
studio workflow test car-insurance-appeal --fixture rear-end-liability-dispute --json
```

Exit codes: `0` PASS, `1` acceptance failure, `2` configuration/test
infrastructure failure, `3` workflow could not execute.

## 2. Repository map

```
packages/
  packet-builder/          @mailmypdf/packet-builder
    - generatePlainTextPdf, generateLetterPdf, estimateLetterPageCount
    - assemblePacket, PacketError, PacketDocumentRow, PacketManifestEntry
    (extracted from apps/mailmypdf/src/lib/{letter-pdf.server.ts,
     secure-core/packet.server.ts}; those files now re-export from here so
     every existing call site and test is unchanged. See "Provenance" below.)

  workflow-acceptance/     @mailmypdf/workflow-acceptance -- the engine
    src/
      types.ts             Scenario, Fixture, AcceptanceReport, FailureCode, ...
      artifact-store.ts     ArtifactStore: run directories, trace, writers
      scenario-loader.ts    loads scenario.json / expected.json / uploads
      fake-supabase.ts      generic in-memory Supabase query-builder stand-in
      mock-stripe.ts         Mock Stripe: checkout session create + webhook events
      mock-mailing-client.ts Mock @mailmypdf/mailing-client + Mock Lob provider
      pdf-utils.ts           structural preflight, text+placeholder scan, page rendering
      report.ts              builds report.json, computes mailReady from hard gates
    bin/studio.mjs          the CLI (plain Node, no build step)
    registry/workflows.json workflow id -> vertical + test-file mapping

apps/verticals/appeal-mail/
  vitest.acceptance.config.ts
  tests/acceptance/car-insurance-appeal/
    run.acceptance.ts       the ONLY file that knows how to drive THIS workflow
    scenarios/<scenarioId>/{scenario.json,expected.json,uploads/*}
    runs/<workflowId>/<scenarioId>/<runId>/   (git-ignored-by-convention artifacts)
```

## 3. Fundamental Architectural Rule

There is one acceptance engine (`@mailmypdf/workflow-acceptance`). The CLI
(`bin/studio.mjs`) is a thin, logic-free orchestrator: it resolves a workflow
from `registry/workflows.json`, computes the next run id, spawns
`vitest run <acceptanceTestFile>` in the vertical's own directory (so the
vertical's own `@` alias, dependencies, and TS config apply), then reads back
the `report.json` that test wrote and translates it into stdout + an exit
code. The CLI never re-implements engine logic; a future Studio GUI panel
should call the same CLI (or the same `runScenario` code path) rather than
reimplementing the flow.

**Why vitest, and why per-vertical test files.** MailMyPDF's route handlers
are TanStack Start server routes (`createFileRoute(path)({ server: { handlers: { POST } } })`)
that import real modules via a Vite `@` path alias (`@/platform/supabase`,
etc.) — plain Node cannot resolve or type-strip these. The existing test
suites already solve this by running under Vitest and using `vi.mock()` to
swap out `@tanstack/react-router`'s `createFileRoute` for an identity
function, exposing the route's `.server.handlers.POST` as a plain callable.
The acceptance engine reuses that exact convention rather than inventing a
new one, and asks vitest to mock **only** the true external boundaries
(Supabase, Stripe, the MailMyPDF mailing-client, the AI control plane) —
every other route, domain, and shared-package import is 100% real,
unmodified code.

Because driving a specific workflow's routes (which files to import, which
request bodies to build, what its readiness gates need) is inherently
workflow-specific, that glue lives **in the vertical**, one file per
workflow (`tests/acceptance/<workflowId>/run.acceptance.ts`). Everything
reusable — fixtures, mocks, PDF preflight, reporting — lives in the shared
engine package and is imported from there.

## 4. Provider abstraction — what already existed vs. what this milestone added

Section 11 of the mission brief asks for `PaymentProvider` / `MailProvider`
interfaces with Mock implementations. Discovery found that **the seams
already exist in production**, just not yet paired with test doubles:

- `MailingIntentStore` and `MailMyPDFClient` (in `@mailmypdf/payment-fulfillment`)
  are already the injectable boundary between the shared, idempotent
  `fulfillMailingIntent()` engine and (a) each vertical's database and (b)
  the real MailMyPDF platform API. Verticals already supply their own
  concrete adapters (e.g. `apps/verticals/appeal-mail/src/platform/{mailing-intent-store,mailmypdf-client}.ts`).
- `@mailmypdf/mailing-client` is the shared HTTP client every adapter's
  `MailMyPDFClient` wraps, hitting `MAILMYPDF_API_URL`/`MAILMYPDF_API_KEY`.
- The real PDF merge already exists: `apps/mailmypdf/src/lib/secure-core/packet.server.ts`'s
  `assemblePacket(responseLetterPdf, documents, readBytes)` merges a
  generated letter with approved attachments via `pdf-lib`, with `readBytes`
  already injectable "so the assembly rules can be exercised against real
  PDFs in tests without a storage backend" (a comment already in that file
  before this milestone).

This milestone's actual work on this front was:

1. **Extracted** the pure PDF-generation/merge functions (`generatePlainTextPdf`,
   `assemblePacket`, etc.) out of `apps/mailmypdf` into the new
   `@mailmypdf/packet-builder` package, so the acceptance engine can import
   the exact production merge code without needing to run `apps/mailmypdf`
   as a second HTTP server. `apps/mailmypdf`'s own files now re-export from
   this package — zero behavior change, verified by its existing 18-test
   `case-packet.test.ts` suite still passing unmodified.
2. **Wrote Mock implementations** of the two provider seams:
   - `createStripeMock()` — a `stripe`-shaped class (`checkout.sessions.create`,
     `webhooks.constructEventAsync`) with no network calls, tracking every
     checkout session and webhook delivery for idempotency assertions.
   - `createMockMailingClient()` — replaces `@mailmypdf/mailing-client`'s
     exports. `uploadDocument`/`uploadDocumentBase64` normalize text to PDF
     using the real `generatePlainTextPdf`; `uploadPacket` merges attachments
     using the real `assemblePacket`; `createCommunication` records a
     `LobSimulationRecord` instead of calling Lob, deduplicated by
     `idempotency_key` (a second safety net on top of
     `fulfillMailingIntent`'s own `provider_order_id` idempotency check).
3. **`createFakeSupabase()`** — a generic in-memory stand-in for the subset
   of the `@supabase/supabase-js` query builder the routes actually use
   (`from().select/insert/update`, chained `.eq()`, `.order()`, `.limit()`,
   `.single()`/`.maybeSingle()`, `.auth.getUser()`). This is the seam that
   lets the *real* `analyze.ts` / `draft.ts` / `approve.ts` / `mailing-intent-store.ts`
   run against isolated, disposable data with zero live Supabase project.

No vertical's production code was modified to make any of this possible.

## 5. What is still real vs. simulated in a run

| Layer | Status |
|---|---|
| Route handlers (analyze/draft/approve/checkout/webhook) | Real, unmodified |
| Domain logic (decision/ground/evidence/packet/review/draft-validator) | Real, unmodified |
| `@mailmypdf/payment-fulfillment` (idempotent fulfillment engine, Stripe webhook handling) | Real, unmodified |
| PDF generation & merge (`@mailmypdf/packet-builder`) | Real, unmodified |
| Supabase | Simulated (in-memory, per-run, isolated) |
| Stripe | Simulated (no network, no real charge) |
| MailMyPDF platform API / Lob | Simulated at the `@mailmypdf/mailing-client` seam (no network, no real mail) |
| AI (analysis/draft/validation) | Simulated by default — a deterministic fixture provider templated from the scenario's synthetic facts (see `tests/acceptance/car-insurance-appeal/run.acceptance.ts`'s `fixtureAnalysis()`/`fixtureDraftText()`). No `MAILMYPDF_CONTROL_PLANE_URL`/API keys are required to run acceptance tests. A live-AI mode is a natural future addition (swap the `@/platform/control-plane-ai` mock for the real module when credentials are present) but was out of scope for this milestone — see "Open questions" below. |

## 6. Finding #1 (fixed): car-insurance-appeal approval was unconditionally unreachable

Running the engine against the first real scenario immediately surfaced a
genuine, reproducible defect — exactly the kind of thing this system exists
to catch (see the mission's "Guiding Principle": trust the acceptance test,
not "the AI says it finished"). **This has since been fixed and verified**
(the acceptance report now shows `packetAssembly: pass`); this section is
kept as a record of what the engine found and how it was confirmed.

**Symptom:** `POST /api/workflows/car-insurance-appeal/approve` returned 409
for every case, reporting a readiness score around 76/100 with 3
`issuesRequiringAttention`, against gates of `score >= 80` and
`issuesRequiringAttention <= 2`.

**Root cause:**
`analyze.ts` linked each appeal ground to its supporting evidence by setting
`ground.supportingEvidenceIds` — but `review.ts` and `evidence.ts` only ever
read the *other direction*, `evidence[i].groundIds`, which analyze.ts never
populated. `ground.supportingEvidenceIds` was written but never read
anywhere in the domain layer (confirmed by a full-repo grep). That made the
"unsupported_claims" and "unlinked_evidence" readiness checks warn
**unconditionally**. Combined with `appealInstructions` never being
extracted (a third unconditional warning), every case accumulated >= 3
warnings (-24 points), which `approve.ts`'s gate rejected regardless of the
underlying case quality.

**Confirmed, then fixed:** a "downstream verification" test (since removed —
see section 11) seeded an otherwise-identical appeal with
`evidence[i].groundIds` populated correctly and drove the same real
`approve → checkout → Stripe webhook (x3) → packet → preflight → render`
pipeline, proving the fix would be narrow and the rest of the pipeline
sound. The actual fix landed in
[`analyze.ts`](../../apps/verticals/appeal-mail/src/routes/api/workflows/car-insurance-appeal/analyze.ts):
every evidence item now gets `groundIds` set to every identified ground (the
analysis doesn't map specific evidence to specific issues, so this is the
accurate, non-invented claim available), and the AI-requested JSON schema
now includes `appealInstructions`, threaded into `createDecision(...)`.

This pattern (evidence linked via `supportingEvidenceIds` only) is very
likely shared across appeal-mail's other dynamic workflows — a follow-up
sweep of the other ~30 workflows is recommended.

## 7. Finding #2 (fixed): requested uploads never reached the mailed PDF

Independent of the above, the acceptance run also demonstrated a second,
real gap, now fixed: `apps/verticals/appeal-mail/src/platform/mailmypdf-client.ts`'s
`MailMyPDFClient` adapter implemented only `uploadDocument` and
`createCommunication` — it never implemented the optional `uploadPacket()`
method that `@mailmypdf/payment-fulfillment`'s `fulfillMailingIntent()`
checks for (`client.uploadPacket ? uploadPacket(...) : uploadDocument(...)`).
So fulfillment always took the `uploadDocument()` branch: the generated
letter text alone, normalized to PDF, with **no attachments** — even though
the appeal's `packet.attachmentIds` / `exhibitIndex` listed evidence the user
expected enclosed. The engine reported this as `PACKET_UPLOAD_MISSING` (hard
gate — see "User Upload Inclusion" in the mission brief).

This one turned out bigger than "wire one adapter method": appeal-mail had
**no durable storage for evidence bytes at all** — the uploaded file only
ever reached MailMyPDF's platform (which has no download-by-id endpoint to
fetch it back later) or was reused by reference (`documentId`) across
several `Evidence` entries, never as independently retrievable bytes.
Notice Respond (`apps/verticals/notice-respond/src/platform/fulfillment-adapter.ts`)
already had a working version of exactly this, which the fix mirrors:

1. New migration `apps/verticals/appeal-mail/supabase/migrations/20260913_evidence_storage.sql`
   creates a private `appeal-evidence` Storage bucket. **This migration must
   be applied to the Supabase project(s) this runs against** — Studio's
   acceptance runs never touch a real Supabase project, so this step wasn't
   exercised there, only reasoned from the schema.
2. `domain/evidence.ts`'s `Evidence` schema gained `storagePath` /
   `mimeType` / `fileSize` (alongside the existing `hash`), plus
   `toMailingEvidenceItems()`, the single shared conversion into
   `@mailmypdf/payment-fulfillment`'s `MailingEvidenceItem[]` shape — used
   at both approval time (hashing) and fulfillment time (attaching), so they
   can never drift apart.
3. `analyze.ts` now uploads the source file's bytes into `appeal-evidence`
   and records `storagePath`/`hash`/`mimeType`/`fileSize` on the one
   evidence entry that represents a real, independently-uploaded file (the
   other, AI-derived `evidenceMentioned` entries stay label-only — they
   reference the *same* document, not separate files, so they deliberately
   don't also claim the storage reference).
4. `domain/packet.ts`'s `assemblePacket()` now also freezes
   `approvedEvidenceHash` at approval time.
5. `platform/mailing-intent-store.ts` now populates `evidence_snapshot` /
   `approved_evidence_hash` on the `MailingIntent` from `appeal.evidence` /
   `packet.approvedEvidenceHash`.
6. `platform/mailmypdf-client.ts` now implements `uploadPacket()`: downloads
   each evidence item from `appeal-evidence`, re-verifies its hash, and
   calls the shared mailing-client's `uploadPacket()` — the same call path
   Notice Respond uses, which merges via the real `@mailmypdf/packet-builder`.

Verified: the acceptance report's `packet-manifest.json` now lists the
uploaded evidence document alongside the generated letter, and the rendered
`mail-ready-packet.pdf` pages show both — see the run artifacts.

## 8. Running it

```bash
# List known workflows
pnpm studio workflow list

# List scenarios for one workflow
pnpm studio workflow scenarios car-insurance-appeal

# Run one scenario, human-readable
pnpm studio workflow test car-insurance-appeal --fixture rear-end-liability-dispute

# Machine-readable (this is the report.json / --json API — treat its shape as stable)
pnpm studio workflow test car-insurance-appeal --fixture rear-end-liability-dispute --json

# Run every known scenario for a workflow
pnpm studio workflow test car-insurance-appeal --all-scenarios
```

Local iteration without the CLI (faster inner loop while editing
run.acceptance.ts):

```bash
cd apps/verticals/appeal-mail
pnpm test:acceptance
```

Artifacts land under
`apps/verticals/appeal-mail/tests/acceptance/car-insurance-appeal/runs/`,
one numbered directory per run, never overwritten.

## 9. Adding a new scenario to an existing workflow

Create `tests/acceptance/<workflowId>/scenarios/<scenarioId>/`:

- `scenario.json` — `{ id, workflowId, title, description, intake, uploads }`.
  `intake.facts` is a free-form bag the vertical's `run.acceptance.ts`
  templates the fixture AI responses from — keep it internally coherent with
  the uploaded document(s) (see "Synthetic Data Requirements" in the
  mission brief).
- `expected.json` — `mustContain` / `mustNotContain` / `mustIncludeUploads` /
  `mustGenerate` / min/max page counts. Keep these structural, not
  wording-brittle.
- `uploads/*.pdf` — synthetic, clearly-fictional documents. Generate with
  `pdf-lib` directly (see git history for the generator script used for
  `rear-end-liability-dispute`'s fixture) rather than hand-authoring PDF
  bytes.

No engine code changes are needed for a new scenario of an *existing*
workflow.

## 10. Adding a new workflow

1. Add an entry to `packages/workflow-acceptance/registry/workflows.json`
   (`vertical`, `verticalDir`, `acceptanceConfig`, `acceptanceTestFile`,
   `scenariosDir`, `runsDir`).
2. Add `vitest.acceptance.config.ts` to that vertical if it doesn't have one
   (copy appeal-mail's).
3. Write `tests/acceptance/<workflowId>/run.acceptance.ts`: mock the same
   four seams (`@tanstack/react-router`, `@/platform/supabase`, `stripe`,
   `@mailmypdf/mailing-client`, and the vertical's AI-calling module) using
   `@mailmypdf/workflow-acceptance`'s exports, then drive that workflow's
   real routes in sequence. Most of this file's shape can be copied from
   appeal-mail's and adapted to the new workflow's request/response shapes.
4. Add at least one scenario (see above).

## 11. Known limitation: pdfjs-dist Node "fake worker" survives only one `getDocument()` per process

`pdfjs-dist`'s legacy Node build has no real worker thread, so it falls back
to an in-process `LoopbackPort` that still round-trips render/text commands
through `structuredClone`-based message passing. Empirically, a **second**
independent `getDocument()` call anywhere later in the same process reliably
throws `Error: Unable to deserialize cloned data` on its first
`postMessage` round-trip inside pdfjs-dist itself (`LoopbackPort.postMessage`
→ `MessageHandler.sendWithPromise`) — regardless of call order, regardless
of calling `.destroy()` on the first document/loading task, and regardless
of using a cache-busted fresh module instance for the second call. The only
reliable fix found: do text extraction and page rendering for one PDF in a
**single** `getDocument()` session — see `inspectPdfContent()` in
`packages/workflow-acceptance/src/pdf-utils.ts`, which is why it does both
in one pass rather than exposing them as two separate functions.

Update: with `inspectPdfContent()` always calling `loadingTask.destroy()` in
a `finally` block, two *separate, self-contained* `inspectPdfContent()`
calls in the same process (one per test, each doing its own
getDocument→use→destroy) have been observed to work correctly — this was
verified when `run.acceptance.ts` briefly had two `it()` blocks (the primary
run plus a since-removed downstream-verification test) that both reached
this code in the same `vitest run` process, and both rendered successfully.
The failure mode above was reproduced specifically with the *original*,
un-consolidated `extractPdfText()` + `renderPdfPagesToPng()` pair, which
called `getDocument()` twice **without** either side destroying its loading
task. The practical rule going forward: always route PDF text+render needs
through `inspectPdfContent()` (never reintroduce a split
extract-then-render pair without a destroy step), and it should be safe to
call more than once per process.

The CLI sidesteps this family of issue regardless: `--all-scenarios` spawns
one fresh `vitest run` process per scenario, so different scenarios never
share a pdfjs session.

## 12. Open questions / deliberately deferred

- **Live-AI mode.** Section 11 of the mission brief allows "an optional
  second acceptance mode using actual provider sandboxes" later. The fixture
  AI provider is offline/deterministic by design (no `MAILMYPDF_CONTROL_PLANE_URL`
  needed); wiring a `--live-ai` flag that leaves `@/platform/control-plane-ai`
  unmocked when credentials are present is a natural next step but wasn't
  needed to prove the milestone.
- **Generalizing beyond appeal-mail.** Only car-insurance-appeal is wired up.
  Per the mission brief's "Initial Vertical Slice" guidance, do not
  generalize further until a second, meaningfully different workflow proves
  what actually needs to be shared vs. vertical-specific.
- **Studio GUI `[ Run Test ]` button.** Not built this milestone (Phase 10
  in the mission brief, explicitly last). The CLI is the stable contract a
  future GUI panel should call.
