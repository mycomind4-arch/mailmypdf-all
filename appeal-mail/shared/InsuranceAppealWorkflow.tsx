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
  INSURANCE_APPEAL_EVIDENCE_KINDS,
  INSURANCE_APPEAL_STEPS,
  completedInsuranceAppealSteps,
  createHttpWorkflowMatterClient,
  insuranceAppealStepLabel,
  type InsuranceAppealEvidenceKind,
  type InsuranceAppealStepId,
  type WorkflowMailingAddress,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowPacketPreview,
} from "@mailmypdf/workflows";

export interface InsuranceAppealWorkflowUiConfig {
  workflowId: string;
  title: string;
  primaryDocumentLabel?: string;
  sourcePurpose?: string;
  backHref?: string;
  subtitle?: string;
  defaultRequestedOutcome?: string;
}

interface AppealFacts {
  claimantName: string;
  claimantAddress: string;
  phone: string;
  claimNumber: string;
  organizationName: string;
  reasonsForDisagreement: string;
  requestedOutcome: string;
  additionalFacts: string;
}

const client = createHttpWorkflowMatterClient({ basePath: "/api/workflow-runtime" });

const EMPTY_ADDRESS: WorkflowMailingAddress = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal: "",
};

function emptyFacts(defaultRequestedOutcome: string): AppealFacts {
  return {
    claimantName: "",
    claimantAddress: "",
    phone: "",
    claimNumber: "",
    organizationName: "",
    reasonsForDisagreement: "",
    requestedOutcome: defaultRequestedOutcome,
    additionalFacts: "",
  };
}

function addressReady(value: WorkflowMailingAddress): boolean {
  return Boolean(
    value.name.trim() &&
    value.line1.trim() &&
    value.city.trim() &&
    /^[A-Za-z]{2}$/.test(value.state.trim()) &&
    /^\d{5}(?:-\d{4})?$/.test(value.postal.trim()),
  );
}

function responseAddressFromAnalysis(
  analysis: WorkflowMatterAnalysis | null,
): WorkflowMailingAddress | null {
  const raw = analysis?.result.workflowDetails?.responseAddress;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const line1 = typeof value.line1 === "string" ? value.line1.trim() : "";
  const city = typeof value.city === "string" ? value.city.trim() : "";
  const state = typeof value.state === "string" ? value.state.trim().toUpperCase() : "";
  const postal = typeof value.postal === "string" ? value.postal.trim() : "";
  if (!line1 || !city || !state || !postal) return null;
  return {
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim()
        : "Claims Appeals Department",
    line1,
    line2: typeof value.line2 === "string" ? value.line2.trim() : "",
    city,
    state,
    postal,
  };
}

function evidenceLabel(kind: string | null): string {
  return (
    INSURANCE_APPEAL_EVIDENCE_KINDS.find(([value]) => value === kind)?.[1] ??
    kind ??
    "Supporting document"
  );
}

function sourceReady(document: WorkflowMatterDocument | null): boolean {
  return Boolean(document?.usable && document.securityStatus === "clean");
}

export function InsuranceAppealWorkflow({ config }: { config: InsuranceAppealWorkflowUiConfig }) {
  const primaryDocumentLabel = config.primaryDocumentLabel?.trim() || "Denial letter";
  const backHref = config.backHref ?? `/appeal-mail/workflows/${config.workflowId}`;
  const defaultRequestedOutcome =
    config.defaultRequestedOutcome ??
    "Reconsider the denial based on the information and evidence in this appeal.";
  const matterSessionKey = `mailmypdf:${config.workflowId}:matter`;
  const orderSessionKey = `mailmypdf:${config.workflowId}:order`;
  const steps = useMemo(
    () =>
      INSURANCE_APPEAL_STEPS.map((step) => ({
        ...step,
        label: insuranceAppealStepLabel(step.id, primaryDocumentLabel),
      })),
    [primaryDocumentLabel],
  );

  const [matterId, setMatterId] = useState("");
  const [documents, setDocuments] = useState<WorkflowMatterDocument[]>([]);
  const [analysis, setAnalysis] = useState<WorkflowMatterAnalysis | null>(null);
  const [facts, setFacts] = useState<AppealFacts>(() => emptyFacts(defaultRequestedOutcome));
  const [factsSaved, setFactsSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [evidenceKind, setEvidenceKind] =
    useState<InsuranceAppealEvidenceKind>("supporting_record");
  const [packet, setPacket] = useState<WorkflowPacketPreview | null>(null);
  const [approvalId, setApprovalId] = useState("");
  const [recipient, setRecipient] = useState<WorkflowMailingAddress>(EMPTY_ADDRESS);
  const [sender, setSender] = useState<WorkflowMailingAddress>(EMPTY_ADDRESS);
  const [mailClass, setMailClass] =
    useState<"standard" | "certified" | "registered">("certified");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const sourceDocument =
    documents.find((document) => document.role === "subject_notice") ?? null;
  const evidence = documents.filter((document) => document.role === "evidence");
  const hasCleanSource = sourceReady(sourceDocument);
  const analysisReady = Boolean(analysis?.result.summary.trim());

  const completedStepIds = useMemo(
    () =>
      completedInsuranceAppealSteps({
        hasCleanDecision: hasCleanSource,
        hasAnalysis: analysisReady,
        hasFacts: factsSaved,
        hasEvidenceReview: factsSaved,
        hasDraft: draftSaved,
        hasApproval: Boolean(approvalId),
      }),
    [hasCleanSource, analysisReady, factsSaved, draftSaved, approvalId],
  );

  const currentStep = steps[stepIndex] ?? steps[0]!;

  function invalidateAfterSourceChange(): void {
    setAnalysis(null);
    setFactsSaved(false);
    setDraft("");
    setDraftSaved(false);
    setPacket(null);
    setApprovalId("");
  }

  function invalidateAfterAnalysisChange(): void {
    setDraftSaved(false);
    setPacket(null);
    setApprovalId("");
  }

  function invalidateAfterEvidenceChange(): void {
    setDraftSaved(false);
    setPacket(null);
    setApprovalId("");
  }

  function invalidateAfterDraftChange(): void {
    setDraftSaved(false);
    setPacket(null);
    setApprovalId("");
  }

  function invalidateApproval(): void {
    setPacket(null);
    setApprovalId("");
  }

  async function refresh(id = matterId): Promise<void> {
    if (!id) return;
    const snapshot = await client.loadMatter(id);
    setDocuments(snapshot.documents);
  }

  async function restore(id: string): Promise<void> {
    setBusy("restore");
    setError("");
    try {
      const [snapshot, storedAnalysis, storedInput, storedDraft, storedApproval] =
        await Promise.all([
          client.loadMatter(id),
          client.loadAnalysis(id),
          client.loadInput(id),
          client.loadDraft(id),
          client.loadApproval(id),
        ]);
      if (snapshot.matter.workflowId !== config.workflowId || snapshot.matter.verticalId !== "appeal-mail") {
        throw new Error("This saved matter belongs to a different workflow.");
      }
      setDocuments(snapshot.documents);
      setAnalysis(storedAnalysis);
      if (storedInput?.input) {
        setFacts({
          ...emptyFacts(defaultRequestedOutcome),
          ...(storedInput.input as Partial<AppealFacts>),
        });
        setFactsSaved(true);
      }
      if (storedDraft?.bodyText) {
        setDraft(storedDraft.bodyText);
        setDraftSaved(true);
      }
      if (storedApproval?.approvalId) setApprovalId(storedApproval.approvalId);
      const inferred = completedInsuranceAppealSteps({
        hasCleanDecision: snapshot.documents.some(
          (document) =>
            document.role === "subject_notice" &&
            document.usable &&
            document.securityStatus === "clean",
        ),
        hasAnalysis: Boolean(storedAnalysis?.result.summary.trim()),
        hasFacts: Boolean(storedInput),
        hasEvidenceReview: Boolean(storedInput),
        hasDraft: Boolean(storedDraft?.bodyText),
        hasApproval: Boolean(storedApproval?.approvalId),
      });
      setStepIndex(Math.min(inferred.length, steps.length - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restore this appeal matter.");
      sessionStorage.removeItem(matterSessionKey);
      setMatterId("");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("matter");
    const stored = fromUrl || sessionStorage.getItem(matterSessionKey);
    if (!stored) return;
    setMatterId(stored);
    sessionStorage.setItem(matterSessionKey, stored);
    void restore(stored);
    // Config identity and the session key are immutable for one mounted workflow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !matterId ||
      !documents.some(
        (document) => !document.usable && document.securityStatus !== "rejected",
      )
    ) {
      return;
    }
    const timer = window.setInterval(
      () => void refresh(matterId).catch(() => undefined),
      3_000,
    );
    return () => window.clearInterval(timer);
  }, [matterId, documents]);

  async function ensureMatter(): Promise<string> {
    if (matterId) return matterId;
    const created = await client.createMatter({
      workflowId: config.workflowId,
      verticalId: "appeal-mail",
    });
    setMatterId(created.id);
    sessionStorage.setItem(matterSessionKey, created.id);
    return created.id;
  }

  async function uploadSource(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;
    const id = await ensureMatter();
    setBusy("upload-source");
    setError("");
    try {
      if (sourceDocument) await client.detachDocument(id, sourceDocument.documentId);
      const uploaded = await client.uploadDocument({
        file,
        workflowId: config.workflowId,
        purpose: config.sourcePurpose ?? "claim_denial_notice",
      });
      setDocuments(
        await client.attachDocument({
          matterId: id,
          documentId: uploaded.id,
          role: "subject_notice",
          position: 0,
        }),
      );
      invalidateAfterSourceChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to upload the ${primaryDocumentLabel.toLowerCase()}.`);
    } finally {
      setBusy("");
    }
  }

  async function analyzeSource(): Promise<void> {
    if (!matterId) return;
    setBusy("analyze");
    setError("");
    try {
      const next = await client.analyze(matterId);
      setAnalysis(next);
      const detectedAddress = responseAddressFromAnalysis(next);
      if (detectedAddress) setRecipient(detectedAddress);
      invalidateAfterAnalysisChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to analyze the ${primaryDocumentLabel.toLowerCase()}.`);
    } finally {
      setBusy("");
    }
  }

  function updateFact<Key extends keyof AppealFacts>(key: Key, value: AppealFacts[Key]): void {
    setFacts((current) => ({ ...current, [key]: value }));
    setFactsSaved(false);
    invalidateAfterDraftChange();
  }

  async function saveFacts(): Promise<void> {
    if (!matterId) return;
    setBusy("save-facts");
    setError("");
    try {
      await client.saveInput(matterId, facts);
      setFactsSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save appeal facts.");
    } finally {
      setBusy("");
    }
  }

  async function uploadEvidence(files: File[]): Promise<void> {
    const id = await ensureMatter();
    setBusy("upload-evidence");
    setError("");
    try {
      let position = documents.length + 1;
      let nextDocuments = documents;
      for (const file of files) {
        const uploaded = await client.uploadDocument({
          file,
          workflowId: config.workflowId,
          purpose: evidenceKind,
        });
        nextDocuments = await client.attachDocument({
          matterId: id,
          documentId: uploaded.id,
          role: "evidence",
          evidenceKind,
          position: position++,
        });
      }
      setDocuments(nextDocuments);
      invalidateAfterEvidenceChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload supporting evidence.");
    } finally {
      setBusy("");
    }
  }

  async function removeDocument(documentId: string): Promise<void> {
    if (!matterId) return;
    setError("");
    try {
      const removed = documents.find((document) => document.documentId === documentId);
      setDocuments(await client.detachDocument(matterId, documentId));
      if (removed?.role === "subject_notice") invalidateAfterSourceChange();
      else invalidateAfterEvidenceChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove the document.");
    }
  }

  async function toggleIncluded(document: WorkflowMatterDocument): Promise<void> {
    if (!matterId || document.role !== "evidence") return;
    setError("");
    try {
      setDocuments(
        await client.updateDocument({
          matterId,
          documentId: document.documentId,
          included: !document.included,
        }),
      );
      invalidateAfterEvidenceChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update supporting evidence.");
    }
  }

  async function generateDraft(): Promise<void> {
    if (!matterId) return;
    setBusy("generate-draft");
    setError("");
    try {
      const generated = await client.generateDraft(matterId);
      setDraft(generated.bodyText);
      invalidateAfterDraftChange();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate the appeal draft.");
    } finally {
      setBusy("");
    }
  }

  async function saveDraft(): Promise<void> {
    if (!matterId || !draft.trim()) return;
    setBusy("save-draft");
    setError("");
    try {
      await client.saveDraft(matterId, draft);
      setDraftSaved(true);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the appeal draft.");
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
      setApprovalId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to build the appeal packet.");
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
      setError(cause instanceof Error ? cause.message : "Unable to approve the exact packet.");
    } finally {
      setBusy("");
    }
  }

  async function checkout(): Promise<void> {
    if (!matterId || !approvalId) return;
    setBusy("checkout");
    setError("");
    try {
      const result = await client.checkout({ matterId, approvalId, sender });
      sessionStorage.setItem(orderSessionKey, result.orderId);
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open secure checkout.");
      setBusy("");
    }
  }

  function stepReady(step: InsuranceAppealStepId): boolean {
    if (step === "decision") return hasCleanSource;
    if (step === "analysis") return analysisReady;
    if (step === "facts" || step === "evidence") return factsSaved;
    if (step === "draft") return draftSaved;
    if (step === "review") return Boolean(approvalId);
    return false;
  }

  function changeRecipient(next: WorkflowMailingAddress): void {
    setRecipient(next);
    invalidateApproval();
  }

  const rail = (
    <>
      <StatusCard
        current={stepIndex + 1}
        total={steps.length}
        stepLabel={currentStep.label}
        state={approvalId ? "ready" : "in_progress"}
        summary={matterId ? "Secure matter active." : `Upload the ${primaryDocumentLabel.toLowerCase()} to open the matter.`}
      />
      <ReadinessChecklist
        title="Appeal readiness"
        items={[
          { id: "source", label: `${primaryDocumentLabel} cleared security scanning`, done: hasCleanSource },
          { id: "analysis", label: "Denial analyzed", done: analysisReady },
          { id: "facts", label: "Appeal facts confirmed", done: factsSaved },
          { id: "draft", label: "Appeal draft reviewed and saved", done: draftSaved },
          { id: "approval", label: "Exact packet approved", done: Boolean(approvalId) },
        ]}
      />
    </>
  );

  return (
    <StepShell
      breadcrumb={[
        { label: "Appeal Mail", href: "/appeal-mail" },
        { label: config.title, href: backHref },
        { label: currentStep.label },
      ]}
      title={config.title}
      subtitle={
        config.subtitle ??
        "Build a source-grounded appeal from the actual denial, your confirmed facts, supporting evidence, exact packet review, mailing, and proof."
      }
      lastSavedLabel={matterId ? "Matter saved" : undefined}
      steps={steps}
      currentStepId={currentStep.id}
      completedStepIds={completedStepIds}
      onStepClick={(id) => {
        const target = steps.findIndex((step) => step.id === id);
        if (
          target >= 0 &&
          (target <= stepIndex || completedStepIds.includes(id as InsuranceAppealStepId))
        ) {
          setStepIndex(target);
        }
      }}
      rail={rail}
    >
      {error && <div className="wf-callout wf-callout--danger">{error}</div>}

      {currentStep.id === "decision" && (
        <DocumentUpload
          title={`1. Upload the ${primaryDocumentLabel.toLowerCase()}`}
          description="The actual denial is the source record. It is quarantined and scanned before analysis."
          multiple={false}
          items={
            sourceDocument
              ? [
                  {
                    id: sourceDocument.documentId,
                    name: sourceDocument.filename,
                    sizeBytes: sourceDocument.sizeBytes ?? undefined,
                    status: sourceDocument.usable ? "Clean and ready" : sourceDocument.securityStatus,
                    category: "Source denial",
                  },
                ]
              : []
          }
          onUpload={uploadSource}
          onRemove={sourceDocument ? () => removeDocument(sourceDocument.documentId) : undefined}
        />
      )}

      {currentStep.id === "analysis" && (
        <SectionCard
          title="2. Analyze the denial"
          description="Identify the issuer, denial reason, important dates, deadline, appeal instructions, and response destination from the source document."
          footer={
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void analyzeSource()}
              disabled={!hasCleanSource || Boolean(busy)}
            >
              {busy === "analyze" ? "Analyzing…" : analysis ? "Analyze again" : "Analyze denial"}
            </button>
          }
        >
          {analysis ? (
            <div className="wf-review-list">
              {[
                ["Decision", analysis.result.decision ?? "Not confirmed"],
                ["Issuer", analysis.result.issuer ?? "Not confirmed"],
                ["Decision date", analysis.result.decisionDate ?? "Not confirmed"],
                ["Deadline", analysis.result.deadline ?? "Not confirmed"],
              ].map(([label, value]) => (
                <div className="wf-review-row" key={label}>
                  <div className="wf-review-copy">
                    <strong>{label}</strong>
                    <div className="wf-review-detail">{value}</div>
                  </div>
                </div>
              ))}
              <div className="wf-callout wf-callout--info">{analysis.result.summary}</div>
            </div>
          ) : (
            <p>Run analysis after the source document clears security scanning.</p>
          )}
        </SectionCard>
      )}

      {currentStep.id === "facts" && (
        <SectionCard
          title="3. Confirm your appeal facts"
          description="Your facts are stored separately from information extracted from the denial document."
          footer={
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void saveFacts()}
              disabled={Boolean(busy)}
            >
              Save appeal facts
            </button>
          }
        >
          <div className="wf-form-grid">
            <Field label="Claimant name" required>
              <TextField value={facts.claimantName} onChange={(event) => updateFact("claimantName", event.target.value)} />
            </Field>
            <Field label="Phone">
              <TextField value={facts.phone} onChange={(event) => updateFact("phone", event.target.value)} />
            </Field>
            <Field label="Claim or reference number">
              <TextField value={facts.claimNumber} onChange={(event) => updateFact("claimNumber", event.target.value)} />
            </Field>
            <Field label="Organization that issued the denial">
              <TextField value={facts.organizationName} onChange={(event) => updateFact("organizationName", event.target.value)} />
            </Field>
          </div>
          <Field label="Mailing address" required>
            <TextArea rows={3} value={facts.claimantAddress} onChange={(event) => updateFact("claimantAddress", event.target.value)} />
          </Field>
          <Field label="Why is the denial wrong or incomplete?" required>
            <TextArea rows={7} value={facts.reasonsForDisagreement} onChange={(event) => updateFact("reasonsForDisagreement", event.target.value)} />
          </Field>
          <Field label="Requested outcome" required>
            <TextArea rows={3} value={facts.requestedOutcome} onChange={(event) => updateFact("requestedOutcome", event.target.value)} />
          </Field>
          <Field label="Additional facts">
            <TextArea rows={5} value={facts.additionalFacts} onChange={(event) => updateFact("additionalFacts", event.target.value)} />
          </Field>
        </SectionCard>
      )}

      {currentStep.id === "evidence" && (
        <>
          <SectionCard
            title="4. Supporting evidence"
            description="Choose a category before upload. Only explicitly included clean documents enter the final packet."
          >
            <Field label="Evidence type">
              <select
                className="wf-input"
                value={evidenceKind}
                onChange={(event) => setEvidenceKind(event.target.value as InsuranceAppealEvidenceKind)}
              >
                {INSURANCE_APPEAL_EVIDENCE_KINDS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </SectionCard>
          <DocumentUpload
            title="Upload evidence"
            items={evidence.map((document) => ({
              id: document.documentId,
              name: document.filename,
              sizeBytes: document.sizeBytes ?? undefined,
              status: document.usable
                ? document.included
                  ? "Included"
                  : "Excluded"
                : document.securityStatus,
              category: evidenceLabel(document.evidenceKind),
            }))}
            onUpload={uploadEvidence}
            onRemove={removeDocument}
          />
          {evidence.map((document) => (
            <CheckboxField
              key={document.documentId}
              checked={document.included}
              onChange={() => void toggleIncluded(document)}
              label={`Include ${document.filename} in the outgoing packet`}
            />
          ))}
        </>
      )}

      {currentStep.id === "draft" && (
        <SectionCard
          title="5. Draft the appeal"
          description="Generate a source-grounded appeal using the denial, confirmed facts, and selected evidence. Edit it before saving."
          footer={
            <div className="wf-draft-actions">
              <button
                className="wf-btn wf-btn--outline"
                type="button"
                onClick={() => void generateDraft()}
                disabled={!factsSaved || Boolean(busy)}
              >
                Generate draft
              </button>
              <button
                className="wf-btn wf-btn--primary"
                type="button"
                onClick={() => void saveDraft()}
                disabled={!draft.trim() || Boolean(busy)}
              >
                Save reviewed draft
              </button>
            </div>
          }
        >
          <TextArea
            rows={20}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              invalidateAfterDraftChange();
            }}
            placeholder="Generate the appeal draft or enter your own response."
          />
        </SectionCard>
      )}

      {currentStep.id === "review" && (
        <>
          <SectionCard
            title="6. Build the exact packet"
            description="Confirm the appeal mailing destination and build the exact PDF that will be approved and mailed."
          >
            <AddressFields value={recipient} onChange={changeRecipient} />
            <Field label="Mailing method">
              <select
                className="wf-input"
                value={mailClass}
                onChange={(event) => {
                  setMailClass(event.target.value as typeof mailClass);
                  invalidateApproval();
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
                { id: "hash", label: "Exact packet SHA-256", detail: packet.packetSha256, status: "Built", tone: "success" },
                { id: "pages", label: "Packet pages", detail: String(packet.responsePages + packet.supportingPages), status: "Measured", tone: "info" },
                { id: "price", label: "Server-authoritative total", detail: `$${(packet.quote.totalCents / 100).toFixed(2)}`, status: "Quoted", tone: "info" },
                { id: "recipient", label: "Recipient", detail: `${recipient.name}, ${recipient.line1}, ${recipient.city}, ${recipient.state} ${recipient.postal}`, status: "Review", tone: "warning" },
              ]}
              confirmations={[
                { id: "content", label: "I reviewed the appeal and every included document." },
                { id: "recipient", label: "I confirmed the mailing destination against the denial or current appeal instructions." },
              ]}
              approveLabel={busy === "approve" ? "Approving…" : "Approve this exact packet"}
              onApprove={approve}
            />
          )}
        </>
      )}

      {currentStep.id === "mail" && (
        <FulfillmentPanel
          phase={approvalId ? "payment" : "review"}
          title="7. Pay, mail, track, and retain proof"
          description="Payment and mailing are tied to the immutable approval so retries cannot silently mail a different packet."
          details={[
            { label: "Approval", value: approvalId || "Not approved" },
            { label: "Mail class", value: mailClass },
            { label: "Packet hash", value: packet?.packetSha256 ?? "Stored with approval" },
          ]}
          actions={
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void checkout()}
              disabled={!approvalId || !addressReady(sender) || Boolean(busy)}
            >
              Continue to secure payment
            </button>
          }
        >
          <SectionCard
            title="Return address"
            description="Used as the sender/return address for the approved mailing."
          >
            <AddressFields value={sender} onChange={setSender} />
          </SectionCard>
        </FulfillmentPanel>
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
        {currentStep.id !== "mail" && (
          <button
            className="wf-btn wf-btn--primary"
            type="button"
            disabled={!stepReady(currentStep.id)}
            onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))}
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
        <TextField value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </Field>
      <Field label="Address line 1" required>
        <TextField value={value.line1} onChange={(event) => onChange({ ...value, line1: event.target.value })} />
      </Field>
      <Field label="Address line 2">
        <TextField value={value.line2 ?? ""} onChange={(event) => onChange({ ...value, line2: event.target.value })} />
      </Field>
      <Field label="City" required>
        <TextField value={value.city} onChange={(event) => onChange({ ...value, city: event.target.value })} />
      </Field>
      <Field label="State" required>
        <TextField maxLength={2} value={value.state} onChange={(event) => onChange({ ...value, state: event.target.value.toUpperCase() })} />
      </Field>
      <Field label="ZIP" required>
        <TextField value={value.postal} onChange={(event) => onChange({ ...value, postal: event.target.value })} />
      </Field>
    </div>
  );
}

export default InsuranceAppealWorkflow;
