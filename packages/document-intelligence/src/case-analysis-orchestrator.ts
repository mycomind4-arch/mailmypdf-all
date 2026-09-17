export interface AnalysisMatterDocument {
  documentId: string;
  role: "subject_notice" | "evidence";
  evidenceKind?: string | null;
  included: boolean;
  usable: boolean;
}

export interface StoredDocumentAnalysis<Result> {
  version: number;
  documentId: string;
  model: string;
  result: Result;
  createdAt: string;
}

export interface StoredWorkflowInput {
  version: number;
  input: Record<string, unknown>;
}

export interface SecureCaseAnalysisStore<Result> {
  listDocuments(ownerId: string, matterId: string): Promise<readonly AnalysisMatterDocument[]>;
  saveAnalysis(input: {
    ownerId: string;
    matterId: string;
    documentId: string;
    model: string;
    result: Result;
  }): Promise<StoredDocumentAnalysis<Result>>;
  loadLatestAnalysis(ownerId: string, matterId: string): Promise<StoredDocumentAnalysis<Result> | null>;
  loadLatestInput(ownerId: string, matterId: string): Promise<StoredWorkflowInput | null>;
}

export interface SecureCaseAnalysisGateway<Result> {
  analyzeSource(input: {
    ownerId: string;
    matterId: string;
    documentId: string;
  }): Promise<{ model: string; result: Result }>;
  draftFromStoredData(input: {
    ownerId: string;
    matterId: string;
    analysis: Result;
    workflowInput: Record<string, unknown> | null;
    enclosedEvidenceKinds: readonly string[];
  }): Promise<{ model: string; bodyText: string }>;
}

export class CaseAnalysisOrchestrationError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "CaseAnalysisOrchestrationError";
  }
}

/**
 * Analyzes the source document exactly through the supplied secure disclosure
 * gateway, then persists the conclusion. Drafting should use the stored result
 * rather than redisclosing the original document on every step.
 */
export async function analyzeSubjectDocument<Result>(input: {
  ownerId: string;
  matterId: string;
  store: SecureCaseAnalysisStore<Result>;
  gateway: SecureCaseAnalysisGateway<Result>;
  validate(result: unknown): Result;
}): Promise<StoredDocumentAnalysis<Result>> {
  const documents = await input.store.listDocuments(input.ownerId, input.matterId);
  const source = documents.find((document) => document.role === "subject_notice");
  if (!source) {
    throw new CaseAnalysisOrchestrationError("Matter has no source document to analyze", "SOURCE_MISSING");
  }
  if (!source.usable) {
    throw new CaseAnalysisOrchestrationError("Source document has not cleared security checks", "SOURCE_NOT_USABLE");
  }

  const analyzed = await input.gateway.analyzeSource({
    ownerId: input.ownerId,
    matterId: input.matterId,
    documentId: source.documentId,
  });
  const result = input.validate(analyzed.result);
  return input.store.saveAnalysis({
    ownerId: input.ownerId,
    matterId: input.matterId,
    documentId: source.documentId,
    model: analyzed.model,
    result,
  });
}

/**
 * Generates a draft from stored analysis + confirmed user input only. The source
 * document is not disclosed again. Included evidence is represented by kind,
 * never by filename or unverified content.
 */
export async function draftFromStoredAnalysis<Result extends { promptInjectionObserved?: boolean }>(input: {
  ownerId: string;
  matterId: string;
  store: SecureCaseAnalysisStore<Result>;
  gateway: SecureCaseAnalysisGateway<Result>;
  requireWorkflowInput?: boolean;
}): Promise<{ model: string; bodyText: string; basedOnAnalysisVersion: number }> {
  const analysis = await input.store.loadLatestAnalysis(input.ownerId, input.matterId);
  if (!analysis) {
    throw new CaseAnalysisOrchestrationError("Analyze the source document before drafting", "ANALYSIS_REQUIRED");
  }
  if (analysis.result.promptInjectionObserved) {
    throw new CaseAnalysisOrchestrationError(
      "The analysis reported embedded instructions; review the source before drafting",
      "PROMPT_INJECTION_REVIEW_REQUIRED",
    );
  }

  const documents = await input.store.listDocuments(input.ownerId, input.matterId);
  const source = documents.find((document) => document.role === "subject_notice");
  if (!source || source.documentId !== analysis.documentId) {
    throw new CaseAnalysisOrchestrationError("The source changed after analysis", "SOURCE_CHANGED");
  }
  if (!source.usable) {
    throw new CaseAnalysisOrchestrationError("Source document is no longer usable", "SOURCE_NOT_USABLE");
  }
  if (documents.some((document) => document.role === "evidence" && document.included && !document.usable)) {
    throw new CaseAnalysisOrchestrationError(
      "All included evidence must clear security checks before drafting",
      "EVIDENCE_NOT_USABLE",
    );
  }

  const workflowInput = await input.store.loadLatestInput(input.ownerId, input.matterId);
  if (input.requireWorkflowInput !== false && !workflowInput) {
    throw new CaseAnalysisOrchestrationError("Save workflow information before drafting", "WORKFLOW_INPUT_REQUIRED");
  }

  const enclosedEvidenceKinds = documents
    .filter((document) => document.role === "evidence" && document.included)
    .map((document) => document.evidenceKind)
    .filter((value): value is string => Boolean(value));

  const generated = await input.gateway.draftFromStoredData({
    ownerId: input.ownerId,
    matterId: input.matterId,
    analysis: analysis.result,
    workflowInput: workflowInput?.input ?? null,
    enclosedEvidenceKinds,
  });

  const bodyText = generated.bodyText.trim();
  if (!bodyText) {
    throw new CaseAnalysisOrchestrationError("Drafting returned empty content", "EMPTY_DRAFT");
  }

  return {
    model: generated.model,
    bodyText,
    basedOnAnalysisVersion: analysis.version,
  };
}
