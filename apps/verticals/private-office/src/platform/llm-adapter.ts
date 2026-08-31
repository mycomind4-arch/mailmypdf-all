/**
 * Provider-agnostic LLM adapter for Private Office.
 *
 * Architecture:
 *   Workflow / Analysis / Draft
 *           ↓
 *       LLM Adapter
 *           ↓
 *   ┌──────┼──────────┐
 *   │      │          │
 * Gemini  OpenAI   Future
 * (default)
 *
 * The LLM proposes information. The deterministic application validates and
 * controls state. The human approves consequential correspondence.
 *
 * The LLM must NEVER directly control:
 * - authorization, approval, payment, fulfillment
 * - matter state transitions
 * - consequential mailing
 */

import { z } from "zod";

// ── Provenance ──────────────────────────────────────────────────────────

export interface LLMProvenance {
  /** Provider identifier: "gemini", "openai", etc. */
  provider: string;
  /** Model identifier used for generation */
  model: string;
  /** ISO-8601 generation timestamp */
  generatedAt: string;
  /** SHA-256 hash of the input that produced this artifact */
  inputHash: string;
  /** Prompt version identifier used for this generation */
  promptVersion?: string;
}

// ── Request / Response ───────────────────────────────────────────────────

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  /** Max output tokens (provider-specific default if omitted) */
  maxTokens?: number;
  /** Temperature (0–1, provider-specific default if omitted) */
  temperature?: number;
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
  /** Prompt version identifier for provenance tracing */
  promptVersion?: string;
}

export interface LLMResponse {
  content: string;
  provenance: LLMProvenance;
}

// ── Adapter Interface ────────────────────────────────────────────────────

export interface LLMAdapter {
  readonly provider: string;
  generate(request: LLMRequest): Promise<LLMResponse>;
}

// ── Errors ──────────────────────────────────────────────────────────────

/** Error codes that are genuinely retryable (transient failures). */
const RETRYABLE_CODES = new Set([
  "RESOURCE_EXHAUSTED",
  "UNAVAILABLE",
  "INTERNAL",
  "NETWORK_ERROR",
  "TIMEOUT",
]);

/** Error codes that should NOT be retried (permanent/client failures). */
const NON_RETRYABLE_CODES = new Set([
  "INVALID_ARGUMENT",
  "PERMISSION_DENIED",
  "NOT_FOUND",
  "FAILED_PRECONDITION",
  "EMPTY_RESPONSE",
  "NO_API_KEY",
  "PROVIDER_NOT_SUPPORTED",
  "SAFETY_BLOCKED",
  "MALFORMED_JSON",
  "SCHEMA_INVALID",
]);

export class LLMError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly code?: string,
    readonly timeout?: boolean,
  ) {
    super(message);
    this.name = "LLMError";
  }

  /** Returns true if this error is a transient failure worth retrying. */
  isRetryable(): boolean {
    if (this.code && RETRYABLE_CODES.has(this.code)) return true;
    if (this.code && NON_RETRYABLE_CODES.has(this.code)) return false;
    // Unknown errors default to non-retryable for safety.
    return false;
  }
}

// ── Hash helper (shared with draft-provenance for input hashing) ─────────

export async function hashInput(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Structured Output Schemas ───────────────────────────────────────────
//
// These schemas define the contract for LLM-generated artifacts.
// Every LLM output must be parsed through the appropriate schema before
// entering domain state. Malformed or schema-invalid output is rejected.

/** LLM-generated understanding of a document or matter. */
export const llmUnderstandingSchema = z.object({
  summary: z.string().min(1),
  keyIssues: z.array(z.string()).default([]),
  documentType: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type LLMUnderstanding = z.infer<typeof llmUnderstandingSchema>;

/** LLM-generated evidence assessment. */
export const llmEvidenceSchema = z.object({
  assessments: z
    .array(
      z.object({
        evidenceId: z.string(),
        relevance: z.enum(["high", "medium", "low"]),
        notes: z.string(),
      }),
    )
    .default([]),
  missingEvidence: z.array(z.string()).default([]),
});
export type LLMEvidence = z.infer<typeof llmEvidenceSchema>;

/** LLM-generated strategy suggestions. */
export const llmStrategySchema = z.object({
  suggestions: z
    .array(
      z.object({
        point: z.string().min(1),
        rationale: z.string(),
        priority: z.enum(["high", "medium", "low"]),
      }),
    )
    .default([]),
  risks: z
    .array(
      z.object({
        title: z.string(),
        severity: z.enum(["high", "medium", "low"]),
        detail: z.string(),
      }),
    )
    .default([]),
});
export type LLMStrategy = z.infer<typeof llmStrategySchema>;

/** LLM-generated authority research result. */
export const llmAuthoritySchema = z.object({
  researchPerformed: z.boolean(),
  citations: z
    .array(
      z.object({
        title: z.string(),
        type: z.enum(["statute", "case", "regulation", "guidance", "article"]),
        reference: z.string(),
        summary: z.string(),
        url: z.string().url().optional(),
      }),
    )
    .default([]),
  disclaimer: z.string(),
});
export type LLMAuthority = z.infer<typeof llmAuthoritySchema>;

/** LLM-generated draft correspondence. */
export const llmDraftSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  suggestedFacts: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .default([]),
});
export type LLMDraft = z.infer<typeof llmDraftSchema>;

/**
 * Parse and validate LLM output as JSON against a structured schema.
 * Throws if the content is not valid JSON or fails schema validation.
 */
export function parseStructuredOutput<T>(
  content: string,
  schema: z.ZodType<T>,
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new LLMError(
      "LLM output is not valid JSON",
      "structured-output",
      "MALFORMED_JSON",
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new LLMError(
      `LLM output failed schema validation: ${result.error.issues.map((i) => i.message).join("; ")}`,
      "structured-output",
      "SCHEMA_INVALID",
    );
  }
  return result.data;
}

// ── Bounded Retry ────────────────────────────────────────────────────────

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 2) */
  maxRetries: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 1000,
};

/**
 * Generate with bounded retry behavior.
 * Only genuinely retryable errors (rate limits, timeouts, network errors)
 * are retried. Non-retryable errors (invalid argument, schema violations)
 * fail immediately. Retries use exponential backoff.
 */
export async function generateWithRetry(
  adapter: LLMAdapter,
  request: LLMRequest,
  retryConfig?: Partial<RetryConfig>,
): Promise<LLMResponse> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: LLMError | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await adapter.generate(request);
    } catch (err: unknown) {
      if (err instanceof LLMError) {
        lastError = err;
        if (!err.isRetryable() || attempt >= config.maxRetries) {
          throw err;
        }
        // Exponential backoff: baseDelay * 2^attempt
        const delay = config.baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Non-LLM errors are not retried
        throw err;
      }
    }
  }

  // Should not reach here, but TypeScript needs it
  throw lastError ?? new LLMError("Unknown retry failure", adapter.provider, "UNKNOWN");
}

// ── Factory ─────────────────────────────────────────────────────────────

import { GeminiAdapter } from "./gemini-adapter";

let cachedAdapter: LLMAdapter | null = null;

/**
 * Returns the configured LLM adapter. Defaults to Gemini.
 * Selection via LLM_PROVIDER environment variable.
 * Returns null when no provider is configured (rule-based path is used).
 */
export function getLLMAdapter(): LLMAdapter | null {
  if (cachedAdapter !== null) return cachedAdapter;

  const provider = process.env.LLM_PROVIDER ?? "gemini";
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    // No credentials configured — use rule-based path
    return null;
  }

  if (provider === "gemini") {
    cachedAdapter = new GeminiAdapter({
      apiKey,
      model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
      apiUrl: process.env.GEMINI_API_URL,
    });
    return cachedAdapter;
  }

  // Future providers: add openai, anthropic, etc. here
  throw new LLMError(
    `LLM provider "${provider}" is not configured`,
    provider,
    "PROVIDER_NOT_SUPPORTED",
  );
}

/**
 * Test-only: inject a custom adapter (e.g. a mock).
 */
export function _setLLMAdapter(adapter: LLMAdapter | null): void {
  cachedAdapter = adapter;
}

/**
 * Test-only: reset the cached adapter.
 */
export function _resetLLMAdapter(): void {
  cachedAdapter = null;
}
