# ADR-010: Claude default provider

Claude is the default provider for new analysis and drafting runs. Gemini and OpenAI remain provider-neutral fallbacks or independent-review providers. Workflow/domain code must use the shared provider abstraction; provider credentials remain server-side and every run records provider/model provenance. `LLM_PROVIDER` may explicitly override the default for a deployment.
