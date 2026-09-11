# Secure Claude workflow contract

This is the entry contract for new AI-powered workflows in `mailmypdf-all`.

## Required boundary

Workflow/domain code must call `@mailmypdf/ai`'s `createSecureAiGateway`. It must not import an Anthropic, Gemini, or OpenAI SDK, read provider keys, or call a provider from a browser route. Claude (`anthropic`) is the default provider; Gemini and OpenAI are explicit fallbacks or independent review providers.

Every request must include:

- an authenticated actor and case/matter ID;
- the `ai:execute` scope (or a deliberately narrower policy scope);
- `trustedInput: true` only after document ownership, malware, and size checks;
- a task kind, versioned prompt, bounded input, and an output validator;
- a provider-neutral policy with a bounded timeout, at most three attempts per provider, and an explicit fallback decision.

Document text is data, not instructions. Wrap extracted text with `markUntrustedDocumentText` and keep system/developer instructions separate. Never ask the model to decide authorization, deadlines, mailing eligibility, or whether a human review gate passed.

## Acceptance gates

The gateway rejects unauthorized, oversized, or untrusted requests; applies bounded timeouts and fallback; validates the structured result; and records provider, model, task, case, prompt version, input hash, output hash, fallback source, and timestamp. Deterministic code remains authoritative for validation, deadline arithmetic, discrepancies, approvals, and fulfillment.

Before a workflow is marked executable, add tests for:

1. Claude-first routing and a deterministic fallback;
2. missing scope, missing case context, oversized input, timeout, and invalid output;
3. provenance persistence without raw document text or secrets in logs;
4. human review before any consequential action;
5. a real document/case fixture and an end-to-end proof/tracking assertion.

Provider secrets must be server-side environment variables. Use `readServerSecret`; never use `NEXT_PUBLIC_*`, `VITE_*`, or other public-prefixed variables.
