/**
 * Gemini LLM adapter — default provider for Private Office.
 *
 * Uses the Google Generative Language REST API directly (no SDK dependency)
 * to keep the dependency footprint minimal.
 *
 * Docs: https://ai.google.dev/api/rest/v1beta/models/generateContent
 */

import {
  type LLMAdapter,
  type LLMRequest,
  type LLMResponse,
  type LLMProvenance,
  LLMError,
  hashInput,
} from "./llm-adapter";

export interface GeminiConfig {
  apiKey: string;
  model: string;
  apiUrl?: string;
}

const DEFAULT_API_URL = "https://generativelanguage.googleapis.com";

export class GeminiAdapter implements LLMAdapter {
  readonly provider = "gemini";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl: string;

  constructor(config: GeminiConfig) {
    if (!config.apiKey.trim())
      throw new LLMError("Gemini API key is required", "gemini", "NO_API_KEY");
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const timeoutMs = request.timeoutMs ?? 30000;
    const inputHash = await hashInput(
      `${request.systemPrompt}\n${request.userPrompt}`,
    );

    const url = `${this.apiUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body = {
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: request.userPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new LLMError(
          `Gemini request timed out after ${timeoutMs}ms`,
          "gemini",
          "TIMEOUT",
          true,
        );
      }
      throw new LLMError(
        `Gemini request failed: ${(err as Error).message}`,
        "gemini",
        "NETWORK_ERROR",
      );
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      let code: string | undefined;
      let message = `Gemini request failed (${response.status})`;
      try {
        const errorBody = await response.json();
        const errorObj = (errorBody as { error?: { message?: string; status?: string } }).error;
        if (errorObj) {
          message = errorObj.message ?? message;
          code = errorObj.status;
        }
      } catch {
        // ignore parse failure
      }
      throw new LLMError(message, "gemini", code);
    }

    const data = await response.json();
    const content = extractContent(data);
    if (!content) {
      throw new LLMError(
        "Gemini returned no generatable content",
        "gemini",
        "EMPTY_RESPONSE",
      );
    }

    const provenance: LLMProvenance = {
      provider: "gemini",
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
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  const candidate = obj.candidates?.[0];
  if (!candidate) return null;
  const text = candidate.content?.parts?.[0]?.text;
  return typeof text === "string" ? text.trim() : null;
}
