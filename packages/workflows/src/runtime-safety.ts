import type { WorkflowMatterDocument } from "./matter-runtime-client.js";
import {
  requireCleanSourceDocument,
  requireIncludedDocumentsReady,
  WorkflowRuntimeError,
} from "./matter-runtime.js";

export interface AnalysisSafetySnapshot {
  documentId: string;
  result: {
    promptInjectionObserved?: boolean;
  };
}

/**
 * Ensures a stored analysis still belongs to the current clean source and that
 * every included enclosure remains clean. If analysis saw embedded instructions,
 * drafting stops for human review rather than continuing automatically.
 */
export function assertStoredAnalysisReadyForDraft(
  analysis: AnalysisSafetySnapshot,
  documents: readonly WorkflowMatterDocument[],
): void {
  const source = requireCleanSourceDocument(documents);
  if (source.documentId !== analysis.documentId) {
    throw new WorkflowRuntimeError(
      "The source document changed. Analyze the current source before drafting.",
      "ANALYZED_SOURCE_CHANGED",
    );
  }

  requireIncludedDocumentsReady(documents);

  if (analysis.result.promptInjectionObserved) {
    throw new WorkflowRuntimeError(
      "The source analysis reported embedded instructions. Review the source before generating a draft.",
      "PROMPT_INJECTION_REVIEW_REQUIRED",
    );
  }
}
