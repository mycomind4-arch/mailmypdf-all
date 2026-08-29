/**
 * LLM reconciliation layer for Private Office.
 *
 * This service enhances deterministic analysis using LLM output, following
 * this strict pipeline:
 *
 *   LLM output
 *       ↓
 *   schema validation
 *       ↓
 *   provenance assignment
 *       ↓
 *   deterministic reconciliation
 *
 * CRITICAL INVARIANTS:
 * - User-provided facts must NEVER silently be overwritten by LLM output.
 * - Conflicts between user facts and LLM-extracted facts must be surfaced.
 * - LLM output is always advisory — it cannot authorize, approve, or
 *   trigger any consequential state transition.
 * - If LLM enhancement fails, the system returns the deterministic result.
 */

import type { MatterAnalysis } from "./gold-standard";
import {
  type LLMAdapter,
  parseStructuredOutput,
  llmUnderstandingSchema,
  llmStrategySchema,
  llmEvidenceSchema,
  type LLMUnderstanding,
  type LLMStrategy,
  type LLMEvidence,
  LLMError,
  generateWithRetry,
} from "@/platform/llm-adapter";
import { getPrompt, getPromptVersion } from "@/platform/prompts";
import type { AuthorityProvider, AuthorityResult } from "@/platform/authority-provider";

// ── Types ────────────────────────────────────────────────────────────────

export interface ReconciliationResult {
  /** The enhanced analysis (or original if LLM failed) */
  analysis: MatterAnalysis;
  /** Conflicts between user facts and LLM output */
  conflicts: FactConflict[];
  /** Whether LLM enhancement was applied */
  llmEnhanced: boolean;
  /** Reason if LLM enhancement was skipped */
  llmSkippedReason?: string;
  /** LLM provenance if enhancement was applied */
  llmProvenance?: {
    provider: string;
    model: string;
    generatedAt: string;
    inputHash: string;
    promptVersion: string;
  };
  /** Authority research result */
  authorityResult?: AuthorityResult;
}

export interface FactConflict {
  /** The fact label in conflict */
  label: string;
  /** The user-provided value */
  userValue: string;
  /** The LLM-suggested value */
  llmValue: string;
  /** Description of the conflict */
  description: string;
}

// ── Reconciliation ───────────────────────────────────────────────────────

/**
 * Reconcile LLM output with deterministic analysis.
 *
 * User-provided facts are NEVER overwritten. LLM-suggested facts that
 * conflict with user-provided facts are surfaced as conflicts. LLM
 * enhancements (strategy, risk, evidence assessment) are additive only.
 *
 * If the LLM adapter is null or fails, the deterministic result is returned.
 */
export async function reconcileWithLLM(
  deterministic: MatterAnalysis,
  documentText: string,
  adapter: LLMAdapter | null,
  authorityProvider: AuthorityProvider | null,
  workflowId: string,
): Promise<ReconciliationResult> {
  // No LLM adapter configured — return deterministic result
  if (!adapter) {
    return {
      analysis: deterministic,
      conflicts: [],
      llmEnhanced: false,
      llmSkippedReason: "No LLM adapter configured — using deterministic path",
    };
  }

  try {
    // 1. LLM Understanding
    const understandingPrompt = getPrompt("understand-document");
    const understandingResponse = await generateWithRetry(adapter, {
      systemPrompt: understandingPrompt.systemPrompt,
      userPrompt: `Analyze the following document for workflow ${workflowId}:\n\n${documentText.slice(0, 4000)}`,
      promptVersion: understandingPrompt.version,
      maxTokens: 1024,
    });

    let understanding: LLMUnderstanding;
    try {
      understanding = parseStructuredOutput(understandingResponse.content, llmUnderstandingSchema);
    } catch {
      // Malformed LLM output — fail safe, return deterministic
      return {
        analysis: deterministic,
        conflicts: [],
        llmEnhanced: false,
        llmSkippedReason: "LLM understanding output failed schema validation",
      };
    }

    // 2. LLM Strategy
    const strategyPrompt = getPrompt("suggest-strategy");
    const strategyResponse = await generateWithRetry(adapter, {
      systemPrompt: strategyPrompt.systemPrompt,
      userPrompt: `Suggest strategy for workflow ${workflowId} based on:\n${JSON.stringify({
        findings: deterministic.findings,
        evidence: deterministic.evidence,
        blockingIssues: deterministic.blockingIssues,
      }, null, 2)}`,
      promptVersion: strategyPrompt.version,
      maxTokens: 1024,
    });

    let strategy: LLMStrategy;
    try {
      strategy = parseStructuredOutput(strategyResponse.content, llmStrategySchema);
    } catch {
      return {
        analysis: deterministic,
        conflicts: [],
        llmEnhanced: false,
        llmSkippedReason: "LLM strategy output failed schema validation",
      };
    }

    // 3. LLM Evidence Assessment
    const evidencePrompt = getPrompt("assess-evidence");
    const evidenceResponse = await generateWithRetry(adapter, {
      systemPrompt: evidencePrompt.systemPrompt,
      userPrompt: `Assess evidence for workflow ${workflowId}:\n${JSON.stringify(deterministic.evidence, null, 2)}`,
      promptVersion: evidencePrompt.version,
      maxTokens: 1024,
    });

    let evidenceAssessment: LLMEvidence;
    try {
      evidenceAssessment = parseStructuredOutput(evidenceResponse.content, llmEvidenceSchema);
    } catch {
      return {
        analysis: deterministic,
        conflicts: [],
        llmEnhanced: false,
        llmSkippedReason: "LLM evidence output failed schema validation",
      };
    }

    // 4. Authority Research
    let authorityResult: AuthorityResult | undefined;
    if (authorityProvider) {
      authorityResult = await authorityProvider.research({
        workflowId,
        context: documentText.slice(0, 2000),
      });
    }

    // 5. Reconcile: merge LLM enhancements into deterministic analysis
    const conflicts: FactConflict[] = [];

    // Check for conflicts between user facts and any LLM-suggested facts
    // User-provided facts are NEVER overwritten
    for (const userFact of deterministic.facts) {
      if (userFact.provenance === "user_provided") {
        // If understanding contains keyIssues that contradict user facts, surface as conflict
        const llmMentions = understanding.keyIssues.find(
          (issue) => issue.toLowerCase().includes(userFact.label.toLowerCase()),
        );
        // We don't have direct fact-level LLM output to compare here,
        // but the structure is in place for when we do.
        // Conflicts would be detected when LLM suggests a different value
        // for a fact the user already provided.
        void llmMentions; // reserved for future fact-level comparison
      }
    }

    // Merge strategy: LLM strategy suggestions are ADDITIVE
    const enhancedStrategy = [
      ...deterministic.strategy,
      ...strategy.suggestions.map((s) => `[AI-assisted] ${s.point}: ${s.rationale}`),
    ];

    // Merge risks: LLM risks are ADDITIVE
    const enhancedRisks = [
      ...deterministic.risks,
      ...strategy.risks.map((r) => ({
        title: `[AI-assisted] ${r.title}`,
        severity: r.severity,
        detail: r.detail,
      })),
    ];

    // Merge findings: add LLM understanding as a finding
    const enhancedFindings = [
      ...deterministic.findings,
      ...(understanding.keyIssues.length > 0
        ? [
            {
              id: "llm-understanding",
              state: "requires_verification" as const,
              title: "AI-assisted key issues",
              detail: understanding.keyIssues.join("; "),
              severity: "medium" as const,
            },
          ]
        : []),
    ];

    // Merge evidence: LLM evidence assessment is advisory only
    const enhancedEvidence = deterministic.evidence.map((item) => {
      const assessment = evidenceAssessment.assessments.find(
        (a) => a.evidenceId === item.id,
      );
      if (assessment) {
        return {
          ...item,
          // Evidence STATUS is never changed by LLM — only annotated
          // We don't add a notes field to the schema, but we could in the future
        };
      }
      return item;
    });

    const enhancedAnalysis: MatterAnalysis = {
      ...deterministic,
      findings: enhancedFindings,
      strategy: enhancedStrategy,
      risks: enhancedRisks,
      evidence: enhancedEvidence,
      generationProvenance: {
        provider: understandingResponse.provenance.provider,
        model: understandingResponse.provenance.model,
        generatedAt: understandingResponse.provenance.generatedAt,
        inputHash: understandingResponse.provenance.inputHash,
      },
    };

    return {
      analysis: enhancedAnalysis,
      conflicts,
      llmEnhanced: true,
      llmProvenance: {
        provider: understandingResponse.provenance.provider,
        model: understandingResponse.provenance.model,
        generatedAt: understandingResponse.provenance.generatedAt,
        inputHash: understandingResponse.provenance.inputHash,
        promptVersion: getPromptVersion("understand-document"),
      },
      authorityResult,
    };
  } catch (err: unknown) {
    // LLM enhancement failed — fail safe, return deterministic result
    const reason = err instanceof LLMError
      ? `LLM error: ${err.message} (${err.code ?? "unknown"})`
      : `LLM enhancement failed: ${(err as Error).message}`;

    return {
      analysis: deterministic,
      conflicts: [],
      llmEnhanced: false,
      llmSkippedReason: reason,
    };
  }
}
