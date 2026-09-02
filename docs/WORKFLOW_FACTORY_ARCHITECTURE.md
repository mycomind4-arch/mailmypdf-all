-branching, document outputs, search intent, acceptance tests, and a cost ceiling.

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
