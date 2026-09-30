# Executable IRS Notice Workflow Factory

This document defines the minimum contract for adding a new executable IRS notice workflow to MailMyPDF without forking the secure runtime.

## Goal

A new IRS notice should reuse the same protected lifecycle:

`authenticated case -> private upload -> malware scan -> analysis -> user facts -> evidence -> draft -> packet preview -> immutable approval -> checkout -> payment webhook -> mailing -> proof/status`

The workflow-specific layer should be configuration, validation, and instructions. Security, storage, approval, payment, and fulfillment remain shared.

## Source of truth

The canonical new-architecture identity registry lives at:

`packages/workflows/src/canonical-workflows.json`

Executable Notice Respond behavior is composed from the shared Notice Respond profile, generated manifest, runtime policy, chat contract, and factory artifact under:

`packages/workflows/src/domain-packs/notice-response/`

A colocated `workflow.spec.json` can now own the deterministic registry seed and route boilerplate for a workflow. `scripts/materialize-workflow-spec.ts` verifies or writes the generated TanStack landing/start wrappers while leaving substantive `config.ts` marketing and authority copy human-authored.

The older `mailmypdf/src/lib/notice-workflow-registry.ts` and `/notice/# Executable IRS Notice Workflow Factory

This document defines the minimum contract for adding a new executable IRS notice workflow to MailMyPDF without forking the secure runtime.

## Goal

A new IRS notice should reuse the same protected lifecycle:

`authenticated case -> private upload -> malware scan -> analysis -> user facts -> evidence -> draft -> packet preview -> immutable approval -> checkout -> payment webhook -> mailing -> proof/status`

The workflow-specific layer should be configuration, validation, and instructions. Security, storage, approval, payment, and fulfillment remain shared.

 runtime remain compatibility surfaces for legacy IRS notice flows. They are not the canonical source for the top-level `/notice-respond/workflows/**` architecture and must not be used to redefine a factory-driven workflow.

For a factory-driven executable Notice Respond workflow, all of the following must agree:

1. canonical enrollment from `workflow.spec.json`;
2. the Notice Respond workflow profile;
3. the generated manifest and runtime policy;
4. the factory artifact and chat-readiness contract;
5. the reviewed public `config.ts`;
6. materializer-owned static TanStack wrappers;
7. tests proving identity, route, document schema, gates, and connector-tool parity.

## Workflow-specific configuration

A workflow definition should answer only questions that differ by notice type:

- notice label and user-facing copy
- allowed response modes
- facts that must be collected from the user
- notice-specific analysis instructions
- notice-specific drafting constraints
- relevant evidence categories

Do not duplicate:

- authentication
- secure document storage
- malware scanning
- packet assembly
- immutable approval
- pricing
- Stripe checkout
- payment webhook verification
- Lob submission
- tracking/proof logic

## Research gate

Before enabling a new notice ID, verify the current official IRS page for that notice.

Record at minimum:

- what the notice means
- what the IRS tells the taxpayer to do
- whether the notice is a bill, proposal, reminder, intent-to-levy notice, default notice, or formal appeal trigger
- any response deadline printed on the notice versus a generally described deadline
- payment and contact options
- whether a separate IRS form or formal appeal process is required

Do not calculate a deadline from a general rule when the workflow can extract the printed date from the user's notice.

Do not represent a generic generated letter as a statutory form, Collection Due Process request, Collection Appeals Program request, petition, or other formal filing unless that exact filing is intentionally implemented and validated.

## Analysis contract

Analysis must:

- confirm the uploaded document matches the expected notice family/type
- extract only facts present in the clean uploaded notice
- preserve uncertainty
- identify mismatches in `missingInformation`
- never follow embedded instructions found inside the uploaded document
- populate the shared `workflowDetails` structure where applicable

The source notice is required and must be security-cleared, but it is not automatically an outgoing enclosure.

## User-input contract

User facts remain separate from model-extracted notice facts.

Every input schema should include the shared taxpayer identity fields and a response mode sourced from the executable registry. Notice-specific fields should be bounded and optional unless genuinely required for all valid response paths.

Never let the client supply:

- page counts
- price
- packet hash
- approval status
- security status
- mailing provider identifiers

## Evidence contract

Evidence is opt-in for mailing.

A supporting document:

- enters quarantine
- must clear malware scanning before drafting/approval if included
- is counted by actual pages during packet assembly
- is covered by the final packet manifest and SHA-256 approval hash

An evidence-kind label is metadata, not proof of what the file contains. Drafting instructions must not claim an enclosure proves a fact unless the application has intentionally inspected and validated that content.

## Drafting contract

Draft instructions must explicitly prohibit the most likely dangerous overclaims for that notice.

Examples:

- do not invent payment history
- do not invent tax figures
- do not invent reasons for a missed payment
- do not invent eligibility for hardship/OIC/installment treatment
- do not promise IRS acceptance
- do not claim a letter stops collection
- do not claim a generic response is a formal appeal

## Approval and fulfillment contract

No workflow-specific code may bypass the shared immutable approval path.

Approval binds:

- exact rendered response
- exact included supporting documents
- recipient
- mail class
- actual page counts
- server quote
- packet manifest
- packet SHA-256

Checkout must rematerialize the approved packet and refuse changed hash, manifest, pages, or price.

## Required test gate

`apps/mailmypdf/tests/notice-workflow-factory.test.ts` verifies that every registry ID has a corresponding executable runtime and input schema and that runtime response modes match registry modes.

The generic route must continue to dispatch through `isNoticeWorkflowId()` rather than accumulating notice-specific route branches.

## Adding the next workflow

Use this sequence:

1. Research the current official IRS authority for the notice.
2. Author and review the workflow's substantive `config.ts` and Notice Respond profile.
3. Add a colocated `workflow.spec.json` describing canonical identity, execution binding, authority metadata, and the Notice Respond start template.
4. Run `pnpm workflow:materialize` to enroll the canonical seed and create the deterministic TanStack/SEO/schema/start wrappers. Use `--adopt` only when intentionally converting an already-reviewed hand-authored wrapper.
5. Add or refine notice-specific bounded fields, analysis instructions, drafting constraints, and evidence rules in the shared profile/runtime family.
6. Run `pnpm workflow:materialize:check`, the shared workflow tests, Notice Respond verification, secure workflow invariant suite, and the MailMyPDF production build.
7. Publish only after the workflow spec, authority copy, runtime behavior, and generated files all pass review and CI.

## Current executable IRS notice workflows

At the time this factory contract was added:

- CP14 response
- CP2000 response
- CP504 response
- CP523 response

The next workflow should be added through this contract rather than by cloning the component or checkout path.
