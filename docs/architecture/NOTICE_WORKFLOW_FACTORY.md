# Executable IRS Notice Workflow Factory

This document defines the minimum contract for adding a new executable IRS notice workflow to MailMyPDF without forking the secure runtime.

## Goal

A new IRS notice should reuse the same protected lifecycle:

`authenticated case -> private upload -> malware scan -> analysis -> user facts -> evidence -> draft -> packet preview -> immutable approval -> checkout -> payment webhook -> mailing -> proof/status`

The workflow-specific layer should be configuration, validation, and instructions. Security, storage, approval, payment, and fulfillment remain shared.

## Source of truth

The executable registry lives at:

`apps/mailmypdf/src/lib/notice-workflow-registry.ts`

`NOTICE_WORKFLOW_IDS` is the permission boundary for the generic IRS notice route. A public SEO page or catalog entry alone does not make a workflow executable.

Every executable ID must have all of the following:

1. UI configuration in `NOTICE_WORKFLOW_CONFIGS`.
2. A runtime definition in `secure-core/workflow-runtime.ts`.
3. An input schema in `secure-core/case-inputs.server.ts`.
4. Evidence options in `components/workflows/irs-notice-workflow.tsx` until those options are moved into registry configuration.
5. Tests proving the registry/runtime/schema modes agree.

The TypeScript `Record<NoticeWorkflowId, ...>` contracts are intentional. Adding a registry ID should fail the build until every required executable layer is supplied.

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

1. Research the official IRS notice page.
2. Add the workflow ID and UI config to the executable registry.
3. Add/confirm evidence options.
4. Add the bounded input schema.
5. Add the runtime analysis and drafting instructions.
6. Add notice-specific tests for dangerous shortcuts and response-mode validation.
7. Run the factory contract test.
8. Run the secure workflow invariant suite.
9. Run the MailMyPDF build.
10. Push only when all gates are green.

## Current executable IRS notice workflows

At the time this factory contract was added:

- CP14 response
- CP2000 response
- CP504 response
- CP523 response

The next workflow should be added through this contract rather than by cloning the component or checkout path.
