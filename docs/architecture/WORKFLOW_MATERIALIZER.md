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

## Current start templates

### notice-response

The Notice Respond template resolves the shared Notice Respond factory artifact and passes its generated `startConfig` to the shared workflow UI. The web start route and ChatGPT execution binding consequently resolve the same manifest/runtime/profile identity.

CP2000 is the first workflow fully adopted by the route materializer. CP14 established the underlying factory-artifact pattern.

## Expansion rule

Add new start templates only at the family level. Do not add workflow-id branches to the materializer.

The next intended families are:

- insurance / SSDI appeal
- records request

A family template is ready only when it can resolve a shared factory artifact or equivalent generated execution contract without embedding workflow-specific business logic in the route generator.
