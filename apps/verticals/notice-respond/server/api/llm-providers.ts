/**
 * GET /api/llm-providers
 * Returns the list of configured LLM providers and the default.
 */
import { defineEventHandler } from "h3";
import { getAvailableProviders } from "../../src/platform/llm-service";

export default defineEventHandler(() => {
  const providers = getAvailableProviders();
  return {
    providers,
    default: providers[0] ?? null,
    available: providers.length > 0,
  };
});
