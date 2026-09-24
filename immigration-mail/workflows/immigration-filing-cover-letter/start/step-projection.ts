import type {
  DeriveSteps,
  StepProjectionContext,
} from "@mailmypdf/step-workflow";

/**
 * Projects the durable workflow-runtime snapshot onto the canonical
 * Immigration Filing Cover Letter StepWorkflow.
 *
 * This replaces the old React-side immigrationCoverLetterCompletedSteps()
 * inference with a projection from the actual persisted matter.
 */
export const deriveImmigrationFilingCoverLetterSteps: DeriveSteps = (
  snapshot: StepProjectionContext,
) => {
  const primary = snapshot.documents.find(
    (document) => document.role === "subject_notice",
  );

  const primaryReady = Boolean(
    primary?.usable && primary.securityStatus === "clean",
  );

  const analysisReady = Boolean(snapshot.analysis?.result.summary);
  const factsReady = Boolean(snapshot.input);
  const draftReady = Boolean(snapshot.draft?.bodyText);
  const approved = Boolean(snapshot.approval);

  return {
    filing: {
      status: primaryReady
        ? "complete"
        : primary
          ? "in_progress"
          : "not_started",
      data: {
        documentId: primary?.documentId ?? null,
        filename: primary?.filename ?? null,
        securityStatus: primary?.securityStatus ?? null,
      },
    },

    analysis: {
      status: analysisReady
        ? "complete"
        : primaryReady
          ? "in_progress"
          : "not_started",
      data: {
        summary: snapshot.analysis?.result.summary ?? null,
      },
    },

    facts: {
      status: factsReady
        ? "complete"
        : analysisReady
          ? "in_progress"
          : "not_started",
      data: {
        input: snapshot.input?.input ?? {},
      },
    },

    // Preserve the existing Filing Cover Letter behavior for now:
    // packet-document organization becomes available after filing facts
    // have been confirmed.
    documents: {
      status: factsReady ? "complete" : "not_started",
      data: {
        documentCount: snapshot.documents.length,
        supportingDocumentCount: snapshot.documents.filter(
          (document) => document.role === "evidence",
        ).length,
      },
    },

    draft: {
      status: draftReady
        ? "complete"
        : factsReady
          ? "in_progress"
          : "not_started",
      data: {
        bodyText: snapshot.draft?.bodyText ?? "",
      },
    },

    review: {
      status: approved
        ? "complete"
        : draftReady
          ? "in_progress"
          : "not_started",
      data: {
        approvalId: snapshot.approval?.approvalId ?? null,
      },
    },

    // Approval unlocks mailing; it does not mean mailing itself is complete.
    mail: {
      status: approved ? "in_progress" : "not_started",
    },
  };
};
