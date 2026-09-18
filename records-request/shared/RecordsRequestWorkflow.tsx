import { useEffect, useMemo, useState } from "react";
import {
  ApprovalChecklist,
  CheckboxField,
  DocumentUpload,
  Field,
  FulfillmentPanel,
  ReadinessChecklist,
  SectionCard,
  StatusCard,
  StepShell,
  TextArea,
  TextField,
} from "@mailmypdf/workflow-ui";
import "@mailmypdf/workflow-ui/workflow-ui.css";
import {
  createHttpWorkflowMatterClient,
  type WorkflowMailingAddress,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowMatterEvent,
  type WorkflowPacketPreview,
} from "@mailmypdf/workflows";
import {
  RECORDS_REQUEST_CONTEXT_KINDS,
  RECORDS_REQUEST_STEPS,
  RECORDS_REQUEST_VERTICAL_ID,
  completedRecordsRequestSteps,
  includedRecordsContextReady,
  type RecordsRequestContextKind,
  type RecordsRequestStepId,
} from "./runtime";

export interface RecordsRequestWorkflowUiConfig {
  workflowId: string;
  title: string;
  backHref?: string;
  subtitle?: string;
  recordsSoughtPlaceholder?: string;
}

type RequestFacts = {
  requesterName: string;
  requesterAddress: string;
  requesterEmail: string;
  requesterPhone: string;
  agency: string;
  custodian: string;
  agencyAddress: string;
  recordsSought: string;
  dateRange: string;
  caseReference: string;
  propertyReference: string;
  preferredFormat: string;
  feeLimit: string;
  feeWaiverBasis: string;
  additionalInstructions: string;
  jurisdiction: string;
  authorityName: string;
  authorityCitation: string;
  responseTimingDescription: string;
  withholdingInstruction: string;
  authorityVerified: boolean;
  scopeConfirmed: boolean;
  contextReviewed: boolean;
  authorityReviewed: boolean;
};

const EMPTY_FACTS: RequestFacts = {
  requesterName: "",
  requesterAddress: "",
  requesterEmail: "",
  requesterPhone: "",
  agency: "",
  custodian: "",
  agencyAddress: "",
  recordsSought: "",
  dateRange: "",
  caseReference: "",
  propertyReference: "",
  preferredFormat: "Electronic copies where available",
  feeLimit: "",
  feeWaiverBasis: "",
  additionalInstructions: "",
  jurisdiction: "",
  authorityName: "",
  authorityCitation: "",
  responseTimingDescription: "",
  withholdingInstruction: "",
  authorityVerified: false,
  scopeConfirmed: false,
  contextReviewed: false,
  authorityReviewed: false,
};

const EMPTY_ADDRESS: WorkflowMailingAddress = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal: "",
};

const client = createHttpWorkflowMatterClient({ basePath: "/api/workflow-runtime" });

function addressReady(value: WorkflowMailingAddress): boolean {
  return Boolean(
    value.name.trim() &&
      value.line1.trim() &&
      value.city.trim() &&
      /^[A-Za-z]{2}$/.test(value.state.trim()) &&
      /^\d{5}(?:-\d{4})?$/.test(value.postal.trim()),
  );
}

function contextLabel(kind: string | null): string {
  return (
    RECORDS_REQUEST_CONTEXT_KINDS.find(([value]) => value === kind)?.[1] ??
    kind ??
    "Context document"
  );
}

function storageKey(workflowId: string): string {
  return `mailmypdf:${workflowId}:matter`;
}

export default function RecordsRequestWorkflow({
  config,
}: {
  config: RecordsRequestWorkflowUiConfig;
}) {
  const [matterId, setMatterId] = useState("");
  const [documents, setDocuments] = useState<WorkflowMatterDocument[]>([]);
  const [analysis, setAnalysis] = useState<WorkflowMatterAnalysis | null>(null);
  const [events, setEvents] = useState<WorkflowMatterEvent[]>([]);
  const [facts, setFacts] = useState<RequestFacts>(EMPTY_FACTS);
  const [scopeSaved, setScopeSaved] = useState(false);
  const [contextKind, setContextKind] =
    useState<RecordsRequestContextKind>("notice");
  const [contextRole, setContextRole] =
    useState<"subject_notice" | "evidence">("evidence");
  const [draft, setDraft] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [packet, setPacket] = useState<WorkflowPacketPreview | null>(null);
  const [approvalId, setApprovalId] = useState("");
  const [recipient, setRecipient] =
    useState<WorkflowMailingAddress>(EMPTY_ADDRESS);
  const [sender, setSender] =
    useState<WorkflowMailingAddress>(EMPTY_ADDRESS);
  const [mailClass, setMailClass] =
    useState<"standard" | "certified" | "registered">("certified");
  const [stepIndex, setStepIndex] = useState(0);
  const [responded, setResponded] = useState(true);
  const [responseDate, setResponseDate] = useState("");
  const [observationDate, setObservationDate] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const primaryContext =
    documents.find((document) => document.role === "subject_notice") ?? null;
  const contextDocuments = documents.filter(
    (document) => document.role === "evidence",
  );
  const contextReady = includedRecordsContextReady(documents);
  const trustedSend = events.find(
    (event) =>
      event.type === "records_request_sent" &&
      event.source !== "user",
  );
  const responseOutcome = events.find(
    (event) =>
      event.type === "records_response_received" ||
      event.type === "records_response_not_received",
  );

  const completedStepIds = useMemo(
    () =>
      completedRecordsRequestSteps({
        scopeConfirmed: scopeSaved && facts.scopeConfirmed,
        contextReviewed: facts.contextReviewed,
        contextReady,
        authorityReviewed: facts.authorityReviewed,
        draftSaved,
        approvalSaved: Boolean(approvalId),
        actualSendRecorded: Boolean(trustedSend),
        responseOutcomeRecorded: Boolean(responseOutcome),
      }),
    [
      scopeSaved,
      facts.scopeConfirmed,
      facts.contextReviewed,
      facts.authorityReviewed,
      contextReady,
      draftSaved,
      approvalId,
      trustedSend,
      responseOutcome,
    ],
  );

  const currentStep = RECORDS_REQUEST_STEPS[stepIndex]!;

  function invalidateAfterInputChange(): void {
    setDraftSaved(false);
    setPacket(null);
    setApprovalId("");
  }

  function updateFact<Key extends keyof RequestFacts>(
    key: Key,
    value: RequestFacts[Key],
  ): void {
    setFacts((current) => ({
      ...current,
      [key]: value,
      ...(key === "scopeConfirmed"
        ? {}
        : key === "contextReviewed" || key === "authorityReviewed"
          ? {}
          : { scopeConfirmed: false }),
      ...(key.startsWith("authority") ||
      key === "jurisdiction" ||
      key === "responseTimingDescription" ||
      key === "withholdingInstruction"
        ? { authorityReviewed: false }
        : {}),
    }));
    if (
      key !== "authorityVerified" &&
      key !== "contextReviewed" &&
      key !== "authorityReviewed"
    ) {
      setScopeSaved(false);
    }
    invalidateAfterInputChange();
  }

  async function ensureMatter(): Promise<string> {
    if (matterId) return matterId;
    const matter = await client.createMatter({
      workflowId: config.workflowId,
      verticalId: RECORDS_REQUEST_VERTICAL_ID,
    });
    setMatterId(matter.id);
    sessionStorage.setItem(storageKey(config.workflowId), matter.id);
    return matter.id;
  }

  async function refreshDocuments(id = matterId): Promise<void> {
    if (!id) return;
    const snapshot = await client.loadMatter(id);
    setDocuments(snapshot.documents);
  }

  async function refreshEvents(id = matterId): Promise<void> {
    if (!id) return;
    try {
      setEvents(await client.loadEvents(id));
    } catch {
      // Event persistence may not be mounted by an older host yet.
    }
  }

  async function restore(id: string): Promise<void> {
    setBusy("restore");
    setError("");
    try {
      const [snapshot, storedInput, storedDraft, storedApproval, storedAnalysis] =
        await Promise.all([
          client.loadMatter(id),
          client.loadInput(id),
          client.loadDraft(id),
          client.loadApproval(id),
          client.loadAnalysis(id),
        ]);
      setDocuments(snapshot.documents);
      setAnalysis(storedAnalysis);
      if (storedInput?.input) {
        const next = {
          ...EMPTY_FACTS,
          ...(storedInput.input as Partial<RequestFacts>),
        };
        setFacts(next);
        setScopeSaved(next.scopeConfirmed);
      }
      if (storedDraft?.bodyText) {
        setDraft(storedDraft.bodyText);
        setDraftSaved(true);
      }
      if (storedApproval?.approvalId) setApprovalId(storedApproval.approvalId);
      await refreshEvents(id);
    } catch (cause) {
      sessionStorage.removeItem(storageKey(config.workflowId));
      setMatterId("");
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to restore this records-request matter.",
      );
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("matter");
    const stored =
      fromUrl || sessionStorage.getItem(storageKey(config.workflowId));
    if (!stored) return;
    setMatterId(stored);
    sessionStorage.setItem(storageKey(config.workflowId), stored);
    void restore(stored);
  }, [config.workflowId]);

  useEffect(() => {
    if (
      !matterId ||
      !documents.some(
        (document) =>
          !document.usable && document.securityStatus !== "rejected",
      )
    ) {
      return;
    }
    const timer = window.setInterval(
      () => void refreshDocuments(matterId).catch(() => undefined),
      3000,
    );
    return () => window.clearInterval(timer);
  }, [matterId, documents]);

  useEffect(() => {
    if (!matterId || !approvalId || trustedSend) return;
    const timer = window.setInterval(
      () => void refreshEvents(matterId).catch(() => undefined),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [matterId, approvalId, trustedSend]);

  async function persistFacts(next: RequestFacts): Promise<void> {
    const id = await ensureMatter();
    await client.saveInput(id, next);
    setFacts(next);
  }

  async function saveScope(): Promise<void> {
    setBusy("scope");
    setError("");
    try {
      const next = {
        ...facts,
        scopeConfirmed: true,
        contextReviewed: false,
        authorityReviewed: false,
      };
      await persistFacts(next);
      setScopeSaved(true);
      invalidateAfterInputChange();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save request scope.",
      );
    } finally {
      setBusy("");
    }
  }

  async function invalidateContextReview(): Promise<void> {
    setFacts((current) => ({ ...current, contextReviewed: false }));
    invalidateAfterInputChange();
    if (!matterId || !scopeSaved) return;
    try {
      await client.saveInput(matterId, {
        ...facts,
        scopeConfirmed: true,
        contextReviewed: false,
      });
    } catch {
      // The next explicit review/save will persist the current state.
    }
  }

  async function uploadContext(files: File[]): Promise<void> {
    const id = await ensureMatter();
    setBusy("context-upload");
    setError("");
    try {
      let nextDocuments = documents;
      for (const file of files) {
        const uploaded = await client.uploadDocument({
          file,
          workflowId: config.workflowId,
          purpose: `records-request-context:${contextKind}`,
        });
        if (contextRole === "subject_notice") {
          const existing = nextDocuments.find(
            (document) => document.role === "subject_notice",
          );
          if (existing) {
            nextDocuments = await client.detachDocument(id, existing.documentId);
          }
        }
        nextDocuments = await client.attachDocument({
          matterId: id,
          documentId: uploaded.id,
          role: contextRole,
          evidenceKind: contextKind,
          position: nextDocuments.length,
        });
      }
      setDocuments(nextDocuments);
      setAnalysis(null);
      await invalidateContextReview();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to upload context documents.",
      );
    } finally {
      setBusy("");
    }
  }

  async function removeContext(documentId: string): Promise<void> {
    if (!matterId) return;
    setDocuments(await client.detachDocument(matterId, documentId));
    setAnalysis(null);
    await invalidateContextReview();
  }

  async function toggleContext(document: WorkflowMatterDocument): Promise<void> {
    if (!matterId || document.role !== "evidence") return;
    setDocuments(
      await client.updateDocument({
        matterId,
        documentId: document.documentId,
        included: !document.included,
      }),
    );
    await invalidateContextReview();
  }

  async function analyzeContext(): Promise<void> {
    if (!matterId || !primaryContext?.usable) return;
    setBusy("context-analyze");
    setError("");
    try {
      setAnalysis(await client.analyze(matterId));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to analyze the primary context document.",
      );
    } finally {
      setBusy("");
    }
  }

  async function confirmContext(): Promise<void> {
    if (!scopeSaved || !contextReady) return;
    setBusy("context-review");
    setError("");
    try {
      await persistFacts({
        ...facts,
        scopeConfirmed: true,
        contextReviewed: true,
        authorityReviewed: false,
      });
      invalidateAfterInputChange();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save context review.",
      );
    } finally {
      setBusy("");
    }
  }

  async function saveAuthority(): Promise<void> {
    setBusy("authority");
    setError("");
    try {
      await persistFacts({
        ...facts,
        scopeConfirmed: true,
        contextReviewed: true,
        authorityReviewed: true,
      });
      setScopeSaved(true);
      invalidateAfterInputChange();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save authority review.",
      );
    } finally {
      setBusy("");
    }
  }

  async function generateDraft(): Promise<void> {
    if (!matterId) return;
    setBusy("draft-generate");
    setError("");
    try {
      const generated = await client.generateDraft(matterId);
      setDraft(generated.bodyText);
      setDraftSaved(false);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to generate the records request.",
      );
    } finally {
      setBusy("");
    }
  }

  async function saveDraft(): Promise<void> {
    if (!matterId || !draft.trim()) return;
    setBusy("draft-save");
    setError("");
    try {
      await client.saveDraft(matterId, draft);
      setDraftSaved(true);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save the draft.",
      );
    } finally {
      setBusy("");
    }
  }

  async function buildPreview(): Promise<void> {
    if (!matterId) return;
    setBusy("preview");
    setError("");
    try {
      setPacket(await client.previewPacket(matterId, mailClass));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to build the exact request packet.",
      );
    } finally {
      setBusy("");
    }
  }

  async function approve(): Promise<void> {
    if (!matterId || !packet) return;
    setBusy("approve");
    setError("");
    try {
      const result = await client.approvePacket({
        matterId,
        preview: packet,
        recipient,
        mailClass,
      });
      setApprovalId(result.approvalId);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to approve the exact packet.",
      );
    } finally {
      setBusy("");
    }
  }

  async function checkout(): Promise<void> {
    if (!matterId || !approvalId) return;
    setBusy("checkout");
    setError("");
    try {
      const result = await client.checkout({
        matterId,
        approvalId,
        sender,
      });
      sessionStorage.setItem(
        `mailmypdf:${config.workflowId}:order`,
        result.orderId,
      );
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to open secure checkout.",
      );
      setBusy("");
    }
  }

  async function recordResponse(): Promise<void> {
    if (!matterId || !trustedSend) return;
    setBusy("response");
    setError("");
    try {
      const event = await client.recordUserEvent(matterId, {
        responded,
        responseDate: responded ? responseDate : undefined,
        observationDate: responded ? undefined : observationDate,
        note: responseNote,
      });
      setEvents((current) => [...current, event]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to record the agency response outcome.",
      );
    } finally {
      setBusy("");
    }
  }

  function stepReady(step: RecordsRequestStepId): boolean {
    if (step === "scope") return scopeSaved && facts.scopeConfirmed;
    if (step === "context") return facts.contextReviewed && contextReady;
    if (step === "authority") return facts.authorityReviewed;
    if (step === "draft") return draftSaved;
    if (step === "review") return Boolean(approvalId);
    if (step === "send") return Boolean(trustedSend);
    return Boolean(responseOutcome);
  }

  const rail = (
    <>
      <StatusCard
        current={stepIndex + 1}
        total={RECORDS_REQUEST_STEPS.length}
        stepLabel={currentStep.label}
        state={responseOutcome ? "ready" : "in_progress"}
        summary={
          matterId
            ? "Secure records-request matter active."
            : "Confirm the request scope to open the matter."
        }
      />
      <ReadinessChecklist
        title="Request readiness"
        items={[
          { id: "scope", label: "Request scope confirmed", done: scopeSaved },
          {
            id: "context",
            label: "Context documents reviewed and clean",
            done: facts.contextReviewed && contextReady,
          },
          {
            id: "authority",
            label: "Authority status reviewed",
            done: facts.authorityReviewed,
          },
          { id: "draft", label: "Request draft reviewed and saved", done: draftSaved },
          { id: "approval", label: "Exact packet approved", done: Boolean(approvalId) },
          {
            id: "sent",
            label: "Actual send confirmed by provider/system",
            done: Boolean(trustedSend),
          },
          {
            id: "response",
            label: "Agency response outcome recorded",
            done: Boolean(responseOutcome),
          },
        ]}
      />
    </>
  );

  return (
    <StepShell
      breadcrumb={[
        { label: "Records Requests", href: "/records-request" },
        {
          label: config.title,
          href: config.backHref ?? `/records-request/workflows/${config.workflowId}`,
        },
        { label: currentStep.label },
      ]}
      title={config.title}
      subtitle={
        config.subtitle ??
        "Define the records precisely, keep authority claims verified, review the exact request packet, and preserve mailing and response proof."
      }
      lastSavedLabel={matterId ? "Matter saved" : undefined}
      steps={[...RECORDS_REQUEST_STEPS]}
      currentStepId={currentStep.id}
      completedStepIds={completedStepIds}
      onStepClick={(id) => {
        const target = RECORDS_REQUEST_STEPS.findIndex((step) => step.id === id);
        if (
          target >= 0 &&
          (target <= stepIndex ||
            completedStepIds.includes(id as RecordsRequestStepId))
        ) {
          setStepIndex(target);
        }
      }}
      rail={rail}
    >
      {error && <div className="wf-callout wf-callout--danger">{error}</div>}

      {currentStep.id === "scope" && (
        <SectionCard
          title="1. Define the request"
          description="Start from the records you actually want. Required facts stay user-confirmed instead of being guessed from a template."
          footer={
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void saveScope()}
              disabled={Boolean(busy)}
            >
              {busy === "scope" ? "Saving…" : "Confirm request scope"}
            </button>
          }
        >
          <div className="wf-form-grid">
            <Field label="Requester name" required>
              <TextField
                value={facts.requesterName}
                onChange={(event) =>
                  updateFact("requesterName", event.target.value)
                }
              />
            </Field>
            <Field label="Requester email">
              <TextField
                value={facts.requesterEmail}
                onChange={(event) =>
                  updateFact("requesterEmail", event.target.value)
                }
              />
            </Field>
            <Field label="Requester phone">
              <TextField
                value={facts.requesterPhone}
                onChange={(event) =>
                  updateFact("requesterPhone", event.target.value)
                }
              />
            </Field>
            <Field label="Agency or public body" required>
              <TextField
                value={facts.agency}
                onChange={(event) => updateFact("agency", event.target.value)}
              />
            </Field>
            <Field label="Records custodian or department">
              <TextField
                value={facts.custodian}
                onChange={(event) =>
                  updateFact("custodian", event.target.value)
                }
              />
            </Field>
            <Field label="Relevant date range">
              <TextField
                value={facts.dateRange}
                onChange={(event) =>
                  updateFact("dateRange", event.target.value)
                }
              />
            </Field>
            <Field label="Case / incident / permit reference">
              <TextField
                value={facts.caseReference}
                onChange={(event) =>
                  updateFact("caseReference", event.target.value)
                }
              />
            </Field>
            <Field label="Property / parcel / subject reference">
              <TextField
                value={facts.propertyReference}
                onChange={(event) =>
                  updateFact("propertyReference", event.target.value)
                }
              />
            </Field>
            <Field label="Preferred production format">
              <TextField
                value={facts.preferredFormat}
                onChange={(event) =>
                  updateFact("preferredFormat", event.target.value)
                }
              />
            </Field>
            <Field label="Maximum fees without approval">
              <TextField
                value={facts.feeLimit}
                onChange={(event) =>
                  updateFact("feeLimit", event.target.value)
                }
              />
            </Field>
          </div>
          <Field label="Requester mailing address" required>
            <TextArea
              rows={3}
              value={facts.requesterAddress}
              onChange={(event) =>
                updateFact("requesterAddress", event.target.value)
              }
            />
          </Field>
          <Field label="Agency mailing address" required>
            <TextArea
              rows={3}
              value={facts.agencyAddress}
              onChange={(event) =>
                updateFact("agencyAddress", event.target.value)
              }
            />
          </Field>
          <Field label="Records sought" required>
            <TextArea
              rows={7}
              value={facts.recordsSought}
              placeholder={
                config.recordsSoughtPlaceholder ??
                "Describe the identifiable records, categories, subjects, dates, and references you want the agency to locate."
              }
              onChange={(event) =>
                updateFact("recordsSought", event.target.value)
              }
            />
          </Field>
          <Field label="Fee waiver or reduction basis">
            <TextArea
              rows={3}
              value={facts.feeWaiverBasis}
              onChange={(event) =>
                updateFact("feeWaiverBasis", event.target.value)
              }
            />
          </Field>
          <Field label="Additional verified instructions">
            <TextArea
              rows={3}
              value={facts.additionalInstructions}
              onChange={(event) =>
                updateFact("additionalInstructions", event.target.value)
              }
            />
          </Field>
        </SectionCard>
      )}

      {currentStep.id === "context" && (
        <>
          <SectionCard
            title="2. Optional context"
            description="Context is optional. A primary context document may be analyzed; supporting context can be included without being treated as model instructions."
          >
            <div className="wf-form-grid">
              <Field label="Context type">
                <select
                  className="wf-input"
                  value={contextKind}
                  onChange={(event) =>
                    setContextKind(event.target.value as RecordsRequestContextKind)
                  }
                >
                  {RECORDS_REQUEST_CONTEXT_KINDS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Use">
                <select
                  className="wf-input"
                  value={contextRole}
                  onChange={(event) =>
                    setContextRole(
                      event.target.value as "subject_notice" | "evidence",
                    )
                  }
                >
                  <option value="evidence">Supporting context / enclosure</option>
                  <option value="subject_notice">
                    Primary context to analyze
                  </option>
                </select>
              </Field>
            </div>
          </SectionCard>
          <DocumentUpload
            title="Upload context documents"
            items={[
              ...(primaryContext
                ? [
                    {
                      id: primaryContext.documentId,
                      name: primaryContext.filename,
                      sizeBytes: primaryContext.sizeBytes ?? undefined,
                      status: primaryContext.usable
                        ? "Clean primary context"
                        : primaryContext.securityStatus,
                      category: contextLabel(primaryContext.evidenceKind),
                    },
                  ]
                : []),
              ...contextDocuments.map((document) => ({
                id: document.documentId,
                name: document.filename,
                sizeBytes: document.sizeBytes ?? undefined,
                status: document.usable
                  ? document.included
                    ? "Included"
                    : "Excluded"
                  : document.securityStatus,
                category: contextLabel(document.evidenceKind),
              })),
            ]}
            onUpload={uploadContext}
            onRemove={removeContext}
          />
          {primaryContext && (
            <SectionCard
              title="Primary context analysis"
              description="Analysis extracts only what the source supports. Uploaded text is data, not instructions."
              footer={
                <button
                  className="wf-btn wf-btn--outline"
                  type="button"
                  onClick={() => void analyzeContext()}
                  disabled={!primaryContext.usable || Boolean(busy)}
                >
                  {busy === "context-analyze"
                    ? "Analyzing…"
                    : analysis
                      ? "Analyze again"
                      : "Analyze primary context"}
                </button>
              }
            >
              {analysis && (
                <div className="wf-callout wf-callout--info">
                  {analysis.result.summary}
                </div>
              )}
            </SectionCard>
          )}
          {contextDocuments.map((document) => (
            <CheckboxField
              key={document.documentId}
              checked={document.included}
              onChange={() => void toggleContext(document)}
              label={`Include ${document.filename} in the request packet`}
            />
          ))}
          <button
            className="wf-btn wf-btn--primary"
            type="button"
            onClick={() => void confirmContext()}
            disabled={!scopeSaved || !contextReady || Boolean(busy)}
          >
            {busy === "context-review"
              ? "Saving…"
              : "Confirm context review"}
          </button>
        </>
      )}

      {currentStep.id === "authority" && (
        <SectionCard
          title="3. Review authority and timing"
          description="Legal citations and response-timing claims are optional. If you enter them, they must be verified before drafting."
          footer={
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void saveAuthority()}
              disabled={!facts.contextReviewed || Boolean(busy)}
            >
              {busy === "authority" ? "Saving…" : "Complete authority review"}
            </button>
          }
        >
          <div className="wf-form-grid">
            <Field label="Jurisdiction">
              <TextField
                value={facts.jurisdiction}
                onChange={(event) =>
                  updateFact("jurisdiction", event.target.value)
                }
              />
            </Field>
            <Field label="Public-records law or authority">
              <TextField
                value={facts.authorityName}
                onChange={(event) =>
                  updateFact("authorityName", event.target.value)
                }
              />
            </Field>
            <Field label="Verified citation">
              <TextField
                value={facts.authorityCitation}
                onChange={(event) =>
                  updateFact("authorityCitation", event.target.value)
                }
              />
            </Field>
          </div>
          <Field label="Verified response timing rule">
            <TextArea
              rows={3}
              value={facts.responseTimingDescription}
              onChange={(event) =>
                updateFact("responseTimingDescription", event.target.value)
              }
            />
          </Field>
          <Field label="Withholding or redaction instruction">
            <TextArea
              rows={3}
              value={facts.withholdingInstruction}
              onChange={(event) =>
                updateFact("withholdingInstruction", event.target.value)
              }
            />
          </Field>
          <CheckboxField
            checked={facts.authorityVerified}
            onChange={(event) =>
              updateFact("authorityVerified", event.target.checked)
            }
            label="I verified any authority, citation, withholding, or timing language entered above."
          />
          <div className="wf-callout wf-callout--info">
            Leave authority fields blank if you have not verified them. The
            workflow will omit legal citations rather than guess.
          </div>
        </SectionCard>
      )}

      {currentStep.id === "draft" && (
        <SectionCard
          title="4. Draft the records request"
          description="Generate from confirmed scope, optional clean context, and only verified authority. Review and edit the exact text before saving."
          footer={
            <div className="wf-draft-actions">
              <button
                className="wf-btn wf-btn--outline"
                type="button"
                onClick={() => void generateDraft()}
                disabled={!facts.authorityReviewed || Boolean(busy)}
              >
                {busy === "draft-generate" ? "Generating…" : "Generate request"}
              </button>
              <button
                className="wf-btn wf-btn--primary"
                type="button"
                onClick={() => void saveDraft()}
                disabled={!draft.trim() || Boolean(busy)}
              >
                {busy === "draft-save" ? "Saving…" : "Save reviewed draft"}
              </button>
            </div>
          }
        >
          <TextArea
            rows={22}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setDraftSaved(false);
              setPacket(null);
              setApprovalId("");
            }}
            placeholder="Generate the records request or enter your own reviewed request."
          />
        </SectionCard>
      )}

      {currentStep.id === "review" && (
        <>
          <SectionCard
            title="5. Build the exact request packet"
            description="Enter and verify the actual delivery address. The exact packet hash and server-authoritative price are bound to approval."
          >
            <AddressFields value={recipient} onChange={setRecipient} />
            <Field label="Mailing method">
              <select
                className="wf-input"
                value={mailClass}
                onChange={(event) => {
                  setMailClass(
                    event.target.value as
                      | "standard"
                      | "certified"
                      | "registered",
                  );
                  setPacket(null);
                  setApprovalId("");
                }}
              >
                <option value="standard">Standard mail</option>
                <option value="certified">Certified mail</option>
                <option value="registered">Registered mail</option>
              </select>
            </Field>
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void buildPreview()}
              disabled={!draftSaved || !addressReady(recipient) || Boolean(busy)}
            >
              {busy === "preview" ? "Building…" : "Build exact packet preview"}
            </button>
          </SectionCard>
          {packet && (
            <ApprovalChecklist
              reviewItems={[
                {
                  id: "hash",
                  label: "Exact packet SHA-256",
                  detail: packet.packetSha256,
                  status: "Built",
                  tone: "success",
                },
                {
                  id: "pages",
                  label: "Packet pages",
                  detail: String(packet.responsePages + packet.supportingPages),
                  status: "Measured",
                  tone: "info",
                },
                {
                  id: "price",
                  label: "Server-authoritative total",
                  detail: `$${(packet.quote.totalCents / 100).toFixed(2)}`,
                  status: "Quoted",
                  tone: "info",
                },
                {
                  id: "recipient",
                  label: "Recipient",
                  detail: `${recipient.name}, ${recipient.line1}, ${recipient.city}, ${recipient.state} ${recipient.postal}`,
                  status: "Review",
                  tone: "warning",
                },
              ]}
              confirmations={[
                {
                  id: "content",
                  label:
                    "I reviewed the exact request and every included context document.",
                },
                {
                  id: "recipient",
                  label:
                    "I confirmed the delivery address for this agency or records custodian.",
                },
              ]}
              approveLabel={
                busy === "approve"
                  ? "Approving…"
                  : "Approve this exact request packet"
              }
              onApprove={approve}
            />
          )}
        </>
      )}

      {currentStep.id === "send" && (
        <FulfillmentPanel
          phase={trustedSend ? "complete" : approvalId ? "payment" : "review"}
          title="6. Pay, send, and confirm the actual send"
          description="Checkout is bound to the immutable approval. Response tracking does not begin until a trusted provider/system event confirms the actual send."
          details={[
            { label: "Approval", value: approvalId || "Not approved" },
            { label: "Mail class", value: mailClass },
            {
              label: "Actual send",
              value: trustedSend?.occurredOn ?? "Not yet provider-confirmed",
            },
          ]}
          actions={
            trustedSend ? (
              <button
                className="wf-btn wf-btn--primary"
                type="button"
                onClick={() =>
                  setStepIndex(
                    RECORDS_REQUEST_STEPS.findIndex(
                      (step) => step.id === "response",
                    ),
                  )
                }
              >
                Continue to response tracking
              </button>
            ) : (
              <button
                className="wf-btn wf-btn--primary"
                type="button"
                onClick={() => void checkout()}
                disabled={!approvalId || !addressReady(sender) || Boolean(busy)}
              >
                Continue to secure payment
              </button>
            )
          }
        >
          {!trustedSend && (
            <SectionCard
              title="Return address"
              description="Used as the sender/return address for the approved mailing."
            >
              <AddressFields value={sender} onChange={setSender} />
            </SectionCard>
          )}
        </FulfillmentPanel>
      )}

      {currentStep.id === "response" && (
        <SectionCard
          title="7. Record the agency response"
          description="Record an actual received response, or explicitly record non-response on a real observation date. Silence is never inferred automatically."
          footer={
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void recordResponse()}
              disabled={
                !trustedSend ||
                Boolean(responseOutcome) ||
                Boolean(busy) ||
                (responded ? !responseDate : !observationDate)
              }
            >
              {busy === "response" ? "Recording…" : "Record response outcome"}
            </button>
          }
        >
          {responseOutcome ? (
            <div className="wf-callout wf-callout--success">
              Response outcome recorded: {responseOutcome.type} on{" "}
              {responseOutcome.occurredOn}.
            </div>
          ) : (
            <>
              <CheckboxField
                checked={responded}
                onChange={(event) => setResponded(event.target.checked)}
                label="The agency sent a response."
              />
              {responded ? (
                <Field label="Response date" required>
                  <TextField
                    type="date"
                    value={responseDate}
                    onChange={(event) => setResponseDate(event.target.value)}
                  />
                </Field>
              ) : (
                <Field label="Observation date" required>
                  <TextField
                    type="date"
                    value={observationDate}
                    onChange={(event) => setObservationDate(event.target.value)}
                  />
                </Field>
              )}
              <Field label="Response note">
                <TextArea
                  rows={5}
                  value={responseNote}
                  onChange={(event) => setResponseNote(event.target.value)}
                />
              </Field>
            </>
          )}
        </SectionCard>
      )}

      <div className="wf-draft-actions">
        <button
          className="wf-btn wf-btn--outline"
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
        >
          Back
        </button>
        {currentStep.id !== "response" && currentStep.id !== "send" && (
          <button
            className="wf-btn wf-btn--primary"
            type="button"
            disabled={!stepReady(currentStep.id)}
            onClick={() =>
              setStepIndex((value) =>
                Math.min(RECORDS_REQUEST_STEPS.length - 1, value + 1),
              )
            }
          >
            Continue
          </button>
        )}
      </div>
    </StepShell>
  );
}

function AddressFields({
  value,
  onChange,
}: {
  value: WorkflowMailingAddress;
  onChange: (next: WorkflowMailingAddress) => void;
}) {
  return (
    <div className="wf-form-grid">
      <Field label="Name" required>
        <TextField
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </Field>
      <Field label="Address line 1" required>
        <TextField
          value={value.line1}
          onChange={(event) => onChange({ ...value, line1: event.target.value })}
        />
      </Field>
      <Field label="Address line 2">
        <TextField
          value={value.line2 ?? ""}
          onChange={(event) => onChange({ ...value, line2: event.target.value })}
        />
      </Field>
      <Field label="City" required>
        <TextField
          value={value.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
        />
      </Field>
      <Field label="State" required>
        <TextField
          maxLength={2}
          value={value.state}
          onChange={(event) =>
            onChange({ ...value, state: event.target.value.toUpperCase() })
          }
        />
      </Field>
      <Field label="ZIP" required>
        <TextField
          value={value.postal}
          onChange={(event) =>
            onChange({ ...value, postal: event.target.value })
          }
        />
      </Field>
    </div>
  );
}
