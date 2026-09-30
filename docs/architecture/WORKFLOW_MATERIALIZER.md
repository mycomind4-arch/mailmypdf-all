# Workflow materializer

The workflow materializer converts one colocated workflow specification into the deterministic repository surfaces that should never require hand-editing.

## Contract

A workflow spec lives beside the workflow:

`<section>/workflows/<workflow-id>/workflow.spec.json`

The spec owns:

- canonical workflow id and label
- execution binding
- authority-review metadata already accepted for that workflow
- legacy content alias when one still exists
- the static start-template family

The spec does **not** own substantive public copy. `config.ts` remains reviewed editorial/authority content and must already exist before the materializer will run.

## Generated surfaces

For a supported executable workflow, the materializer owns:

- the canonical seed in `packages/workflows/src/canonical-workflows.json`
- the top-level workflow landing wrapper
- `seo.ts`
- `schema.ts`
- the top-level start-route wrapper
- the MailMyPDF host landing-route mount
- the MailMyPDF host start-route mount
- the derived `mailmypdf/WORKFLOW_INVENTORY.json` when canonical enrollment changes

Generated files carry an ownership header. The write command refuses to replace a hand-authored wrapper unless `--adopt` is explicitly supplied.

## Commands

Check every materialized workflow:

`pnpm workflow:materialize:check`

Write new or changed materializer-owned outputs:

`pnpm workflow:materialize`

To intentionally convert an existing reviewed wrapper to materializer ownership:

`pnpm workflow:materialize -- --adopt`

The normal CI registry job runs the check command. Generated wrapper drift therefore fails before merge.

## Supervised factory builds

The persistent Factory Job orchestrator now has a first local build adapter for the `records-request` template family.

A reviewer-approved build request supplies only the family, workflow id, and label. The executor creates a **non-indexable scaffold** `config.ts`, a colocated `workflow.spec.json`, and a generated Records Request profile in a machine-owned registry. It then runs this materializer inside an isolated branch/worktree.

Generated family profiles are separate from the hand-authored core profile list. They inherit the same shared Records Request manifest/runtime/chat contract, and the executor proves the exact new canonical ID is chat-certified before the job can reach publication review.

The build executor does not push or publish its branch. The publication/PR executor is a separate boundary.

## Current start templates

### notice-response

The Notice Respond template resolves the shared Notice Respond factory artifact and passes its generated `startConfig` to the shared workflow UI. The web start route and ChatGPT execution binding consequently resolve the same manifest/runtime/profile identity.

CP2000 is the first workflow fully adopted by the route materializer. CP14 established the underlying factory-artifact pattern.

### records-request

The Records Request template resolves the shared Records Request factory artifact and passes its generated `startConfig` to the shared request-first UI. The same artifact owns the generated manifest and runtime policy used by ChatGPT certification.

Public Records Request is the second-family proof. Its canonical seed, landing/SEO/schema wrappers, both start mounts, local manifest projection, web start configuration, and ChatGPT execution binding now converge on the same factory artifact.

## Expansion rule

Add new start templates only at the family level. Do not add workflow-id branches to the materializer.

The next intended family is:

- SSA reconsideration / SSDI appeal

A family template is ready only when it can resolve a shared factory artifact or equivalent generated execution contract without embedding workflow-specific business logic in the route generator.


## SSA reconsideration boundary

SSA reconsideration now has a shared profile registry, generated manifest, factory artifact, and runtime chat contract for both SSDI and SSI. The canonical chat registry resolves the family through that artifact, and the local workflow manifest/runtime modules project it instead of owning separate contracts.

The remaining materializer blocker is the web start implementation: SSDI and SSI still use large workflow-specific components rather than one thin shared family shell driven by the artifact's `startConfig`. Build that shared start shell first. Then add one family-level `ssa-reconsideration` materializer template and adopt the static SSDI/SSI route wrappers; do not add workflow-id branches to the generator.
