# Multi-LLM requirements

Code Enforcement Records uses a provider-agnostic multi-LLM architecture.

## Rules

- No workflow may depend on one named model/provider for critical AI-derived conclusions.
- Critical classification, extraction, contradiction, and strategy tasks can require a configurable provider quorum.
- Provider failures are isolated and recorded.
- Disagreement is surfaced as uncertainty and can require human review; it must never be silently collapsed into certainty.
- Deterministic facts such as hashes, persisted identifiers, ownership, fulfillment state, and versioned policy are never delegated to an LLM.
- Every AI result must retain provider/model, confidence, task, warnings, and provenance metadata.
- Provider selection is configurable so additional providers can be added without changing workflow code.

## Initial policy

Use at least two providers for consequential analytical tasks. Use three when available for high-impact contradiction or strategy decisions. If the configured quorum cannot be met, fail closed for actions that could materially affect a user's case.
