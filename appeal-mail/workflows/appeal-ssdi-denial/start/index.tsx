import { useEffect, useMemo, useState } from "react";
import {
  ApprovalChecklist,
  DocumentUpload,
  DraftReview,
  EvidenceSummary,
  Field,
  FulfillmentPanel,
  PacketSummary,
  ReadinessChecklist,
  SectionCard,
  StatusCard,
  StepShell,
  StructuredAnalysisPanel,
  TextArea,
  TextField,
} from "../../../../packages/workflow-ui/src/index";
import "../../../../packages/workflow-ui/src/workflow-ui.css";
import {
  analyzeWorkflowCase,
  approveWorkflowPacket,
  attachWorkflowDocument,
  checkoutWorkflowCase,
  createWorkflowCase,
  detachWorkflowDocument,
  generateWorkflowDraft,
  loadWorkflowAnalysis,
  loadWorkflowApproval,
  loadWorkflowCase,
  loadWorkflowDraft,
  loadWorkflowInput,
  previewWorkflowPacket,
  saveWorkflowDraft,
  saveWorkflowInput,
  updateWorkflowDocument,
  uploadSecureWorkflowDocument,
  type MailingAddress,
  type PacketPreview,
  type WorkflowAnalysis,
  type WorkflowCaseDocument,
} from "../../../../apps/mailmypdf/src/lib/workflow-case-client";
import {
  SSDI_EVIDENCE_KINDS,
  SSDI_REQUIRED_FORMS,
  SSDI_STEPS,
  SSDI_VERTICAL_ID,
  SSDI_WORKFLOW_ID,
  hasRequiredSsdiForms,
  isSsdiReconsiderationStage,
  isSupportedSsdiDecisionBasis,
  requiredSsdiFormsForBasis,
  ssdiCompletedSteps,
  type SsdiDecisionBasis,
  type SsdiEvidenceKind,
  type SsdiStepId,
} from "./workflow";

type ClaimantFacts = {
  claimantName: string;
  claimantAddress: string;
  phone: string;
  representativeName: string;
  responseMode: "reconsideration";
  confirmedReconsideration: true;
  reasonsForDisagreement: string;
  conditionChanges: string;
  newConditions: string;
  treatmentChanges: string;
  medicationChanges: string;
  workChanges: string;
  dailyFunctionChanges: string;
  additionalFacts: string;
  requestedOutcome: string;
};

const EMPTY_FACTS: ClaimantFacts = {
  claimantName: "",
  claimantAddress: "",
  phone: "",
  representativeName: "",
  responseMode: "reconsideration",
  confirmedReconsideration: true,
  reasonsForDisagreement: "",
  conditionChanges: "",
  newConditions: "",
  treatmentChanges: "",
  medicationChanges: "",
  workChanges: "",
  dailyFunctionChanges: "",
  additionalFacts: "",
  requestedOutcome: "Reconsider the SSDI denial using the submitted information and evidence.",
};

const EMPTY_ADDRESS: MailingAddress = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal: "",
};

function currency(cents: number | undefined): string {
  if (!Number.isFinite(cents)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function currentAppealStage(analysis: WorkflowAnalysis | null): string {
  const details = analysis?.result.workflowDetails;
  if (!details || typeof details !== "object") return "unknown";
  const value = (details as Record<string, unknown>).appealStage;
  return typeof value === "string" ? value : "unknown";
}

function currentDecisionBasis(analysis: WorkflowAnalysis | null): SsdiDecisionBasis {
  const details = analysis?.result.workflowDetails;
  if (!details || typeof details !== "object") return "unknown";
  const value = (details as Record<string, unknown>).decisionBasis;
  return value === "medical" || value === "nonmedical" ? value : "unknown";
}

function responseAddressFromAnalysis(analysis: WorkflowAnalysis | null): MailingAddress | null {
  const details = analysis?.result.workflowDetails;
  if (!details || typeof details !== "object") return null;
  const raw = (details as Record<string, unknown>).responseAddress;
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const line1 = typeof value.line1 === "string" ? value.line1 : "";
  const city = typeof value.city === "string" ? value.city : "";
  const state = typeof value.state === "string" ? value.state : "";
  const postal = typeof value.postal === "string" ? value.postal : "";
  if (!line1 || !city || !state || !postal) return null;
  return {
    name: "Social Security Administration",
    line1,
    line2: typeof value.line2 === "string" ? value.line2 : "",
    city,
    state,
    postal,
  };
}

function completeAddress(address: MailingAddress): boolean {
  return Boolean(address.name.trim() && address.line1.trim() && address.city.trim() && /^[A-Za-z]{2}$/.test(address.state.trim()) && /^\d{5}(-\d{4})?$/.test(address.postal.trim()));
}

function evidenceLabel(kind: string | null): string {
  const option = SSDI_EVIDENCE_KINDS.find(([value]) => value === kind);
  if (option) return option[1];
  const form = SSDI_REQUIRED_FORMS.find((item) => item.kind === kind);
  return form?.label ?? kind ?? "Supporting document";
}

export default function SsdiDenialWorkflow() {
  const [caseId, setCaseId] = useState("");
  const [documents, setDocuments] = useState<WorkflowCaseDocument[]>([]);
  const [analysis, setAnalysis] = useState<WorkflowAnalysis | null>(null);
  const [facts, setFacts] = useState<ClaimantFacts>(EMPTY_FACTS);
  const [factsSaved, setFactsSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [evidenceKind, setEvidenceKind] = useState<SsdiEvidenceKind>("medical_records");
  const [mailClass, setMailClass] = useState<"standard" | "certified" | "registered">("certified");
  const [recipient, setRecipient] = useState<MailingAddress>(EMPTY_ADDRESS);
  const [sender, setSender] = useState<MailingAddress>(EMPTY_ADDRESS);
  const [packet, setPacket] = useState<PacketPreview | null>(null);
  const [approvalId, setApprovalId] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const subjectNotice = documents.find((document) => document.role === "subject_notice") ?? null;
  const evidence = documents.filter((document) => document.role === "evidence");
  const appealStage = currentAppealStage(analysis);
  const decisionBasis = currentDecisionBasis(analysis);
  const cleanDecision = Boolean(subjectNotice?.usable);
  const reconsiderationAnalysis = Boolean(
    analysis &&
    isSsdiReconsiderationStage(appealStage) &&
    isSupportedSsdiDecisionBasis(decisionBasis),
  );
  const requiredForms = requiredSsdiFormsForBasis(decisionBasis);
  const requiredFormsComplete = hasRequiredSsdiForms(documents, decisionBasis);

  const completedStepIds = useMemo(
    () =>
      ssdiCompletedSteps({
        hasCleanDecision: cleanDecision,
        hasReconsiderationAnalysis: reconsiderationAnalysis,
        hasClaimantFacts: factsSaved,
        hasDraft: draftSaved,
        hasRequiredForms: requiredFormsComplete,
        hasApproval: Boolean(approvalId),
      }),
    [cleanDecision, reconsiderationAnalysis, factsSaved, draftSaved, requiredFormsComplete, approvalId],
  );

  const currentStep = SSDI_STEPS[stepIndex]!;
  const readinessItems = [
    { id: "decision", label: "SSDI denial notice scanned clean", done: cleanDecision },
    { id: "analysis", label: "Reconsideration level confirmed", done: reconsiderationAnalysis },
    { id: "facts", label: "Claimant facts saved", done: factsSaved },
    { id: "draft", label: "Response draft saved", done: draftSaved },
    { id: "forms", label: decisionBasis === "medical" ? "SSA-561, SSA-3441 and SSA-827 included" : decisionBasis === "nonmedical" ? "SSA-561 included" : "Required SSA forms identified", done: requiredFormsComplete },
    { id: "approval", label: "Exact packet approved", done: Boolean(approvalId) },
  ];

  async function refreshCase(targetCaseId = caseId) {
    if (!targetCaseId) return;
    const snapshot = await loadWorkflowCase(targetCaseId);
    setDocuments(snapshot.documents);
  }

  async function restore(targetCaseId: string) {
    setBusy("restore");
    setError("");
    try {
      const [snapshot, storedAnalysis, storedInput, storedDraft, storedApproval] = await Promise.all([
        loadWorkflowCase(targetCaseId),
        loadWorkflowAnalysis(targetCaseId),
        loadWorkflowInput(targetCaseId),
        loadWorkflowDraft(targetCaseId),
        loadWorkflowApproval(targetCaseId),
      ]);
      setDocuments(snapshot.documents);
      setAnalysis(storedAnalysis);
      if (storedInput?.input) {
        setFacts({ ...EMPTY_FACTS, ...(storedInput.input as Partial<ClaimantFacts>) });
        setFactsSaved(true);
      }
      if (storedDraft?.bodyText) {
        setDraft(storedDraft.bodyText);
        setDraftSaved(true);
      }
      if (storedApproval?.approvalId) setApprovalId(storedApproval.approvalId);

      const inferred = ssdiCompletedSteps({
        hasCleanDecision: snapshot.documents.some((document) => document.role === "subject_notice" && document.usable),
        hasReconsiderationAnalysis: Boolean(
          storedAnalysis &&
          isSsdiReconsiderationStage(currentAppealStage(storedAnalysis)) &&
          isSupportedSsdiDecisionBasis(currentDecisionBasis(storedAnalysis)),
        ),
        hasClaimantFacts: Boolean(storedInput),
        hasDraft: Boolean(storedDraft?.bodyText),
        hasRequiredForms: hasRequiredSsdiForms(snapshot.documents, currentDecisionBasis(storedAnalysis)),
        hasApproval: Boolean(storedApproval?.approvalId),
      });
      setStepIndex(Math.min(inferred.length, SSDI_STEPS.length - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restore this SSDI matter.");
      sessionStorage.removeItem("mailmypdf:ssdi-denial:case");
      setCaseId("");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("mailmypdf:ssdi-denial:case");
    if (stored) {
      setCaseId(stored);
      void restore(stored);
    }
  }, []);

  useEffect(() => {
    if (!caseId || !documents.some((document) => !document.usable && document.security_status !== "rejected")) return;
    const timer = window.setInterval(() => void refreshCase(caseId).catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [caseId, documents]);

  async function ensureCase(): Promise<string> {
    if (caseId) return caseId;
    const created = await createWorkflowCase(SSDI_WORKFLOW_ID, SSDI_VERTICAL_ID);
    setCaseId(created.id);
    sessionStorage.setItem("mailmypdf:ssdi-denial:case", created.id);
    return created.id;
  }

  async function uploadDecision(files: File[]) {
    const id = await ensureCase();
    setBusy("decision-upload");
    setError("");
    try {
      if (subjectNotice) {
        await detachWorkflowDocument(id, subjectNotice.document_id);
      }
      const file = files[0];
      if (!file) return;
      const stored = await uploadSecureWorkflowDocument({
        file,
        workflowId: SSDI_WORKFLOW_ID,
        purpose: "ssdi_denial_notice",
      });
      const next = await attachWorkflowDocument({
        caseId: id,
        documentId: stored.id,
        role: "subject_notice",
        position: 0,
      });
      setDocuments(next);
      setAnalysis(null);
      setFactsSaved(false);
      setDraft("");
      setDraftSaved(false);
      setPacket(null);
      setApprovalId("");
    } finally {
      setBusy("");
    }
  }

  async function analyzeDecision() {
    if (!caseId) return;
    setBusy("analysis");
    setError("");
    try {
      const next = await analyzeWorkflowCase(caseId);
      setAnalysis(next);
      const address = responseAddressFromAnalysis(next);
      if (address) setRecipient(address);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze the SSDI decision.");
    } finally {
      setBusy("");
    }
  }

  async function saveFacts() {
    if (!caseId) return;
    setBusy("facts");
    setError("");
    try {
      await saveWorkflowInput(caseId, facts);
      setFactsSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save claimant facts.");
    } finally {
      setBusy("");
    }
  }

  async function uploadEvidence(files: File[], kind: string) {
    const id = await ensureCase();
    setBusy("evidence-upload");
    setError("");
    try {
      let position = documents.length + 1;
      for (const file of files) {
        const stored = await uploadSecureWorkflowDocument({
          file,
          workflowId: SSDI_WORKFLOW_ID,
          purpose: kind,
        });
        const next = await attachWorkflowDocument({
          caseId: id,
          documentId: stored.id,
          role: "evidence",
          evidenceKind: kind,
          position: position++,
        });
        setDocuments(next);
      }
      setPacket(null);
      setApprovalId("");
    } finally {
      setBusy("");
    }
  }

  async function removeDocument(documentId: string) {
    if (!caseId) return;
    setDocuments(await detachWorkflowDocument(caseId, documentId));
    setPacket(null);
    setApprovalId("");
  }

  async function toggleIncluded(document: WorkflowCaseDocument) {
    if (!caseId || document.role !== "evidence") return;
    setDocuments(
      await updateWorkflowDocument({
        caseId,
        documentId: document.document_id,
        included: !document.included,
      }),
    );
    setPacket(null);
    setApprovalId("");
  }

  async function generateDraft() {
    if (!caseId) return;
    setBusy("draft-generate");
    setError("");
    try {
      const generated = await generateWorkflowDraft(caseId);
      setDraft(generated.bodyText);
      setDraftSaved(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate the SSDI response draft.");
    } finally {
      setBusy("");
    }
  }

  async function saveDraft() {
    if (!caseId || !draft.trim()) return;
    setBusy("draft-save");
    setError("");
    try {
      await saveWorkflowDraft(caseId, draft);
      setDraftSaved(true);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the SSDI response draft.");
    } finally {
      setBusy("");
    }
  }

  async function previewPacket() {
    if (!caseId) return;
    setBusy("preview");
    setError("");
    try {
      const next = await previewWorkflowPacket(caseId, mailClass);
      setPacket(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to build the packet preview.");
    } finally {
      setBusy("");
    }
  }

  async function approvePacket() {
    if (!caseId || !packet) return;
    setBusy("approve");
    setError("");
    try {
      const result = await approveWorkflowPacket({
        caseId,
        preview: packet,
        recipient,
        mailClass,
      });
      setApprovalId(result.approvalId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to approve the packet.");
    } finally {
      setBusy("");
    }
  }

  async function checkout() {
    if (!caseId || !approvalId) return;
    setBusy("checkout");
    setError("");
    try {
      const result = await checkoutWorkflowCase({ caseId, approvalId, sender });
      sessionStorage.setItem("mailmypdf:ssdi-denial:order", result.orderId);
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open secure checkout.");
      setBusy("");
    }
  }

  function canContinue(step: SsdiStepId): boolean {
    if (step === "decision") return cleanDecision;
    if (step === "analysis") return reconsiderationAnalysis;
    if (step === "claimant") return factsSaved;
    if (step === "evidence") return factsSaved;
    if (step === "draft") return draftSaved;
    if (step === "forms") return requiredFormsComplete;
    if (step === "review") return Boolean(approvalId);
    return false;
  }

  function nextStep() {
    if (!canContinue(currentStep.id)) return;
    setStepIndex((value) => Math.min(value + 1, SSDI_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setStepIndex((value) => Math.max(0, value - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep(id: string) {
    const target = SSDI_STEPS.findIndex((step) => step.id === id);
    if (target < 0) return;
    const completed = new Set(completedStepIds);
    if (target <= stepIndex || completed.has(id as SsdiStepId)) setStepIndex(target);
  }

  const rail = (
    <div className="wf-rail-stack">
      <StatusCard
        current={stepIndex + 1}
        total={SSDI_STEPS.length}
        stepLabel={currentStep.label}
        state={approvalId ? "ready" : "in_progress"}
        summary={caseId ? "Your secure SSDI matter is saved to this signed-in account." : "The matter opens when you upload the denial notice."}
      />
      <ReadinessChecklist title="Packet readiness" items={readinessItems} />
    </div>
  );

  return (
    <StepShell
      breadcrumb={[
        { label: "Appeal Mail", href: "/dashboard/workflows/appeal-mail" },
        { label: "Appeal SSDI Denial", href: "/dashboard/workflows/appeal-mail/appeal-ssdi-denial" },
        { label: currentStep.label },
      ]}
      title="Appeal SSDI Denial"
      subtitle="Build a source-grounded reconsideration packet from the actual SSA denial, claimant facts, supporting evidence, and official SSA forms."
      lastSavedLabel={caseId ? "Secure matter active" : undefined}
      steps={[...SSDI_STEPS]}
      currentStepId={currentStep.id}
      completedStepIds={completedStepIds}
      onStepClick={goToStep}
      rail={rail}
    >
      {error && <div className="wf-callout wf-callout--danger">{error}</div>}

      {currentStep.id === "decision" && (
        <>
          <DocumentUpload
            title="Upload the SSDI denial notice"
            description="Start with the actual SSA denial or decision notice. The file is quarantined and malware-scanned before analysis."
            label="Drop the SSA denial notice here"
            hint="PDF, PNG, JPG, or TIFF. The denial notice is used as a source and is not automatically mailed as an enclosure."
            multiple={false}
            items={subjectNotice ? [{
              id: subjectNotice.document_id,
              name: subjectNotice.filename,
              sizeBytes: subjectNotice.size_bytes ?? undefined,
              status: subjectNotice.usable ? "Clean and ready" : subjectNotice.security_status,
              category: "Source notice",
            }] : []}
            onUpload={uploadDecision}
            onRemove={subjectNotice ? () => removeDocument(subjectNotice.document_id) : undefined}
          />
          {subjectNotice && !subjectNotice.usable && (
            <div className="wf-callout wf-callout--warning">
              The notice is still in the security pipeline. Analysis stays blocked until its status is clean.
              <button type="button" className="wf-btn wf-btn--outline" onClick={() => void refreshCase()} disabled={busy !== ""}>
                Refresh scan status
              </button>
            </div>
          )}
        </>
      )}

      {currentStep.id === "analysis" && (
        <>
          <SectionCard
            title="Analyze the decision"
            description="The model reads the clean source notice once, extracts only supported facts, and records uncertainty instead of filling gaps."
            footer={
              <button type="button" className="wf-btn wf-btn--primary" onClick={() => void analyzeDecision()} disabled={!cleanDecision || busy !== ""}>
                {busy === "analysis" ? "Analyzing…" : analysis ? "Analyze again" : "Analyze SSDI denial"}
              </button>
            }
          >
            {!cleanDecision && <div className="wf-callout wf-callout--warning">The source notice must clear security scanning first.</div>}
          </SectionCard>
          {analysis && (
            <>
              <StructuredAnalysisPanel
                title="SSDI denial analysis"
                providerLabel={analysis.model}
                confidence={analysis.result.confidence}
                summary={analysis.result.summary}
                facts={[
                  { id: "decision", label: "Decision", value: analysis.result.decision ?? "Not confirmed" },
                  { id: "issuer", label: "Issuer", value: analysis.result.issuer ?? "Not confirmed" },
                  { id: "reference", label: "Reference number", value: analysis.result.referenceNumber ?? "Not confirmed" },
                  { id: "date", label: "Decision date", value: analysis.result.decisionDate ?? "Not confirmed" },
                  { id: "deadline", label: "Deadline printed on notice", value: analysis.result.deadline ?? "Not confirmed" },
                  { id: "stage", label: "Appeal level shown", value: appealStage },
                  { id: "basis", label: "Decision basis", value: decisionBasis },
                ]}
                issues={analysis.result.reasons.map((reason, index) => ({
                  id: `reason-${index}`,
                  title: reason,
                  severity: "warning",
                }))}
                evidenceNeeded={analysis.result.suggestedEvidence}
                uncertainties={analysis.result.missingInformation}
              />
              {!isSsdiReconsiderationStage(appealStage) && (
                <div className="wf-callout wf-callout--danger">
                  {appealStage === "unknown"
                    ? "This workflow cannot continue until the notice confirms that reconsideration is the correct appeal level."
                    : `This notice appears to call for ${appealStage.replaceAll("_", " ")}. This SSDI workflow is limited to reconsideration and will not generate or mail the wrong appeal packet.`}
                </div>
              )}
              {isSsdiReconsiderationStage(appealStage) && !isSupportedSsdiDecisionBasis(decisionBasis) && (
                <div className="wf-callout wf-callout--danger">
                  The notice does not clearly establish whether this is a medical or non-medical reconsideration. The workflow will not choose the form set by guesswork.
                </div>
              )}
            </>
          )}
        </>
      )}

      {currentStep.id === "claimant" && (
        <SectionCard
          title="Claimant facts"
          description="These are user-supplied facts, stored separately from the AI-extracted notice facts. Unknown or unchanged items may be left blank."
          footer={
            <button type="button" className="wf-btn wf-btn--primary" onClick={() => void saveFacts()} disabled={busy !== ""}>
              {busy === "facts" ? "Saving…" : "Save claimant facts"}
            </button>
          }
        >
          <div className="wf-form-grid">
            <Field label="Claimant name" required><TextField value={facts.claimantName} onChange={(event) => setFacts({ ...facts, claimantName: event.target.value })} /></Field>
            <Field label="Phone" required><TextField value={facts.phone} onChange={(event) => setFacts({ ...facts, phone: event.target.value })} /></Field>
            <Field label="Mailing address" required><TextArea value={facts.claimantAddress} onChange={(event) => setFacts({ ...facts, claimantAddress: event.target.value })} /></Field>
            <Field label="Representative name" hint="Leave blank if none."><TextField value={facts.representativeName} onChange={(event) => setFacts({ ...facts, representativeName: event.target.value })} /></Field>
          </div>
          <Field label="Why do you disagree with the denial?" required>
            <TextArea rows={6} value={facts.reasonsForDisagreement} onChange={(event) => setFacts({ ...facts, reasonsForDisagreement: event.target.value })} />
          </Field>
          <div className="wf-form-grid">
            <Field label="Changes in existing conditions"><TextArea value={facts.conditionChanges} onChange={(event) => setFacts({ ...facts, conditionChanges: event.target.value })} /></Field>
            <Field label="New conditions"><TextArea value={facts.newConditions} onChange={(event) => setFacts({ ...facts, newConditions: event.target.value })} /></Field>
            <Field label="Treatment changes"><TextArea value={facts.treatmentChanges} onChange={(event) => setFacts({ ...facts, treatmentChanges: event.target.value })} /></Field>
            <Field label="Medication changes"><TextArea value={facts.medicationChanges} onChange={(event) => setFacts({ ...facts, medicationChanges: event.target.value })} /></Field>
            <Field label="Work changes"><TextArea value={facts.workChanges} onChange={(event) => setFacts({ ...facts, workChanges: event.target.value })} /></Field>
            <Field label="Changes in daily functioning"><TextArea value={facts.dailyFunctionChanges} onChange={(event) => setFacts({ ...facts, dailyFunctionChanges: event.target.value })} /></Field>
          </div>
          <Field label="Additional facts"><TextArea rows={5} value={facts.additionalFacts} onChange={(event) => setFacts({ ...facts, additionalFacts: event.target.value })} /></Field>
        </SectionCard>
      )}

      {currentStep.id === "evidence" && (
        <>
          <SectionCard title="Supporting evidence type" description="Choose what kind of evidence you are adding before uploading it.">
            <select className="wf-input" value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as SsdiEvidenceKind)}>
              {SSDI_EVIDENCE_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </SectionCard>
          <DocumentUpload
            title="Upload supporting evidence"
            description="Only documents you explicitly include here enter the packet. Each file must clear security scanning before drafting or mailing."
            items={evidence.filter((document) => !SSDI_REQUIRED_FORMS.some((form) => form.kind === document.evidence_kind)).map((document) => ({
              id: document.document_id,
              name: document.filename,
              sizeBytes: document.size_bytes ?? undefined,
              status: document.usable ? (document.included ? "Included" : "Excluded") : document.security_status,
              category: evidenceLabel(document.evidence_kind),
            }))}
            onUpload={(files) => uploadEvidence(files, evidenceKind)}
            onRemove={(id) => removeDocument(id)}
          />
          <EvidenceSummary
            items={evidence.filter((document) => !SSDI_REQUIRED_FORMS.some((form) => form.kind === document.evidence_kind)).map((document) => ({
              id: document.document_id,
              title: document.filename,
              description: evidenceLabel(document.evidence_kind),
              status: document.usable ? (document.included ? "provided" : "review") : "review",
            }))}
          />
          {evidence.filter((document) => !SSDI_REQUIRED_FORMS.some((form) => form.kind === document.evidence_kind)).map((document) => (
            <label key={document.document_id} className="wf-checkbox-field">
              <input type="checkbox" checked={document.included} onChange={() => void toggleIncluded(document)} />
              <span>Include {document.filename} in the outgoing packet</span>
            </label>
          ))}
        </>
      )}

      {currentStep.id === "draft" && (
        <>
          <SectionCard
            title="Generate the reconsideration response"
            description="Drafting uses the stored denial analysis, the claimant facts you saved, and only the evidence kinds currently enclosed."
            footer={
              <div className="wf-draft-actions">
                <button type="button" className="wf-btn wf-btn--outline" onClick={() => void generateDraft()} disabled={!factsSaved || busy !== ""}>
                  {busy === "draft-generate" ? "Generating…" : draft ? "Regenerate" : "Generate draft"}
                </button>
                <button type="button" className="wf-btn wf-btn--primary" onClick={() => void saveDraft()} disabled={!draft.trim() || busy !== ""}>
                  {busy === "draft-save" ? "Saving…" : "Save this draft"}
                </button>
              </div>
            }
          >
            <TextArea rows={18} value={draft} onChange={(event) => { setDraft(event.target.value); setDraftSaved(false); }} placeholder="Generate the draft or enter your own response." />
          </SectionCard>
          {draft && <DraftReview draft={draft} ready={draftSaved} title="Current saved response" description={draftSaved ? "This exact text is the current response used for packet preview." : "Save the edited text before building the packet."} />}
        </>
      )}

      {currentStep.id === "forms" && (
        <>
          <SectionCard
            title="Official SSA reconsideration forms"
            description="Download the official PDFs, complete and sign them as required, then upload the completed versions. MailMyPDF does not fabricate signatures or replace official SSA forms with look-alikes."
          >
            <div className="wf-action-list">
              {requiredForms.map((form) => (
                <a key={form.kind} className="wf-btn wf-btn--outline" href={form.href} target="_blank" rel="noreferrer">
                  Download {form.label}
                </a>
              ))}
            </div>
          </SectionCard>
          {requiredForms.map((form) => {
            const attached = evidence.filter((document) => document.evidence_kind === form.kind);
            return (
              <DocumentUpload
                key={form.kind}
                title={form.label}
                description="Upload the completed official PDF that should be included in the final packet."
                multiple={false}
                accept=".pdf,application/pdf"
                items={attached.map((document) => ({
                  id: document.document_id,
                  name: document.filename,
                  sizeBytes: document.size_bytes ?? undefined,
                  status: document.usable ? "Included and clean" : document.security_status,
                  category: form.kind.toUpperCase().replace("_", "-"),
                }))}
                onUpload={async (files) => {
                  for (const document of attached) await removeDocument(document.document_id);
                  await uploadEvidence(files.slice(0, 1), form.kind);
                }}
                onRemove={(id) => removeDocument(id)}
              />
            );
          })}
          {decisionBasis === "medical" && (
            <div className="wf-callout wf-callout--info">
              Medical reconsideration: this workflow requires SSA-561, SSA-3441 and SSA-827.
            </div>
          )}
          {decisionBasis === "nonmedical" && (
            <div className="wf-callout wf-callout--info">
              Non-medical reconsideration: this workflow requires SSA-561. It does not force the medical appeal forms into the packet.
            </div>
          )}
          {!requiredFormsComplete && (
            <div className="wf-callout wf-callout--warning">
              Packet review stays locked until the required completed SSA form set is attached, included, and clean.
            </div>
          )}
        </>
      )}

      {currentStep.id === "review" && (
        <>
          <SectionCard title="Mailing recipient" description="Use the exact SSA destination shown on the denial or current filing instructions. A detected address is only a starting point for your review.">
            <AddressFields value={recipient} onChange={setRecipient} />
            <Field label="Mailing method" required>
              <select className="wf-input" value={mailClass} onChange={(event) => { setMailClass(event.target.value as typeof mailClass); setPacket(null); setApprovalId(""); }}>
                <option value="standard">Standard mail</option>
                <option value="certified">Certified mail</option>
                <option value="registered">Registered mail</option>
              </select>
            </Field>
            <button type="button" className="wf-btn wf-btn--primary" onClick={() => void previewPacket()} disabled={!draftSaved || !requiredFormsComplete || !completeAddress(recipient) || busy !== ""}>
              {busy === "preview" ? "Building preview…" : "Build exact packet preview"}
            </button>
          </SectionCard>
          {packet && (
            <>
              <PacketSummary
                totalPages={packet.responsePages + packet.supportingPages}
                items={[
                  { id: "response", title: "Reconsideration response", meta: `${packet.responsePages} page(s)`, status: "Included", tone: "success" },
                  ...packet.manifest.map((item, index) => ({
                    id: item.documentId ?? item.document_id ?? String(index),
                    title: item.filename,
                    meta: `${item.pageCount ?? item.page_count ?? "?"} page(s)`,
                    description: evidenceLabel(item.evidenceKind ?? item.evidence_kind ?? null),
                    status: "Included",
                    tone: "success" as const,
                  })),
                ]}
                description={`Server-built packet · ${currency(packet.quote.totalCents)} · SHA-256 ${packet.packetSha256}`}
              />
              <ApprovalChecklist
                reviewItems={[
                  { id: "packet", label: "Exact packet hash", detail: packet.packetSha256, status: "Built", tone: "success" },
                  { id: "recipient", label: "SSA recipient", detail: `${recipient.name}, ${recipient.line1}, ${recipient.city}, ${recipient.state} ${recipient.postal}`, status: "Review", tone: "warning" },
                  { id: "price", label: "Server-authoritative price", detail: currency(packet.quote.totalCents), status: "Quoted", tone: "info" },
                ]}
                confirmations={[
                  { id: "content", label: "I reviewed the response and the completed SSA forms in this packet." },
                  { id: "signatures", label: "I am responsible for confirming that required signatures and dates are present on the official SSA forms." },
                  { id: "recipient", label: "I confirmed the mailing recipient and method against the notice or current SSA instructions." },
                ]}
                approveLabel={busy === "approve" ? "Approving…" : "Approve this exact packet"}
                onApprove={approvePacket}
              />
            </>
          )}
        </>
      )}

      {currentStep.id === "mail" && (
        <FulfillmentPanel
          phase={approvalId ? "payment" : "review"}
          title="Payment, mailing and proof"
          description="Checkout is created only from the immutable approval. Stripe payment and mailing fulfillment are idempotent so a repeated callback cannot create a duplicate mailing."
          details={[
            { label: "Approval", value: approvalId || "Not approved" },
            { label: "Packet", value: packet?.packetSha256 ?? "Rebuilt from approved state at checkout" },
            { label: "Mail class", value: mailClass },
          ]}
          actions={
            <button type="button" className="wf-btn wf-btn--primary" onClick={() => void checkout()} disabled={!approvalId || !completeAddress(sender) || busy !== ""}>
              {busy === "checkout" ? "Opening checkout…" : "Continue to secure payment"}
            </button>
          }
        >
          <SectionCard title="Return address" description="Used by the mailing provider as the sender/return address for this approved packet.">
            <AddressFields value={sender} onChange={setSender} />
          </SectionCard>
        </FulfillmentPanel>
      )}

      <div className="wf-draft-actions">
        <button type="button" className="wf-btn wf-btn--outline" onClick={previousStep} disabled={stepIndex === 0}>Back</button>
        {currentStep.id !== "mail" && (
          <button type="button" className="wf-btn wf-btn--primary" onClick={nextStep} disabled={!canContinue(currentStep.id)}>
            Continue
          </button>
        )}
      </div>
    </StepShell>
  );
}

function AddressFields({ value, onChange }: { value: MailingAddress; onChange: (next: MailingAddress) => void }) {
  return (
    <div className="wf-form-grid">
      <Field label="Name" required><TextField value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /></Field>
      <Field label="Address line 1" required><TextField value={value.line1} onChange={(event) => onChange({ ...value, line1: event.target.value })} /></Field>
      <Field label="Address line 2"><TextField value={value.line2 ?? ""} onChange={(event) => onChange({ ...value, line2: event.target.value })} /></Field>
      <Field label="City" required><TextField value={value.city} onChange={(event) => onChange({ ...value, city: event.target.value })} /></Field>
      <Field label="State" required><TextField maxLength={2} value={value.state} onChange={(event) => onChange({ ...value, state: event.target.value.toUpperCase() })} /></Field>
      <Field label="ZIP" required><TextField value={value.postal} onChange={(event) => onChange({ ...value, postal: event.target.value })} /></Field>
    </div>
  );
}
