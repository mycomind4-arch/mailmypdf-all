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
  approvalId: string | null;
}): MatterGuidance {
  const { matter, documents } = input;
  const source = documents.find((document) => document.role === "subject_notice");
  const includedNotReady = documents.find((document) => document.included && !document.usable);
  const sourceReady = input.requiresSourceDocument ? Boolean(source?.usable) : true;
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

  if (input.approvalId) {
    const next = action(
      matter.id,
      "prepare_checkout",
      "The exact packet is approved. Prepare or resume hosted checkout only when the user wants to continue to payment.",
      ["idempotency_key", "approval_id", "sender"],
    );
    next.arguments.approval_id = input.approvalId;
    return { progress, requiredFacts, nextAction: next };
  }

  if (input.hasDraft) {
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

  if (input.requiresSourceDocument && !source?.usable) {
    const next = action(
      matter.id,
      "get_document_status",
      "The source document must clear security processing before analysis.",
      ["document_id"],
    );
    if (source) next.arguments.document_id = source.documentId;
    return { progress, requiredFacts, nextAction: next };
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
