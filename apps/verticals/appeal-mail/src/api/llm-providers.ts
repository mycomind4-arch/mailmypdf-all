/**
 * Server route: GET /api/llm-providers
 *
 * Returns the list of available LLM providers and their availability status.
 */

import { createServerFn } from "@tanstack/react-start";
import { getAvailableProviders, type LLMProvider } from "@/platform/llm-service";

interface ProviderInfo {
  id: LLMProvider;
  label: string;
  description: string;
  available: boolean;
}

export const getLLMProviders = createServerFn().handler(async () => {
  const available = getAvailableProviders();

  const allProviders: ProviderInfo[] = [
    {
      id: "gemini",
      label: "Google Gemini",
      description: "Fast, efficient analysis",
      available: available.includes("gemini"),
    },
    {
      id: "claude",
      label: "Anthropic Claude",
      description: "Deep reasoning, nuanced drafting",
      available: available.includes("claude"),
    },
    {
      id: "openai",
      label: "OpenAI GPT-4o",
      description: "Versatile, well-rounded",
      available: available.includes("openai"),
    },
  ];

  return allProviders;
});
