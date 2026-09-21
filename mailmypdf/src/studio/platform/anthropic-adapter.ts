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
  type LLMToolCall,
  LLMError,
  hashInput,
} from "./llm-adapter";

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  apiUrl?: string;
}

const DEFAULT_API_URL = "https://api.anthropic.com";
const ANTHROPIC_VERSION = "2023-06-01";

export class AnthropicAdapter implements LLMAdapter {
  readonly provider = "anthropic";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl: string;

  constructor(config: AnthropicConfig) {
    if (!config.apiKey.trim())
      throw new LLMError("Anthropic API key is required", "anthropic", "NO_API_KEY");
    if (!config.model.trim())
      throw new LLMError(
        "Anthropic model is required",
        "anthropic",
        "INVALID_ARGUMENT",
      );
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const timeoutMs = request.timeoutMs ?? 30000;
    const inputHash = await hashInput(
      `${request.systemPrompt}\n${request.userPrompt}`,
    );

    const url = `${this.apiUrl}/v1/messages`;

    const tools = request.tools?.map((tool) => {
      if (tool.type === "web_search") {
        // Anthropic's server-side web search tool: the API itself performs the
        // search and feeds results back into the same turn, no client-side
        // tool-result round trip needed.
        return { type: "web_search_20250305", name: "web_search" };
      }
      throw new LLMError(
        `Anthropic adapter does not support tool type "${(tool as { type: string }).type}"`,
        "anthropic",
        "INVALID_ARGUMENT",
      );
    });

    const body = {
      model: this.model,
      system: request.systemPrompt,
      messages: [
        { role: "user", content: request.userPrompt },
      ],
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.7,
      ...(tools?.length ? { tools } : {}),
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

    const toolCalls = extractToolCalls(data);
    return { content, provenance, ...(toolCalls.length ? { toolCalls } : {}) };
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

/** Pulls out any server_tool_use / web_search_tool_result blocks Claude produced. */
function extractToolCalls(data: unknown): LLMToolCall[] {
  if (!data || typeof data !== "object") return [];
  const obj = data as {
    content?: Array<{ type?: string; name?: string; input?: unknown; content?: unknown }>;
  };
  const calls: LLMToolCall[] = [];
  for (const block of obj.content ?? []) {
    if (block.type === "server_tool_use") {
      calls.push({ tool: block.name ?? "unknown", input: block.input });
    } else if (block.type === "web_search_tool_result") {
      const resultCount = Array.isArray(block.content) ? block.content.length : undefined;
      calls.push({
        tool: "web_search",
        resultSummary: resultCount !== undefined ? `${resultCount} result(s)` : undefined,
      });
    }
  }
  return calls;
}
