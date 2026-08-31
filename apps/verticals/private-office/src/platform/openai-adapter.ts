/**
 * OpenAI LLM adapter — optional provider for Private Office.
 *
 * Uses the OpenAI Chat Completions REST API directly (no SDK dependency).
 *
 * Docs: https://platform.openai.com/docs/api-reference/chat/create
 */

import {
  type LLMAdapter,
  type LLMRequest,
  type LLMResponse,
  type LLMProvenance,
  LLMError,
  hashInput,
} from "./llm-adapter";

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  apiUrl?: string;
}

const DEFAULT_API_URL = "https://api.openai.com";
const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAIAdapter implements LLMAdapter {
  readonly provider = "openai";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl: string;

  constructor(config: OpenAIConfig) {
    if (!config.apiKey.trim())
      throw new LLMError("OpenAI API key is required", "openai", "NO_API_KEY");
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_MODEL;
    this.apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const timeoutMs = request.timeoutMs ?? 30000;
    const inputHash = await hashInput(
      `${request.systemPrompt}\n${request.userPrompt}`,
    );

    const url = `${this.apiUrl}/v1/chat/completions`;

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: request.systemPrompt },
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
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new LLMError(
          `OpenAI request timed out after ${timeoutMs}ms`,
          "openai",
          "TIMEOUT",
          true,
        );
      }
      throw new LLMError(
        `OpenAI request failed: ${(err as Error).message}`,
        "openai",
        "NETWORK_ERROR",
      );
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      let code: string | undefined;
      let message = `OpenAI request failed (${response.status})`;
      try {
        const errorBody = await response.json();
        const errorObj = (errorBody as { error?: { message?: string; code?: string } }).error;
        if (errorObj) {
          message = errorObj.message ?? message;
          code = errorObj.code;
        }
      } catch {
        // ignore parse failure
      }
      throw new LLMError(message, "openai", code);
    }

    const data = await response.json();
    const content = extractContent(data);
    if (!content) {
      throw new LLMError(
        "OpenAI returned no content",
        "openai",
        "EMPTY_RESPONSE",
      );
    }

    const provenance: LLMProvenance = {
      provider: "openai",
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
    choices?: Array<{
      message?: { content?: string };
      finish_reason?: string;
    }>;
  };
  const choice = obj.choices?.[0];
  if (!choice) return null;
  const text = choice.message?.content;
  return typeof text === "string" ? text.trim() : null;
}
