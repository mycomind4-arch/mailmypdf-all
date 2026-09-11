# Claude-first route migration status

The shared provider policy is Claude-first with Gemini/OpenAI fallback. A route is
not migration-complete while it directly calls a provider endpoint or requires
`gemini` in its control-plane response.

Migrated and pushed:

- Appeal Mail: denied-claim
- Appeal Mail: ssdi-denial
- Appeal Mail: insurance-claim-denial
- Appeal Mail: claim-denial-letter
- Appeal Mail: generic `$workflowId` analyze/draft routes
- Benefits Appeal: dynamic analyze/draft routes
- Insurance Claims: generic `$workflowId` analyze route

The current audit reports 60 remaining legacy Gemini-bound Appeal Mail route files;
all other scanned verticals report zero legacy route files. This is a migration
inventory, not a claim that every route is production-ready.

Run the audit from the repository root:

```sh
node scripts/claude-route-audit.mjs
```

The output is intentionally evidence-based. It reports legacy routes but does not
claim they are secure or complete. Minified legacy routes require individual review
before conversion; blind search-and-replace is prohibited because it can bypass
document handling, validation, authentication, or fulfillment invariants.
