# Reusable Component Migration Audit

Updated: 2026-09-16

## Purpose

This audit is the reuse-first migration map for the consolidated MailMyPDF design.

The rule is:

- **Public/SEO presentation** belongs in `@mailmypdf/design-system`.
- **Authenticated workflow and matter presentation** belongs in `@mailmypdf/workflow-ui`.
- **Routing, auth, queries, Studio/admin permissions, and app-specific wiring** stay in `apps/mailmypdf`.
- **Workflow/domain behavior** stays in the shared capability/runtime packages rather than React components.
- Standalone verticals are treated as a source mine. Their strongest patterns are promoted only after app/domain coupling is removed.

## Scan scope

Repository inventory sweep:

- 6,430 tracked file blobs
- 5,419 text-like files
- 1,208 TSX files repository-wide
- 286 component TS/TSX files under the consolidated app and `apps/verticals/*/src/components`
- 269 unique component blobs after exact-SHA deduplication

The inventory pass covered every tracked path in the recursive Git tree. Content review then focused on reusable-code candidates identified by component location, duplicate SHA, package ownership, imports, and UI/workflow signals. Exact duplicate components were reviewed once.

The root-level generated workflow trees were also sampled across verticals. Their `index.tsx` files are intentionally thin route/config wrappers that already delegate to `@mailmypdf/design-system`; they should remain page-specific rather than being copied.

## Canonical ownership

| Concern | Canonical location |
| --- | --- |
| Public section landing | `packages/design-system/src/section-landing.tsx` |
| Public workflow landing | `packages/design-system/src/workflow-landing.tsx` |
| Public workflow directory | `packages/design-system/src/workflow-directory.ts` |
| Public/shared visual tokens | `packages/design-system` |
| Authenticated workspace shell primitives | `packages/design-system/src/workspace.ts` + `workspace.css` |
| Authenticated workflow/matter UI | `packages/workflow-ui` |
| Canonical ecosystem/workflow navigation | `apps/mailmypdf/src/lib/workflow-navigation.ts` |
| Workflow definition/capability registry/runtime | `packages/workflows` |
| Workflow acceptance/test lab | `packages/workflow-acceptance` |
| Document intelligence | `packages/document-intelligence` + `packages/documents` |
| Facts/evidence/provenance/deadlines/findings | `packages/intelligence` |
| Packet assembly | `packages/packet-builder` |
| Address/fulfillment/tracking | `packages/fulfillment` |
| Payment + consequential mailing | `packages/payment-fulfillment` |
| Proof/archive | `packages/proof` |

## Existing shared UI that was already in the right place

`@mailmypdf/workflow-ui` already contained useful primitives and should remain the base layer:

- `SectionCard`
- `StatusPill`
- `Stepper`
- `StepShell`
- `StatusCard`
- `ReadinessChecklist`
- `NextActionCard`
- `SummaryListCard`
- `DataTable`
- `FileList`
- `Dropzone`
- `RecommendedStepsRow`
- `FormFields`
- `TimelineList`
- `PagePreviewGrid`

These were already being used successfully by Private Office step workflows.

## Promoted during this audit

The following patterns were extracted from standalone verticals and promoted into `@mailmypdf/workflow-ui`. The promoted versions are deliberately presentation-only.

| New shared component | Main source patterns | Why it is shared |
| --- | --- | --- |
| `FindingsPanel` | Appeal/Benefits X-Ray views; Private Office results | Generic findings, confidence, sources, status actions |
| `StressTestPanel` | Appeal/Benefits stress-test views | Generic adversarial review / vulnerability presentation |
| `TimelineInsights` | Appeal/Benefits timeline conflicts, gaps, deadline tabs | Generic conflicts, missing events, deadlines |
| `ApprovalChecklist` | Private Office Contractor Dispute review | Explicit human review and gated approval UI |
| `PacketSummary` | Private Office review/package preview | Generic outgoing packet inventory |
| `FulfillmentPanel` | Notice Respond mailing funnel + Private Office Mail step | Generic payment/mailing/tracking/proof states without API coupling |
| `PipelineStatus` | Private Office shared WorkflowResults | Generic execution-stage and blocking-error surface |
| `EvidenceSummary` | Private Office results/evidence builder | Generic evidence status and source labels |
| `StrategyList` | Private Office results + workflow next-step patterns | Generic recommendations/next-action list |
| `DraftReview` | Private Office results + vertical Draft steps | Generic generated-draft review surface without AI/provider calls |

All are exported by `packages/workflow-ui/src/index.ts` and styled in `workflow-ui.css`.

## High-value source families that should be adapted, not copied wholesale

### Appeal / Benefits Timeline

Sources:

- `apps/verticals/appeal-mail/src/components/timeline/timeline-view.tsx`
- `apps/verticals/benefits-appeal/src/components/timeline/timeline-view.tsx`

These are exact duplicate implementations. Their useful concepts are chronology, conflicts, gaps, source integrity, and deadline review. The presentation concepts are now covered by `TimelineList` + `TimelineInsights`. Their old domain imports should not be moved into the UI package.

### Appeal / Benefits X-Ray

Sources:

- `apps/verticals/appeal-mail/src/components/xray/xray-view.tsx`
- `apps/verticals/benefits-appeal/src/components/xray/xray-view.tsx`

Useful concepts: finding type, confidence, confirmation, dismissal, use-in-response, evidence gaps. The generic reusable presentation is now `FindingsPanel`; domain mutation remains outside React.

### Appeal / Benefits Stress Test

Sources:

- `apps/verticals/appeal-mail/src/components/stress-test/stress-test-view.tsx`
- `apps/verticals/benefits-appeal/src/components/stress-test/stress-test-view.tsx`

Useful concepts: severity, likely challenge, vulnerability, mitigation. Generic presentation is now `StressTestPanel`.

### Private Office Gold step workflows

Representative sources:

- `apps/verticals/private-office/src/components/workflow-steps/contractor-dispute/Evidence.tsx`
- `.../Review.tsx`
- `.../Mail.tsx`
- `apps/verticals/private-office/src/components/private-office/workflow-results.tsx`

These contain some of the best authenticated workflow patterns in the repo. They already use `@mailmypdf/workflow-ui` heavily. Their reusable surfaces have now been promoted; workflow-specific matter data and rules should remain in the workflow definition/runtime.

### Notice Respond Mailing Funnel

Source:

- `apps/verticals/notice-respond/src/components/mailing-funnel.tsx`

The state progression is useful: review -> recipient -> mail option/quote -> checkout -> submitting -> submitted/tracking/error.

Do **not** copy the component wholesale. It directly imports auth, owns redirects/query-string processing, and calls app API routes. Shared presentation is now `FulfillmentPanel`; Stripe/Lob/payment/mailing behavior belongs in shared fulfillment capabilities.

## Existing components that should remain app integrations

These are useful, but their current location is correct because they bind shared UI to routes/auth/registries:

- `apps/mailmypdf/src/components/authenticated-sidebar.tsx`
- `apps/mailmypdf/src/components/authenticated-workflow-browser.tsx`
- `apps/mailmypdf/src/components/authenticated-workflow-detail.tsx`

The reusable visual shell should come from the shared design/workflow packages, while these files resolve the current user, canonical workflow registry, admin access, and routing.

## Components intentionally not promoted

### Browser-base64 DocumentUpload

Source:

- `apps/mailmypdf/src/components/document-upload.tsx`

It is visually reusable but its behavior is not suitable as the new secure upload foundation: it reads files into browser base64 state, relies substantially on client MIME information, and predates the shared secure document pipeline.

Use `Dropzone`/`FileList` for presentation and wire them to `@mailmypdf/documents` / `@mailmypdf/document-intelligence` for storage, validation, extraction, and analysis.

### AI Draft Helper

Sources:

- Appeal Mail / Benefits Appeal `ai-draft-helper.tsx`

Do not promote provider selection and API invocation into workflow UI. Drafting should be invoked by runtime capabilities; `DraftReview` renders the result.

### Old ecosystem shells, headers, and matter mastheads

Multiple standalone verticals contain duplicate or near-duplicate `ecosystem-shell.tsx`, `site-header.tsx`, nav, and `matter-app-header.tsx` implementations.

Do not create another shared shell from these. The consolidated authenticated sidebar/workspace shell and `@mailmypdf/design-system` workspace primitives supersede them.

### Giant workflow wizards/pages

Examples include:

- Appeal `workflow-wizard.tsx`
- `appeal-workflow-page.tsx`
- standalone workflow workspaces

Mine their sub-patterns, but do not move giant vertical-specific page components into a shared package. The new design should render shared surfaces from runtime/manifest state.

## Public UI reuse findings

The public layer is already substantially centralized:

- root workflow `index.tsx` files call `WorkflowLandingPage`
- root section `index.tsx` files call `SectionLandingPage`
- workflow indexes can use `createWorkflowDirectory`
- page-specific copy/SEO/schema remains local to each workflow

This is the correct boundary.

One outstanding public-design change from the current product specification: workflow directory cards and workflow landing pages need a real workflow-specific hero/thumbnail asset contract. The existing directory media block is primarily decorative, and `WorkflowLandingConfig` does not yet expose the shared workflow hero image required by the new design. That should be handled in `@mailmypdf/design-system`, not by restoring old vertical hero components.

## Backend reuse findings

A major result of this audit is that the repo already contains much of the workflow-factory architecture that was being planned conceptually.

### `packages/workflows`

Already contains:

- canonical capability registry
- dependency validation
- capability runtime
- `defineWorkflow()`
- workflow manifest
- workflow factory/composition
- pipeline/adapter registries
- durable manifest runner
- execution reliability
- workflow quality/certification primitives

Do not create a second `workflow-core`/manifest system until these files are audited and either extended or deliberately replaced.

### `packages/workflow-acceptance`

Already contains:

- scenario/fixture model
- artifact store
- fake Supabase
- mock Stripe
- mock mailing client
- PDF utilities
- acceptance report model

This is already the nucleus of the Studio Test button and should be extended instead of rebuilt.

### `packages/intelligence`

Already contains reusable facts, provenance, evidence, contradictions, findings, timelines, deadlines, risk, entities, relationships, understanding, and case assessment modules.

### Fulfillment/document packages

`document-intelligence`, `documents`, `packet-builder`, `fulfillment`, `payment-fulfillment`, and `proof` already map directly to the new architecture. They need capability-level audit/repair and consolidation, not wholesale recreation.

## Duplicate families discovered

Notable exact-SHA duplicates include:

- ecosystem shells across several standalone verticals
- site headers across Dispute/Immigration/Notice Respond/Private Office
- Appeal + Benefits timeline view
- Appeal + Benefits X-Ray view
- Appeal + Benefits stress-test view
- Appeal + Benefits AI draft helper
- Appeal + Benefits workflow hero
- shared product/account/start/mail-a-pdf routes across verticals

Exact duplicates are migration evidence: consolidate the behavior at its correct shared boundary rather than maintaining copies.

## Migration rules going forward

1. Do not copy app auth/API code into `workflow-ui`.
2. Do not let shared UI import vertical domain modules.
3. Shared UI accepts typed data/callbacks only.
4. Do not recreate public landing primitives already in `design-system`.
5. Do not promote insecure/legacy file-handling behavior merely because its UI is reusable.
6. Prefer composition of small shared surfaces over giant shared workflow pages.
7. Keep old vertical implementations until the consolidated app is wired and verified; remove duplicates only after migration.
8. Consequential actions remain runtime-owned and approval-gated; a React button must never itself be the security boundary.

## Next migration targets

1. Wire the new shared workflow surfaces into one authenticated gold reference workflow (CP2000 is the preferred reference).
2. Convert the authenticated workflow detail from a mostly launch/status page into a runtime-driven matter workspace.
3. Add shared workflow hero/thumbnail support to the public design system.
4. Audit `packages/workflows`, `document-intelligence`, `documents`, `intelligence`, `packet-builder`, `payment-fulfillment`, `fulfillment`, and `proof` against the capability contract before creating any new backend package.
5. Extend `workflow-acceptance` rather than inventing a separate Studio test harness.

## Validation note

At the time of this migration pass, the repository's existing Workspace UI and Shared Capability GitHub Actions were already failing on earlier main commits. Those baseline failures predate these promoted components. The new files were kept isolated to `@mailmypdf/workflow-ui`; they still need package typecheck/build validation once an execution environment is available or CI is repaired.
