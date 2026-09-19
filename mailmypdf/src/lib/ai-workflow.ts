/**
 * Shared AI Workflow Infrastructure
 *
 * Provides the reusable AI engine that verticals configure rather than
 * each vertical creating its own Claude client wrapper.
 *
 * Architecture:
 *   Verticals provide: prompts, schemas, configuration
 *   This module provides: Claude client, retries, timeouts,
 *   structured output, validation, logging, rate limiting, errors
 *
 * AI output must NEVER bypass human review for mailed documents.
 */

import { type AIWorkflow, type AIWorkflowInput, type AIAnalysisResult,
  type AIExtractedFacts, type AIDraftInput, type AIDraftResult,
  type AIValidationInput, type AIValidationResult, type AIReviseInput } from "@/verticals/types";
import { withRetry, type RetryOptions } from "@/lib/retry";
import { logger } from "@/lib/logger";

// ── Vertical AI Configuration ─────────────────────────────────────────────────

export interface VerticalAIConfig {
  /** The vertical slug this config belongs to */
  verticalSlug: string;
  /** System prompt for analysis */
  analysisSystemPrompt: string;
  /** System prompt for drafting */
  draftSystemPrompt: string;
  /** System prompt for validation */
  validationSystemPrompt: string;
  /** Zod schema name for structured output (if applicable) */
  outputSchema?: string;
  /** Max retries for AI calls */
  maxRetries?: number;
  /** Timeout in milliseconds */
  timeoutMs?: number;
}

// ── Registry of vertical AI configurations ────────────────────────────────────

const aiConfigs = new Map<string, VerticalAIConfig>();

/**
 * Register an AI configuration for a vertical.
 * Verticals call this at module load time.
 */
export function registerVerticalAI(config: VerticalAIConfig): void {
  aiConfigs.set(config.verticalSlug, config);
}

/**
 * Get the AI configuration for a vertical.
 * Throws if no config is registered.
 */
export function getVerticalAIConfig(slug: string): VerticalAIConfig {
  const config = aiConfigs.get(slug);
  if (!config) {
    throw new Error(`No AI configuration registered for vertical: ${slug}`);
  }
  return config;
}

/**
 * Check if a vertical has AI configuration.
 */
export function hasVerticalAI(slug: string): boolean {
  return aiConfigs.has(slug);
}

// ── Claude Client (lazy initialization) ────────────────────────────────────────

let claudeApiKey: string | null = null;

function getClaudeApiKey(): string {
  if (claudeApiKey) return claudeApiKey;
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  claudeApiKey = key;
  return key;
}

// ── AI Retry Options ──────────────────────────────────────────────────────────

const AI_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
  timeoutMs: 60000,
};

// ── Claude API Call ───────────────────────────────────────────────────────────

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

async function callClaude(args: {
  systemPrompt: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = getClaudeApiKey();
  const response = await withRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), args.maxTokens ? 90000 : 60000);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: args.maxTokens ?? 4096,
            temperature: args.temperature ?? 0.7,
            system: args.systemPrompt,
            messages: args.messages,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorBody = await res.text();
          throw new Error(`Claude API error ${res.status}: ${errorBody}`);
        }

        const data = await res.json();
        const text = data.content?.map((c: any) => c.text).join("") ?? "";
        return text;
      } finally {
        clearTimeout(timeout);
      }
    },
    {
      ...AI_RETRY,
      onRetry: (info) => {
        logger.warn("AI call retrying", {
          attempt: info.attempt,
          error: info.error,
          delayMs: info.delayMs,
        });
      },
    },
  );
  return response;
}

// ── Shared AI Workflow Implementation ─────────────────────────────────────────

/**
 * Creates an AIWorkflow instance for a specific vertical.
 * Uses the vertical's registered configuration for prompts and schemas.
 * The shared infrastructure handles Claude client, retries, timeouts, etc.
 */
export function createVerticalAIWorkflow(slug: string): AIWorkflow {
  const config = getVerticalAIConfig(slug);

  return {
    async analyze(input: AIWorkflowInput): Promise<AIAnalysisResult> {
      const text = await callClaude({
        systemPrompt: config.analysisSystemPrompt,
        messages: [
          { role: "user", content: JSON.stringify({
            documents: input.documents?.length ?? 0,
            context: input.context,
          }) },
        ],
        temperature: 0.3,
      });

      try {
        const parsed = JSON.parse(text);
        return {
          summary: parsed.summary ?? "",
          keyFacts: parsed.keyFacts ?? {},
          confidence: parsed.confidence ?? 0,
          warnings: parsed.warnings ?? [],
        };
      } catch {
        return {
          summary: text,
          keyFacts: {},
          confidence: 0.5,
          warnings: ["AI response was not structured JSON"],
        };
      }
    },

    async extractFacts(input: AIWorkflowInput): Promise<AIExtractedFacts> {
      const text = await callClaude({
        systemPrompt: config.analysisSystemPrompt + "\n\nExtract structured facts from the provided context. Return JSON with 'facts' and 'sources' fields.",
        messages: [
          { role: "user", content: JSON.stringify(input.context) },
        ],
        temperature: 0.2,
      });

      try {
        const parsed = JSON.parse(text);
        return {
          facts: parsed.facts ?? {},
          sources: parsed.sources ?? [],
        };
      } catch {
        return { facts: {}, sources: [] };
      }
    },

    async generateDraft(input: AIDraftInput): Promise<AIDraftResult> {
      const text = await callClaude({
        systemPrompt: config.draftSystemPrompt,
        messages: [
          { role: "user", content: JSON.stringify({
            facts: input.facts,
            templateId: input.templateId,
            userInstructions: input.userInstructions,
          }) },
        ],
        maxTokens: 8192,
        temperature: 0.7,
      });

      return {
        content: text,
        pageCount: Math.ceil(text.length / 3000),
        metadata: { verticalSlug: slug, generatedAt: new Date().toISOString() },
      };
    },

    async validate(input: AIValidationInput): Promise<AIValidationResult> {
      const text = await callClaude({
        systemPrompt: config.validationSystemPrompt,
        messages: [
          { role: "user", content: JSON.stringify({
            draft: input.draft,
            requirements: input.requirements,
          }) },
        ],
        temperature: 0.2,
      });

      try {
        const parsed = JSON.parse(text);
        return {
          valid: parsed.valid ?? false,
          issues: parsed.issues ?? [],
          suggestions: parsed.suggestions ?? [],
        };
      } catch {
        return {
          valid: true,
          issues: [],
          suggestions: ["AI validation response was not structured — manual review required"],
        };
      }
    },

    async revise(input: AIReviseInput): Promise<AIDraftResult> {
      const text = await callClaude({
        systemPrompt: config.draftSystemPrompt + "\n\nRevise the draft based on the provided feedback.",
        messages: [
          { role: "user", content: JSON.stringify({
            draft: input.draft,
            feedback: input.feedback,
          }) },
        ],
        maxTokens: 8192,
        temperature: 0.6,
      });

      return {
        content: text,
        pageCount: Math.ceil(text.length / 3000),
        metadata: { verticalSlug: slug, revisedAt: new Date().toISOString() },
      };
    },
  };
}
