# Code Enforcement AI Architecture

Code Enforcement is multi-LLM capable by design. The workflow must not hard-code a single model vendor.

The platform already defines a provider-agnostic AI contract: an AI task has an input and output schema, and an AI result records confidence, model, task ID, sources, and warnings. fileciteturn226file0

Records Requests adds an orchestration boundary that can run multiple providers concurrently, retain every result, measure agreement, select the highest-confidence result from the consensus group, and fail closed when the required provider quorum is not reached.

## Intended provider set

The runtime may inject any approved providers, including OpenAI, Anthropic, Google, local/self-hosted models, or future providers. Provider credentials and SDKs stay outside the workflow domain.

## Task classes

Use separate model tasks for:

- document classification
- entity extraction
- date/event extraction
- case-number/property/APN extraction
- contradiction detection
- production-gap analysis
- redaction/withholding review
- follow-up strategy drafting
- request drafting
- final quality review

## Model routing

Do not automatically send every document to every model. The orchestration layer should support policy-based routing by task, document sensitivity, cost, latency, and required confidence.

For high-consequence findings, prefer multi-provider agreement and preserve disagreement as an explicit uncertainty signal.

## Deterministic-first rule

LLMs supplement, never replace, deterministic checks. Hashes, ownership, request state transitions, date parsing, policy lookup, evidence references, and fulfillment idempotency remain deterministic.

## Provenance

Every material AI result must retain:

- provider
- model
- task ID
- confidence
- warnings
- source record identifiers
- prompt/task version when available

The UI should distinguish model inference from source-backed facts.
