# Notice Respond Workflow Factory

Notice Respond is the reference implementation for the ecosystem's master-workflow architecture.

## Goal

A workflow is not merely an SEO page. A production workflow owns a search-intent cluster and the complete path from the user's problem to a reviewed, evidence-grounded response and documented submission.

```text
Search intent
  -> canonical workflow page
  -> intake / document recognition
  -> fact extraction
  -> deadline + requirement analysis
  -> evidence + contradiction analysis
  -> research
  -> response strategy
  -> drafting
  -> draft validation
  -> user review
  -> submission / mailing
  -> proof
```

## Shared contract

`src/domain/workflow-definition.ts` defines the reusable contract. Each workflow declares its own search intents, document profiles, deadlines, requirements, evidence, analysis plan, drafting rules, submission rules, capability packs, and quality gate.

## Catalog

`src/domain/workflow-catalog.ts` is the Notice Respond master catalog. It currently contains the existing functional workflows plus the CP2000 blueprint.

A workflow may be:

- `blueprint`: discoverable internally but not represented as production-ready;
- `functional`: usable end-to-end with the current product capabilities;
- `authority`: validated against the complete quality gate and suitable to be treated as the canonical best-in-class workflow for its search cluster.

## Quality gate

A workflow is only considered authority-grade when document recognition, fact grounding, deadline verification, requirement coverage, evidence grounding, draft validation, submission readiness, and proof readiness are all verified.

The catalog deliberately allows incomplete gates so development can proceed without falsely labeling unfinished workflows as production-ready.

## Migration rule

Existing routes do not need to be rewritten all at once. Migrate one workflow at a time so the current product keeps working while the definition becomes the source of truth for metadata, requirements, tests, and eventually runtime orchestration.
