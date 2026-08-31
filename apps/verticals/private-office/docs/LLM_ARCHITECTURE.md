# Multi-LLM Intelligence Architecture

## Overview

Private Office's workflow engine uses a **provider-neutral, Gemini-first, multi-LLM Gold Standard intelligence architecture**. LLM intelligence is advisory — it can recommend, extract, classify, reconcile, and draft, but it **cannot independently authorize consequential actions**. The domain's deterministic safety and human-approval architecture remains firmly in control.

## Architecture

```
Private Office Workflow
        ↓
Gold Standard Intelligence Layer (shared)
        ↓
LLM Orchestrator / Router
        ↓
Provider Router (fallback, consensus)
        ↓
┌───────────────┬───────────────┬───────────────┐
│ Gemini        │ OpenAI        │ Anthropic     │
│ DEFAULT       │ optional      │ optional      │
└───────────────┴───────────────┴───────────────┘
        ↓
Structured Output Validation (Zod)
        ↓
LLM Reconciliation (conflict detection, fact protection)
        ↓
Evidence / Fact / Authority Provenance
        ↓
Deterministic Gold Standard Engine (authoritative)
        ↓
Human Review → Approval → Payment → Mailing → Proof
```

## Gemini Default

Gemini is the default provider. Provider selection is centralized in `llm-config.ts` and configured via environment variables — no workflow code changes needed.

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.0-flash
```

The domain is provider-neutral. OpenAI and Anthropic are supported through the same `LLMAdapter` interface. Adding a new provider requires only implementing the adapter and adding it to the router.

## Provider Contract

All providers implement the `LLMAdapter` interface:

```ts
interface LLMAdapter {
  readonly provider: string;
  generate(request: LLMRequest): Promise<LLMResponse>;
}
```

Every provider returns the same normalized `LLMResponse` with `content` and `provenance`. The domain never depends on provider-specific response formats.

## Provider Router

The router (`llm-router.ts`) handles:
- Default provider selection (Gemini)
- Explicit provider overrides
- Fallback chain (Gemini → OpenAI → Anthropic)
- Consensus mode (call all, collect responses)
- Retry policy
- Full provenance recording (provider, model, promptVersion, inputHash, outputHash)
- Fallback chain tracking (never silently switches providers)

## Fallback Strategy

Fallback is explicit and auditable:

```
Gemini (requested) → failed → OpenAI (fallback) → successful
```

The provenance records the complete chain:
- `provider`: "openai" (the provider that succeeded)
- `fallbackUsed`: true
- `fallbackChain`: ["gemini", "openai"]

## Consensus

For high-value analysis, multiple providers can be consulted:

```
Gemini ─────┐
OpenAI ─────┼→ reconciliation
Anthropic ──┘
```

The reconciliation layer distinguishes:
- **confirmed**: all providers agree
- **conflicting**: providers disagree
- **requires_verification**: partial agreement
- **provider_specific**: only one provider made the claim
- **unsupported**: no provider support

## Intelligence Modes

| Mode | Providers | Consensus | Fallback |
|------|-----------|-----------|----------|
| standard | Gemini | No | No |
| enhanced | Gemini | No | Yes |
| consensus | Gemini + OpenAI | Yes | Yes |
| maximum-assurance | Gemini + OpenAI + Anthropic | Yes | Yes |

Operation-level policies control cost:
- Classification, extraction, timeline, strategy, draft: standard (Gemini only)
- Risk analysis: enhanced (Gemini + fallback)
- Reconciliation: consensus (multi-provider)

## Fact Protection

LLM output **never overwrites user-provided facts**. If the LLM says "March 12" but the user said "March 15", the system produces:

```
CONFLICT
user_provided: March 15
llm_generated: March 12
status: requires_verification
```

This flows into the deterministic blocking system as a `requires_verification` finding, which blocks approval until resolved.

## Structured Output

All LLM output is validated against Zod schemas:
- Classification, fact extraction, finding, timeline, risk, strategy, draft assistance
- Invalid output is rejected — the workflow continues with deterministic analysis only

## Provenance

Every accepted LLM result contains:
- `provider`, `model`, `promptVersion`
- `inputHash`, `outputHash`
- `operation`, `workflowId`, `matterId`
- `fallbackUsed`, `fallbackChain`
- `generatedAt`, `durationMs`

## Security

- LLM calls are **server-side only** — never expose provider credentials to the browser
- **Matter isolation**: LLM requests for Matter A never contain Matter B data
- **Prompt injection defense**: system prompt instructs not to follow document instructions; document text is isolated in user prompt
- **Secret exposure prevention**: API keys never appear in prompts; document text is truncated to prevent oversized prompts
- **Malicious document defense**: deterministic gates remain authoritative regardless of LLM output

## Workflow Factory Integration

Every workflow automatically inherits the multi-LLM stack through the shared `runProfiledWorkflow` function:

```
register workflow → define facts/evidence/authority → inherit Gold Standard LLM stack
```

No workflow-specific LLM implementations are needed.

## Adding a Provider

1. Implement `LLMAdapter` in `src/platform/<provider>-adapter.ts`
2. Add the provider ID to `LLMProviderId` in `llm-types.ts`
3. Register the adapter in `createAdapter()` in `llm-router.ts`
4. Add environment variables to `.env.example`
5. Add provider config parsing to `buildProviderConfigs()` in `llm-config.ts`

## Environment Variables

See `.env.example` for the complete list. Key variables:
- `LLM_PROVIDER` — default provider (gemini)
- `LLM_INTELLIGENCE_MODE` — intelligence mode (standard/enhanced/consensus/maximum-assurance)
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — provider credentials
- `LLM_FALLBACK_ENABLED` — enable/disable fallback
- `LLM_POLICY_*` — operation-level mode overrides

## Testing

The multi-LLM test suite covers:
- Provider adapters (Gemini, OpenAI, Anthropic)
- Router (default, explicit, fallback, consensus)
- Reconciliation (consensus, conflict detection, fact protection)
- Security (prompt injection, matter isolation, secret exposure)
- Workflow integrity (LLM cannot bypass gates, approve, authorize payment/mailing, fabricate proof)
- Provenance (provider, model, promptVersion, inputHash, outputHash)
- Regression (all existing tests continue passing)

Run: `npm test && npm run lint && npm run build && npm run verify:launch`
