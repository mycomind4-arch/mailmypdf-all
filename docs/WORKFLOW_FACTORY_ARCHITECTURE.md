# MailMyPDF workflow factory architecture

## Product boundaries

MailMyPDF is the ecosystem core. It owns identity, organizations, entitlements,
transactional billing, document mailing, tracking, and proof. Every product uses
that account; no vertical creates a competing account or billing model.

MailMyPDF Platform is the headless shared layer. Its Vertical Foundry coordinates
research, specifications, approval, cost controls, agents, QA, and repository
installation. It is not a second user interface and it never makes consequential
changes without a recorded approval.

Private Office is the operator control plane. It hosts the authenticated Workflow
Build Console: the place an authorized operator conducts the intake conversation,
reviews the generated workflow specification, approves it, and watches the run.

GovReply is the public-facing government-correspondence experience. It helps people
understand and prepare a response to official correspondence, preserves evidence and
deadlines, and can flag process concerns. It must not present legal advice or make
legal conclusions.

Small Business is the business-correspondence experience. It uses the same identity,
document, mailing, evidence, and workflow contracts while presenting business-specific
workflows.

Each specialized vertical is an independently deployable user experience containing
domain-specific workflow packs. A workflow is the unit of generation and installation;
creating a new vertical is a separate, later capability.

## Source-of-truth rule

`mailmypdf-all` is the canonical development workspace. Its packages are shared
infrastructure and its `apps/verticals/*` directories are canonical workflow sources.
Standalone repositories are release targets or historical copies until an explicit,
tested synchronization policy is adopted.

## Workflow Build Console lifecycle

```text
Private Office (admin only)
  conversation -> validated workflow build spec -> explicit approval
  -> Vertical Foundry dispatch -> QA -> tested pull request -> install record
```

The build spec includes the target vertical and repository, canonical route, workflow
manifest, domain-pack requirements, primary sources, deadline logic, evidence model,
branching, document outputs, search intent, acceptance tests, and a cost ceiling.

Every spec has a canonical hash. Approval binds an administrator, timestamp, and that
exact hash. A material edit changes the hash and invalidates approval. Foundry dispatch
must reject an unapproved or over-budget spec.

## Safety rules

- Console actions are authorized server-side; client-side role checks are never enough.
- Claude is the primary model provider and Gemini is the fallback. Calls are capability
  based and capture provider, model, prompt version, schema version, retries, fallback
  reason, source provenance, and cost.
- Consequential facts must be backed by a primary source. Models may identify questions
  and summarize sources, but cannot invent rules, deadlines, fees, addresses, or forms.
- Provider failures, timeouts, and malformed structured output may trigger fallback.
  Disagreement with an answer may not.
- The budget is checked before dispatch and after every cost entry. Exceeding the ceiling
  pauses the run; it never silently continues.
- Idempotency keys are scoped to the approved spec and target repository. A retry must
  resume or return the existing run rather than create a duplicate pull request.
- A dry-run result is a rehearsal, never an installation.

## Delivery order

1. Establish workflow-level spec, approval, budget, and idempotency contracts in
   Vertical Foundry.
2. Persist those records and enforce the Private Office administrator boundary.
3. Build the conversational console and live run history.
4. Connect narrowly scoped agents, source validation, and provider provenance.
5. Add repository installation, test verification, and real pull-request reporting.

No stage is considered complete merely because it produces generated files. The final
proof is a reviewed workflow-specific pull request with passing tests, recorded
approval, cost, provenance, and installation evidence.
