import {
  createWorkflowDraftBasis,
  workflowDraftBasisMatches,
  type WorkflowDraftBasis,
  type WorkflowMatterDocument,
} from "@mailmypdf/workflows";

/**
 * Compare the saved draft against the runtime's canonical versioned basis.
 * A historical approval cannot make a stale draft current.
 */
export function isCurrentMatterDraft(input: {
  storedInput: unknown;
  analysis: unknown;
  draft: unknown;
  documents: readonly WorkflowMatterDocument[];
}): boolean {
  const { storedInput, analysis, draft, documents } = input;
  if (!storedInput || typeof storedInput !== "object" || Array.isArray(storedInput) ||
      !analysis || typeof analysis !== "object" || Array.isArray(analysis) ||
      !draft || typeof draft !== "object" || Array.isArray(draft)) return false;
  const saved = storedInput as Record<string, unknown>;
  const analyzed = analysis as Record<string, unknown>;
  const reviewed = draft as Record<string, unknown>;
  if (!Number.isSafeInteger(saved.version) ||
      !Number.isSafeInteger(analyzed.version) ||
      typeof analyzed.documentId !== "string") return false;
  try {
    return workflowDraftBasisMatches(
      reviewed.basis as WorkflowDraftBasis | undefined,
      createWorkflowDraftBasis({
        analysis: { version: analyzed.version as number, documentId: analyzed.documentId },
        inputVersion: saved.version as number,
        documents,
      }),
    );
  } catch {
    return false;
  }
}

type MatterRecord = {
  id: string;
  workflowId: string;
  verticalId: string;
  status: string;
};

type MatterDocument = {
  documentId: string;
  role: string;
  included: boolean;
  securityStatus: string;
  usable: boolean;
};

export type MatterNextAction = {
  toolName: string | null;
  reason: string;
  arguments: Record<string, unknown>;
  requiredInputs: readonly string[];
  requiresExplicitApproval: boolean;
};

export type MatterProgress = {
  sourceDocumentRequired: boolean;
  sourceDocumentPresent: boolean;
  sourceDocumentReady: boolean;
  includedDocumentsReady: boolean;
  analysisSaved: boolean;
  factsSaved: boolean;
  draftSaved: boolean;
  packetApproved: boolean;
};

export type MatterGuidance = {
  progress: MatterProgress;
  requiredFacts: readonly string[];
  nextAction: MatterNextAction;
};

function action(
  matterId: string,
  toolName: string | null,
  reason: string,
  requiredInputs: readonly string[] = [],
  requiresExplicitApproval = false,
): MatterNextAction {
  return {
    toolName,
    reason,
    arguments: toolName ? { matter_id: matterId } : {},
    requiredInputs,
    requiresExplicitApproval,
  };
}

function cleanStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((item) => item.slice(0, 300));
}

/** Extracts user-facing missing-fact labels without exposing the full analysis. */
export function analysisRequiredFacts(analysis: unknown): readonly string[] {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return [];
  const result = (analysis as Record<string, unknown>).result;
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  const record = result as Record<string, unknown>;
  return cleanStrings(record.missingInformation ?? record.missing_information);
}

/**
 * Produces one conservative continuation step from persisted runtime state.
 * It never treats analysis, draft generation, or an old approval as permission
 * to perform a later consequential action.
 */
export function deriveMatterGuidance(input: {
  matter: MatterRecord;
  documents: readonly MatterDocument[];
  requiresSourceDocument: boolean;
  analysis: unknown | null;
  hasInput: boolean;
  hasDraft: boolean;
  draftIsCurrent: boolean;
  approvalId: string | null;
}): MatterGuidance {
  const { matter, documents } = input;
  const source = documents.find((document) => document.role === "subject_notice");
  // A stale usable flag cannot override quarantine or a failed scan.
  const includedNotReady = documents.find(
    (document) => document.included && (!document.usable || document.securityStatus !== "clean"),
  );
  // A request-first workflow may omit its source, but an optional source
  // that was uploaded must pass the same scan gate as the runtime before
  // draft, packet preview, approval, or checkout.
  const sourceReady = source
    ? Boolean(source.usable && source.securityStatus === "clean")
    : !input.requiresSourceDocument;
  const progress: MatterProgress = {
    sourceDocumentRequired: input.requiresSourceDocument,
    sourceDocumentPresent: Boolean(source),
    sourceDocumentReady: sourceReady,
    includedDocumentsReady: !includedNotReady,
    analysisSaved: Boolean(input.analysis),
    factsSaved: input.hasInput,
    draftSaved: input.hasDraft,
    packetApproved: Boolean(input.approvalId),
  };
  const requiredFacts = analysisRequiredFacts(input.analysis);

  if (matter.status === "abandoned") {
    return {
      progress,
      requiredFacts,
      nextAction: action(
        matter.id,
        null,
        "This matter is abandoned. Confirm that the user wants a new matter before creating one.",
      ),
    };
  }

  if (matter.status === "submitted") {
    return {
      progress,
      requiredFacts,
      nextAction: action(matter.id, "get_order_status", "Read payment, mailing, tracking, and proof status."),
    };
  }

  // Persisted drafts and approvals are historical records, not permission to
  // bypass current document security checks. The runtime enforces the same gates.
  if (includedNotReady) {
    const next = action(
      matter.id,
      "get_document_status",
      "An included document must clear security processing before drafting or packet construction.",
      ["document_id"],
    );
    next.arguments.document_id = includedNotReady.documentId;
    return { progress, requiredFacts, nextAction: next };
  }

  if (input.requiresSourceDocument && !source) {
    return {
      progress,
      requiredFacts,
      nextAction: action(
        matter.id,
        "ingest_document",
        "This workflow requires a source notice or decision document before analysis.",
        ["idempotency_key", "file", "role", "processing_consent"],
      ),
    };
  }

  if (!sourceReady) {
    const next = action(
      matter.id,
      "get_document_status",
      "The source document must clear security processing before analysis.",
      ["document_id"],
    );
    if (source) next.arguments.document_id = source.documentId;
    return { progress, requiredFacts, nextAction: next };
  }

  // SSA reconsideration binds analysis to exactly one denial notice, even
  // when the source is excluded from outgoing mail. Guidance must not
  // recommend a draft, packet preview, or checkout that runtime will reject.
  if ((matter.workflowId === "appeal-ssdi-denial" || matter.workflowId === "appeal-ssi-denial") &&
      documents.filter((document) => document.role === "subject_notice").length !== 1) {
    return {
      progress,
      requiredFacts,
      nextAction: action(
        matter.id,
        null,
        "Multiple source notices are attached. SSA reconsideration requires exactly one denial notice; resolve the duplicate notices or start a new matter with one source before continuing.",
      ),
    };
  }

  if (input.requiresSourceDocument && !input.analysis) {
    return {
      progress,
      requiredFacts,
      nextAction: action(
        matter.id,
        "analyze_matter",
        "The source document is ready and has not been analyzed.",
        ["idempotency_key"],
      ),
    };
  }

  // Analysis is bound to the exact uploaded source document. After a notice
  // replacement the saved denial analysis is historical, not permission to
  // generate a draft or continue toward payment. Mirror the runtime policy.
  const analyzedDocumentId = input.analysis && typeof input.analysis === "object" && !Array.isArray(input.analysis)
    ? (input.analysis as { documentId?: unknown }).documentId
    : undefined;
  // A missing or malformed historical analysis identity is stale too. The
  // runtime binds SSA reconsideration to the exact source document, so MCP
  // guidance must not suggest drafting or checkout with an unbound analysis.
  if (input.requiresSourceDocument && source && input.analysis &&
      analyzedDocumentId !== source.documentId) {
    return {
      progress,
      requiredFacts,
      nextAction: action(
        matter.id,
        "analyze_matter",
        "The source document has changed since the saved analysis. Analyze the current notice before drafting or checkout.",
        ["idempotency_key"],
      ),
    };
  }

  if (!input.hasInput) {
    return {
      progress,
      requiredFacts,
      nextAction: action(
        matter.id,
        "save_matter_input",
        requiredFacts.length
          ? "Collect the listed missing facts from the user, then save only confirmed values."
          : "Collect and save the workflow's required user-confirmed facts.",
        ["idempotency_key", "input"],
      ),
    };
  }

  // A stored approval is historical. Checkout requires the current analysis,
  // confirmed input and an unchanged reviewed draft basis.
  if (input.hasDraft && !input.draftIsCurrent) {
    return {
      progress,
      requiredFacts,
      nextAction: action(
        matter.id,
        "generate_draft",
        "The saved draft no longer matches the current workflow facts, analysis, or documents. Generate a new draft for user review.",
        ["idempotency_key"],
      ),
    };
  }

  if (input.approvalId && input.hasDraft && input.draftIsCurrent) {
    const next = action(
      matter.id,
      "prepare_checkout",
      "The exact packet is approved. Prepare or resume hosted checkout only when the user wants to continue to payment.",
      ["idempotency_key", "approval_id", "sender"],
    );
    next.arguments.approval_id = input.approvalId;
    return { progress, requiredFacts, nextAction: next };
  }

  if (input.hasDraft && input.draftIsCurrent) {
    return {
      progress,
      requiredFacts,
      nextAction: action(
        matter.id,
        "preview_packet",
        "A saved draft is ready for exact packet and price review. Previewing does not approve, charge, or mail it.",
        ["idempotency_key", "recipient", "mail_class"],
      ),
    };
  }

  return {
    progress,
    requiredFacts,
    nextAction: action(
      matter.id,
      "generate_draft",
      input.analysis
        ? "Analysis and user-confirmed facts are ready for a draft."
        : "This request-first workflow can derive its analysis from saved user-confirmed facts while generating the draft.",
      ["idempotency_key"],
    ),
  };
}
