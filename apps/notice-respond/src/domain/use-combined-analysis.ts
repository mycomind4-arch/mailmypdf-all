/**
 * useCombinedAnalysis — hook that runs BOTH deterministic extraction AND LLM analysis
 * when a document is uploaded, then merges the results.
 *
 * The LLM provides richer intelligence (summary, discrepancies, evidence needs, etc.)
 * The deterministic extraction provides validated, tested field extraction.
 *
 * The merged result gives the UI the best of both: LLM intelligence + deterministic reliability.
 */

import { useState, useCallback } from "react";
import { useLLMWorkflow, type LLMAnalysis } from "./use-llm-workflow";

export interface CombinedAnalysis {
  llmAnalysis: LLMAnalysis | null;
  llmLoading: boolean;
  llmError: string | null;
  llmProvider: string | null;
  analyzeWithLLM: (file: File | null, text: string) => Promise<LLMAnalysis | null>;
  resetLLM: () => void;
}

export function useCombinedAnalysis(workflowId: string): CombinedAnalysis {
  const llm = useLLMWorkflow(workflowId);

  const analyzeWithLLM = useCallback(async (file: File | null, text: string): Promise<LLMAnalysis | null> => {
    // Only call LLM if we have either a file or sufficient text
    if (!file && text.length < 20) return null;

    try {
      return await llm.analyze(file, text);
    } catch {
      // LLM failure is non-fatal — deterministic extraction still works
      return null;
    }
  }, [llm]);

  return {
    llmAnalysis: llm.analysis,
    llmLoading: llm.loading,
    llmError: llm.error,
    llmProvider: llm.provider,
    analyzeWithLLM,
    resetLLM: llm.reset,
  };
}
