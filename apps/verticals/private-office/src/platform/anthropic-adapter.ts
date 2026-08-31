/**
 * Anthropic LLM adapter — optional provider for Private Office.
 *
 * Uses the Anthropic Messages REST API directly (no SDK dependency).
 *
 * Docs: https://docs.anthropic.com/en/api/messages
 */

import {
  type LLMAdapter,
  type LLMRequest,
  type LLMResponse,
  type LLMProvenance,
  LLMError,
  hashInput,
} from "./llm-adapter";

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  apiUrl?: string;
}

const DEFAULT_API_URL = "https://api.anthropic.com";
const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const ANTHROPIC_VERSION = "2023-06-01";

export class AnthropicAdapter implements LLMAdapter {
  readonly provider = "anthropic";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl: string;

  constructor(config: AnthropicConfig) {
    if (!config.apiKey.trim())
      throw new LLMError("Anthropic API key is required", "anthropic", "NO_API_KEY");
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_MODEL;
    this.apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const timeoutMs = request.timeoutMs ?? 30000;
    const inputHash = await hashInput(
      `${request.systemPrompt}\n${request.userPrompt}`,
    );

    const url = `${this.apiUrl}/v1/messages`;

    const body = {
      model: this.model,
      system: request.systemPrompt,
      messages: [
        { role: "user", content: request.userPrompt },
      ],
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.7,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new LLMError(
          `Anthropic request timed out after ${timeoutMs}ms`,
          "anthropic",
          "TIMEOUT",
          true,
        );
      }
      throw new LLMError(
        `Anthropic request failed: ${(err as Error).message}`,
        "anthropic",
        "NETWORK_ERROR",
      );
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      let code: string | undefined;
      let message = `Anthropic request failed (${response.status})`;
      try {
        const errorBody = await response.json();
        const errorObj = (errorBody as { error?: { message?: string; type?: string } }).error;
        if (errorObj) {
          message = errorObj.message ?? message;
          code = errorObj.type;
        }
      } catch {
        // ignore parse failure
      }
      throw new LLMError(message, "anthropic", code);
    }

    const data = await response.json();
    const content = extractContent(data);
    if (!content) {
      throw new LLMError(
        "Anthropic returned no content",
        "anthropic",
        "EMPTY_RESPONSE",
      );
    }

    const provenance: LLMProvenance = {
      provider: "anthropic",
      model: this.model,
      generatedAt: new Date().toISOString(),
      inputHash,
    };

    return { content, provenance };
  }
}

function extractContent(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const block = obj.content?.find((b) => b.type === "text");
  if (!block) return null;
  const text = block.text;
  return typeof text === "string" ? text.trim() : null;
}
