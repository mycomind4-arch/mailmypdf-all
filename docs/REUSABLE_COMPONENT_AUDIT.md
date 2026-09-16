# Reusable Component Audit — MailMyPDF

Snapshot: `main` tree `5252ee2fa74e6c5bee78f9c62dd49d59af12d628`  
Audit date: 2026-09-16

## Scope

Repository-wide recursive inventory covered 6,451 files. The scan then narrowed source review to reusable UI and workflow surfaces under:

- `apps/mailmypdf/src/components`
- `apps/mailmypdf/src/lib`
- `apps/verticals/*/src/components`
- `packages/design-system`
- `packages/workflow-ui`
- workflow/runtime/document/intelligence/fulfillment packages

The audit also compared blob SHAs across TypeScript/JavaScript/CSS sources to identify exact duplicate components across vertical apps.

## Architectural rule

Reusable presentation belongs in:

- `packages/design-system` for public/marketing/section/workspace shell patterns.
- `packages/workflow-ui` for authenticated matter/workflow presentation.

Domain logic, routing, authentication, provider calls, workflow registries, and server actions remain in their owning app/package. A component is not promoted merely because two apps copied it; it must also have a stable cross-workflow contract.

## Existing shared components — keep and reuse

### Public/design system

`packages/design-system` already owns:

- vertical hero and trust strip
- section landing page
- workflow landing page
- public workflow directory
- workflow hub
- workspace shell/topbar/page header/metrics
- shared theme tokens and workspace CSS

These supersede repeated vertical copies of public chrome, workflow hero, directory, and generic workspace shell concepts.

### Authenticated workflow UI

`packages/workflow-ui` already owns:

- StepShell / Stepper
- StatusCard / StatusPill
- ReadinessChecklist
- NextActionCard
- SummaryListCard
- SectionCard
- DataTable
- FileList / Dropzone
- FormFields
- TimelineList / TimelineInsights
- PagePreviewGrid
- FindingsPanel
- StressTestPanel
- ApprovalChecklist
- PacketSummary
- FulfillmentPanel
- PipelineStatus
- EvidenceSummary
- StrategyList
- DraftReview
- ProofTimeline
- DocumentSummaryCard
- StatePanel
- StepStatusList
- ChoiceCardGrid
- DeadlineSummary
- SourceReference
- ActionList
- CommunicationList
- MatterList

These components already represent prior extractions from Appeal, Benefits, Code Enforcement, Records Request, Private Office, and core app surfaces.

## Promoted in this audit

The following capabilities were still trapped in app-local UI and have now been moved into `@mailmypdf/workflow-ui` as provider/router-independent presentation:

### StructuredAnalysisPanel

Source concept:
`apps/verticals/notice-respond/src/components/llm-analysis-panel.tsx`

New shared component:
`packages/workflow-ui/src/StructuredAnalysisPanel.tsx`

Purpose:

- analysis summary
- provider/confidence display
- grounded facts with source references
- requested actions
- urgent actions
- detected issues
- evidence gaps
- uncertainties

The shared version owns no Claude/provider/domain type and accepts normalized data props.

### WorkflowBrowser

Source concept:
`apps/mailmypdf/src/components/authenticated-workflow-browser.tsx`

New shared component:
`packages/workflow-ui/src/WorkflowBrowser.tsx`

Purpose:

- authenticated workflow search
- ready/not-connected filtering
- workflow-family labels
- compact operational workflow rows

Registry lookup, authority state, admin permissions, and routing remain in the host app.

### WorkflowDetailSummary

Source concept:
`apps/mailmypdf/src/components/authenticated-workflow-detail.tsx`

New shared component:
`packages/workflow-ui/src/WorkflowDetailSummary.tsx`

Purpose:

- authenticated workflow masthead
- start/runtime-not-connected state
- back navigation
- operational metric cards

Admin/authority queries stay app-local.

## Do not promote / legacy

### Core DocumentUpload

`apps/mailmypdf/src/components/document-upload.tsx`

Do not reuse in the new architecture. It reads files into base64 browser state and performs only client MIME/size checks. The new design should use the storage-agnostic shared `Dropzone` plus the secure document-intake/storage pipeline.

### Notice Respond WorkflowShell

`apps/verticals/notice-respond/src/components/workflow-shell.tsx`

Do not promote as a whole. Its useful pieces are already represented by `StepShell`, `Stepper`, `Dropzone`, `FormFields`, `ApprovalChecklist`, `ChoiceCardGrid`, and fulfillment primitives. It also embeds legacy static mail pricing.

### Appeal/Benefits workspace AppShell

`apps/verticals/appeal-mail/src/components/workspace/app-shell.tsx`

Do not promote wholesale. Deadline, source reference, status, shell, and progression patterns have already been distilled into shared packages.

### Private Office WorkflowResults

`apps/verticals/private-office/src/components/private-office/workflow-results.tsx`

Do not copy as a second shared results framework. Its pipeline, findings, evidence, risk/strategy, timeline, draft, and readiness concepts are already decomposed into `workflow-ui` primitives.

### AIDraftHelper

`apps/verticals/appeal-mail/src/components/ai-draft-helper.tsx`
(and exact Benefits copy)

Keep app/domain-specific for now. It directly imports provider APIs and provider selection. The shared UI should consume provider-neutral draft state; provider/model policy belongs in the AI/runtime layer.

### PaymentReturn

Appeal/Benefits duplicate payment-return components are tightly coupled to TanStack auth, Supabase, and a specific endpoint. Keep this in integration/application code rather than the shared workflow UI.

### Public workflow heroes

Appeal/Benefits `workflow-hero.tsx` is superseded by `packages/design-system/src/workflow-landing.tsx` and the shared vertical hero implementation.

## Exact duplicate families found

The blob-SHA pass found exact duplicated source across verticals, including:

- identical site headers across Dispute Mail, Immigration Mail, Notice Respond, and Private Office
- identical ecosystem shells across Appeal Mail, Dispute Mail, and Immigration Mail
- identical ecosystem navigation implementations across multiple vertical groups
- Appeal Mail / Benefits Appeal copies of AI draft helper, workflow page, payment return, stress-test view, timeline view, workflow hero, and X-Ray view

These copies should be retired incrementally as host apps adopt the already-existing shared design/workflow packages. Do not create another abstraction for them.

## Keep app-local

The following should remain application-specific unless their contracts materially change:

- authenticated-sidebar wiring: router state, workflow registry, admin query, user sign-out
- workflow-authority registry queries
- admin operational controls
- analytics consent
- payment test-mode banner
- Pro upsell
- Stripe/Supabase callback handling
- app-specific SEO/public route wiring

Presentational parts can consume shared primitives; authentication/provider/business behavior should not move into UI packages.

## Later candidates

Useful but not required for the current authenticated redesign:

- Notice Respond featured workflow carousel → possible `design-system` public component
- voice narration/dictation controls → should be reconciled with `packages/voice` / `packages/voice-client` rather than copied to workflow-ui
- Studio workflow graph/editor components → remain Studio-specific unless a separate reusable graph-editor contract emerges

## Important package reuse discovered

Do not create duplicate packages for capabilities already present:

- `packages/document-intelligence`
- `packages/documents`
- `packages/intelligence`
- `packages/workflows`
- `packages/workflow-acceptance`
- `packages/packet-builder`
- `packages/payment-fulfillment`
- `packages/pricing`
- `packages/fulfillment`
- `packages/proof`
- `packages/ai`
- `packages/agent-runtime`
- `packages/vertical-foundry`

Before adding any new workflow-runtime/document/evidence/fulfillment abstraction, audit these implementations first and classify them KEEP / WRAP / MERGE / REPAIR / REPLACE / CREATE.

## Next migration pass

1. Make the core authenticated workflow browser adapt registry data into `WorkflowBrowser`.
2. Make the core authenticated workflow detail page compose `WorkflowDetailSummary`.
3. Replace Notice Respond's local LLM analysis display with `StructuredAnalysisPanel`.
4. Keep source components temporarily until each migration passes package/app typecheck and visual verification.
5. Retire exact duplicate vertical UI only after consumers point at the shared package.
