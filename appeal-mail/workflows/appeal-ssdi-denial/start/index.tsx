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
} from "./runtime-client";
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

export type ClaimantFacts = {
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

function currentAppealStage(analysis: WorkflowAnalysis | null): string {
  const value = analysis?.result.workflowDetails?.appealStage;
  return typeof value === "string" ? value : "unknown";
}

function currentDecisionBasis(analysis: WorkflowAnalysis | null): SsdiDecisionBasis {
  const value = analysis?.result.workflowDetails?.decisionBasis;
  return value === "medical" || value === "nonmedical" ? value : "unknown";
}

function responseAddressFromAnalysis(analysis: WorkflowAnalysis | null): MailingAddress | null {
  const raw = analysis?.result.workflowDetails?.responseAddress;
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

function addressReady(value: MailingAddress): boolean {
  return Boolean(
    value.name.trim() &&
      value.line1.trim() &&
      value.city.trim() &&
      /^[A-Za-z]{2}$/.test(value.state.trim()) &&
      /^\d{5}(?:-\d{4})?$/.test(value.postal.trim()),
  );
}

function formLabel(kind: string | null): string {
  return SSDI_REQUIRED_FORMS.find((form) => form.kind === kind)?.label ??
    SSDI_EVIDENCE_KINDS.find(([value]) => value === kind)?.[1] ??
    kind ??
    "Supporting document";
}

export default function SsdiDenialWorkflow() {
  const [matterId, setMatterId] = useState("");
  const [documents, setDocuments] = useState<WorkflowCaseDocument[]>([]);
  const [analysis, setAnalysis] = useState<WorkflowAnalysis | null>(null);
  const [facts, setFacts] = useState<ClaimantFacts>(EMPTY_FACTS);
  const [factsSaved, setFactsSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [evidenceKind, setEvidenceKind] = useState<SsdiEvidenceKind>("medical_records");
  const [packet, setPacket] = useState<PacketPreview | null>(null);
  const [approvalId, setApprovalId] = useState("");
  const [recipient, setRecipient] = useState<MailingAddress>(EMPTY_ADDRESS);
  const [sender, setSender] = useState<MailingAddress>(EMPTY_ADDRESS);
  const [mailClass, setMailClass] = useState<"standard" | "certified" | "registered">("certified");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const sourceNotice = documents.find((document) => document.role === "subject_notice") ?? null;
  const evidence = documents.filter((document) => document.role === "evidence");
  const appealStage = currentAppealStage(analysis);
  const decisionBasis = currentDecisionBasis(analysis);
  const sourceReady = Boolean(sourceNotice?.usable && sourceNotice.security_status === "clean");
  const analysisReady = Boolean(
    analysis &&
      isSsdiReconsiderationStage(appealStage) &&
      isSupportedSsdiDecisionBasis(decisionBasis),
  );
  const requiredForms = requiredSsdiFormsForBasis(decisionBasis);
  const formsReady = hasRequiredSsdiForms(documents, decisionBasis);

  const completedStepIds = useMemo(
    () =>
      ssdiCompletedSteps({
        hasCleanDecision: sourceReady,
        hasReconsiderationAnalysis: analysisReady,
        hasClaimantFacts: factsSaved,
        hasDraft: draftSaved,
        hasRequiredForms: formsReady,
        hasApproval: Boolean(approvalId),
      }),
    [sourceReady, analysisReady, factsSaved, draftSaved, formsReady, approvalId],
  );

  const currentStep = SSDI_STEPS[stepIndex]!;

  async function refresh(id = matterId) {
    if (!id) return;
    const snapshot = await loadWorkflowCase(id);
    setDocuments(snapshot.documents);
  }

  async function restore(id: string) {
    setBusy("restore");
    setError("");
    try {
      const [snapshot, storedAnalysis, storedInput, storedDraft, storedApproval] = await Promise.all([
        loadWorkflowCase(id),
        loadWorkflowAnalysis(id),
        loadWorkflowInput(id),
        loadWorkflowDraft(id),
        loadWorkflowApproval(id),
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
        hasCleanDecision: snapshot.documents.some(
          (document) => document.role === "subject_notice" && document.usable && document.security_status === "clean",
        ),
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
      sessionStorage.removeItem("mailmypdf:appeal-ssdi-denial:matter");
      setMatterId("");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("matter");
    const stored = fromUrl || sessionStorage.getItem("mailmypdf:appeal-ssdi-denial:matter");
    if (!stored) return;
    setMatterId(stored);
    sessionStorage.setItem("mailmypdf:appeal-ssdi-denial:matter", stored);
    void restore(stored);
  }, []);

  useEffect(() => {
    if (!matterId || !documents.some((document) => !document.usable && document.security_status !== "rejected")) return;
    const timer = window.setInterval(() => void refresh(matterId).catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [matterId, documents]);

  async function ensureMatter(): Promise<string> {
    if (matterId) return matterId;
    const created = await createWorkflowCase(SSDI_WORKFLOW_ID, SSDI_VERTICAL_ID);
    setMatterId(created.id);
    sessionStorage.setItem("mailmypdf:appeal-ssdi-denial:matter", created.id);
    return created.id;
  }

  async function uploadSource(files: File[]) {
    const file = files[0];
    if (!file) return;
    const id = await ensureMatter();
    setBusy("upload-source");
    setError("");
    try {
      if (sourceNotice) await detachWorkflowDocument(id, sourceNotice.document_id);
      const uploaded = await uploadSecureWorkflowDocument({
        file,
        workflowId: SSDI_WORKFLOW_ID,
        purpose: "ssdi_denial_notice",
      });
      setDocuments(
        await attachWorkflowDocument({
          caseId: id,
          documentId: uploaded.id,
          role: "subject_notice",
          position: 0,
        }),
      );
      setAnalysis(null);
      setFactsSaved(false);
      setDraft("");
      setDraftSaved(false);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload the denial notice.");
    } finally {
      setBusy("");
    }
  }

  async function analyzeSource() {
    if (!matterId) return;
    setBusy("analyze");
    setError("");
    try {
      const next = await analyzeWorkflowCase(matterId);
      setAnalysis(next);
      const detectedAddress = responseAddressFromAnalysis(next);
      if (detectedAddress) setRecipient(detectedAddress);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze the SSDI decision.");
    } finally {
      setBusy("");
    }
  }

  async function saveFacts() {
    if (!matterId) return;
    setBusy("save-facts");
    setError("");
    try {
      await saveWorkflowInput(matterId, facts);
      setFactsSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save claimant facts.");
    } finally {
      setBusy("");
    }
  }

  async function uploadEvidence(files: File[], kind: string) {
    const id = await ensureMatter();
    setBusy("upload-evidence");
    setError("");
    try {
      let position = documents.length + 1;
      for (const file of files) {
        const uploaded = await uploadSecureWorkflowDocument({
          file,
          workflowId: SSDI_WORKFLOW_ID,
          purpose: kind,
        });
        setDocuments(
          await attachWorkflowDocument({
            caseId: id,
            documentId: uploaded.id,
            role: "evidence",
            evidenceKind: kind,
            position: position++,
          }),
        );
      }
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload supporting documents.");
    } finally {
      setBusy("");
    }
  }

  async function removeDocument(documentId: string) {
    if (!matterId) return;
    setDocuments(await detachWorkflowDocument(matterId, documentId));
    setPacket(null);
    setApprovalId("");
  }

  async function toggleIncluded(document: WorkflowCaseDocument) {
    if (!matterId || document.role !== "evidence") return;
    setDocuments(
      await updateWorkflowDocument({
        caseId: matterId,
        documentId: document.document_id,
        included: !document.included,
      }),
    );
    setPacket(null);
    setApprovalId("");
  }

  async function generateDraft() {
    if (!matterId) return;
    setBusy("generate-draft");
    setError("");
    try {
      const generated = await generateWorkflowDraft(matterId);
      setDraft(generated.bodyText);
      setDraftSaved(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate the reconsideration draft.");
    } finally {
      setBusy("");
    }
  }

  async function saveDraft() {
    if (!matterId || !draft.trim()) return;
    setBusy("save-draft");
    setError("");
    try {
      await saveWorkflowDraft(matterId, draft);
      setDraftSaved(true);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the draft.");
    } finally {
      setBusy("");
    }
  }

  async function buildPreview() {
    if (!matterId) return;
    setBusy("preview");
    setError("");
    try {
      setPacket(await previewWorkflowPacket(matterId, mailClass));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to build the packet preview.");
    } finally {
      setBusy("");
    }
  }

  async function approve() {
    if (!matterId || !packet) return;
    setBusy("approve");
    setError("");
    try {
      const result = await approveWorkflowPacket({
        caseId: matterId,
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

  async function checkout() {
    if (!matterId || !approvalId) return;
    setBusy("checkout");
    setError("");
    try {
      const result = await checkoutWorkflowCase({ caseId: matterId, approvalId, sender });
      sessionStorage.setItem("mailmypdf:appeal-ssdi-denial:order", result.orderId);
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open secure checkout.");
      setBusy("");
    }
  }

  function stepReady(step: SsdiStepId): boolean {
    if (step === "decision") return sourceReady;
    if (step === "analysis") return analysisReady;
    if (step === "claimant" || step === "evidence") return factsSaved;
    if (step === "draft") return draftSaved;
    if (step === "forms") return formsReady;
    if (step === "review") return Boolean(approvalId);
    return false;
  }

  const readiness = [
    { id: "source", label: "Denial notice cleared security scanning", done: sourceReady },
    { id: "analysis", label: "Reconsideration level and denial basis confirmed", done: analysisReady },
    { id: "facts", label: "Claimant facts confirmed", done: factsSaved },
    { id: "draft", label: "Draft reviewed and saved", done: draftSaved },
    { id: "forms", label: "Required official SSA forms included", done: formsReady },
    { id: "approval", label: "Exact packet approved", done: Boolean(approvalId) },
  ];

  const rail = (
    <>
      <StatusCard
        current={stepIndex + 1}
        total={SSDI_STEPS.length}
        stepLabel={currentStep.label}
        state={approvalId ? "ready" : "in_progress"}
        summary={matterId ? "Secure matter active." : "Upload the denial notice to open the matter."}
      />
      <ReadinessChecklist title="Packet readiness" items={readiness} />
    </>
  );

  return (
    <StepShell
      breadcrumb={[
        { label: "Appeal Mail", href: "/appeal-mail" },
        { label: "Appeal SSDI Denial", href: "/appeal-mail/workflows/appeal-ssdi-denial" },
        { label: currentStep.label },
      ]}
      title="Appeal SSDI Denial"
      subtitle="A source-grounded SSDI reconsideration workflow using the real denial notice, claimant facts, evidence, official SSA forms, exact packet review, mailing, and proof."
      lastSavedLabel={matterId ? "Matter saved" : undefined}
      steps={[...SSDI_STEPS]}
      currentStepId={currentStep.id}
      completedStepIds={completedStepIds}
      onStepClick={(id) => {
        const target = SSDI_STEPS.findIndex((step) => step.id === id);
        if (target >= 0 && (target <= stepIndex || completedStepIds.includes(id as SsdiStepId))) setStepIndex(target);
      }}
      rail={rail}
    >
      {error && <div className="wf-callout wf-callout--danger">{error}</div>}

      {currentStep.id === "decision" && (
        <>
          <DocumentUpload
            title="1. Upload the SSDI denial notice"
            description="The actual SSA denial is the source record. It is quarantined and scanned before analysis."
            multiple={false}
            items={sourceNotice ? [{
              id: sourceNotice.document_id,
              name: sourceNotice.filename,
              sizeBytes: sourceNotice.size_bytes ?? undefined,
              status: sourceNotice.usable ? "Clean and ready" : sourceNotice.security_status,
              category: "Source notice",
            }] : []}
            onUpload={uploadSource}
            onRemove={sourceNotice ? () => removeDocument(sourceNotice.document_id) : undefined}
          />
          {sourceNotice && !sourceReady && (
            <SectionCard title="Security scan pending" description="Analysis remains blocked until the source document is clean.">
              <button className="wf-btn wf-btn--outline" type="button" onClick={() => void refresh()} disabled={Boolean(busy)}>
                Refresh scan status
              </button>
            </SectionCard>
          )}
        </>
      )}

      {currentStep.id === "analysis" && (
        <SectionCard
          title="2. Analyze the denial"
          description="Confirm the appeal level and whether the denial is medical or non-medical. The workflow fails closed if the notice does not support those facts."
          footer={
            <button className="wf-btn wf-btn--primary" type="button" onClick={() => void analyzeSource()} disabled={!sourceReady || Boolean(busy)}>
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
                ["Appeal level", appealStage],
                ["Decision basis", decisionBasis],
              ].map(([label, value]) => (
                <div className="wf-review-row" key={label}>
                  <div className="wf-review-copy"><strong>{label}</strong><div className="wf-review-detail">{value}</div></div>
                </div>
              ))}
              <div className="wf-callout wf-callout--info">{analysis.result.summary}</div>
              {!analysisReady && (
                <div className="wf-callout wf-callout--danger">
                  This workflow only continues when the source notice confirms reconsideration and identifies a medical or non-medical decision basis.
                </div>
              )}
            </div>
          ) : (
            <p>Run analysis after the uploaded notice clears security scanning.</p>
          )}
        </SectionCard>
      )}

      {currentStep.id === "claimant" && (
        <SectionCard
          title="3. Confirm claimant facts"
          description="User-supplied facts are stored separately from AI-extracted notice facts."
          footer={<button className="wf-btn wf-btn--primary" type="button" onClick={() => void saveFacts()} disabled={Boolean(busy)}>Save claimant facts</button>}
        >
          <div className="wf-form-grid">
            <Field label="Claimant name" required><TextField value={facts.claimantName} onChange={(event) => setFacts({ ...facts, claimantName: event.target.value })} /></Field>
            <Field label="Phone" required><TextField value={facts.phone} onChange={(event) => setFacts({ ...facts, phone: event.target.value })} /></Field>
            <Field label="Mailing address" required><TextArea rows={3} value={facts.claimantAddress} onChange={(event) => setFacts({ ...facts, claimantAddress: event.target.value })} /></Field>
            <Field label="Representative name" hint="Leave blank if none."><TextField value={facts.representativeName} onChange={(event) => setFacts({ ...facts, representativeName: event.target.value })} /></Field>
          </div>
          <Field label="Why do you disagree with the denial?" required><TextArea rows={6} value={facts.reasonsForDisagreement} onChange={(event) => setFacts({ ...facts, reasonsForDisagreement: event.target.value })} /></Field>
          <div className="wf-form-grid">
            <Field label="Changes in existing conditions"><TextArea value={facts.conditionChanges} onChange={(event) => setFacts({ ...facts, conditionChanges: event.target.value })} /></Field>
            <Field label="New conditions"><TextArea value={facts.newConditions} onChange={(event) => setFacts({ ...facts, newConditions: event.target.value })} /></Field>
            <Field label="Treatment changes"><TextArea value={facts.treatmentChanges} onChange={(event) => setFacts({ ...facts, treatmentChanges: event.target.value })} /></Field>
            <Field label="Medication changes"><TextArea value={facts.medicationChanges} onChange={(event) => setFacts({ ...facts, medicationChanges: event.target.value })} /></Field>
            <Field label="Work changes"><TextArea value={facts.workChanges} onChange={(event) => setFacts({ ...facts, workChanges: event.target.value })} /></Field>
            <Field label="Daily-function changes"><TextArea value={facts.dailyFunctionChanges} onChange={(event) => setFacts({ ...facts, dailyFunctionChanges: event.target.value })} /></Field>
          </div>
          <Field label="Additional facts"><TextArea rows={4} value={facts.additionalFacts} onChange={(event) => setFacts({ ...facts, additionalFacts: event.target.value })} /></Field>
        </SectionCard>
      )}

      {currentStep.id === "evidence" && (
        <>
          <SectionCard title="4. Supporting evidence" description="Choose the evidence category before upload. Only explicitly included clean documents enter the final packet.">
            <Field label="Evidence type">
              <select className="wf-input" value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as SsdiEvidenceKind)}>
                {SSDI_EVIDENCE_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </SectionCard>
          <DocumentUpload
            title="Upload evidence"
            items={evidence.filter((document) => !SSDI_REQUIRED_FORMS.some((form) => form.kind === document.evidence_kind)).map((document) => ({
              id: document.document_id,
              name: document.filename,
              sizeBytes: document.size_bytes ?? undefined,
              status: document.usable ? (document.included ? "Included" : "Excluded") : document.security_status,
              category: formLabel(document.evidence_kind),
            }))}
            onUpload={(files) => uploadEvidence(files, evidenceKind)}
            onRemove={removeDocument}
          />
          {evidence.filter((document) => !SSDI_REQUIRED_FORMS.some((form) => form.kind === document.evidence_kind)).map((document) => (
            <CheckboxField
              key={document.document_id}
              checked={document.included}
              onChange={() => void toggleIncluded(document)}
              label={`Include ${document.filename} in the outgoing packet`}
            />
          ))}
        </>
      )}

      {currentStep.id === "draft" && (
        <SectionCard
          title="5. Draft the reconsideration response"
          description="The generated draft is constrained to the analyzed denial, confirmed claimant facts, and evidence context. You can edit it before saving."
          footer={
            <div className="wf-draft-actions">
              <button className="wf-btn wf-btn--outline" type="button" onClick={() => void generateDraft()} disabled={!factsSaved || Boolean(busy)}>Generate draft</button>
              <button className="wf-btn wf-btn--primary" type="button" onClick={() => void saveDraft()} disabled={!draft.trim() || Boolean(busy)}>Save reviewed draft</button>
            </div>
          }
        >
          <TextArea rows={20} value={draft} onChange={(event) => { setDraft(event.target.value); setDraftSaved(false); }} placeholder="Generate the draft or enter your own reconsideration response." />
        </SectionCard>
      )}

      {currentStep.id === "forms" && (
        <>
          <SectionCard
            title="6. Complete the official SSA forms"
            description={decisionBasis === "medical" ? "Medical reconsideration requires SSA-561, SSA-3441, and SSA-827 in this workflow." : decisionBasis === "nonmedical" ? "Non-medical reconsideration requires SSA-561; the medical forms are not forced into the packet." : "The form set stays blocked until the denial basis is confirmed."}
          >
            {requiredForms.map((form) => (
              <a key={form.kind} className="wf-btn wf-btn--outline" href={form.href} target="_blank" rel="noreferrer">Download {form.label}</a>
            ))}
          </SectionCard>
          {requiredForms.map((form) => {
            const existing = evidence.filter((document) => document.evidence_kind === form.kind);
            return (
              <DocumentUpload
                key={form.kind}
                title={form.label}
                description="Upload the completed official PDF that should be included in the final packet."
                accept=".pdf,application/pdf"
                multiple={false}
                items={existing.map((document) => ({
                  id: document.document_id,
                  name: document.filename,
                  sizeBytes: document.size_bytes ?? undefined,
                  status: document.usable ? "Included and clean" : document.security_status,
                  category: form.kind.toUpperCase().replace("_", "-"),
                }))}
                onUpload={async (files) => {
                  for (const document of existing) await removeDocument(document.document_id);
                  await uploadEvidence(files.slice(0, 1), form.kind);
                }}
                onRemove={removeDocument}
              />
            );
          })}
        </>
      )}

      {currentStep.id === "review" && (
        <>
          <SectionCard title="7. Build the exact packet" description="Confirm the SSA mailing destination and build the exact PDF that will be approved and mailed.">
            <AddressFields value={recipient} onChange={setRecipient} />
            <Field label="Mailing method">
              <select className="wf-input" value={mailClass} onChange={(event) => { setMailClass(event.target.value as typeof mailClass); setPacket(null); setApprovalId(""); }}>
                <option value="standard">Standard mail</option>
                <option value="certified">Certified mail</option>
                <option value="registered">Registered mail</option>
              </select>
            </Field>
            <button className="wf-btn wf-btn--primary" type="button" onClick={() => void buildPreview()} disabled={!draftSaved || !formsReady || !addressReady(recipient) || Boolean(busy)}>
              {busy === "preview" ? "Building…" : "Build exact packet preview"}
            </button>
          </SectionCard>
          {packet && (
            <ApprovalChecklist
              reviewItems={[
                { id: "hash", label: "Exact packet SHA-256", detail: packet.packetSha256, status: "Built", tone: "success" },
                { id: "pages", label: "Packet pages", detail: String(packet.responsePages + packet.supportingPages), status: "Measured", tone: "info" },
                { id: "price", label: "Server-authoritative total", detail: `$${(packet.quote.totalCents / 100).toFixed(2)}`, status: "Quoted", tone: "info" },
                { id: "recipient", label: "SSA recipient", detail: `${recipient.name}, ${recipient.line1}, ${recipient.city}, ${recipient.state} ${recipient.postal}`, status: "Review", tone: "warning" },
              ]}
              confirmations={[
                { id: "content", label: "I reviewed the draft and every included document." },
                { id: "forms", label: "I confirmed required signatures and dates on the official SSA forms." },
                { id: "recipient", label: "I confirmed the mailing destination against the denial notice or current SSA instructions." },
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
          title="8. Pay, mail, track, and retain proof"
          description="Payment and mailing are tied to the immutable approval so retries cannot silently mail a different packet."
          details={[
            { label: "Approval", value: approvalId || "Not approved" },
            { label: "Mail class", value: mailClass },
            { label: "Packet hash", value: packet?.packetSha256 ?? "Stored with approval" },
          ]}
          actions={<button className="wf-btn wf-btn--primary" type="button" onClick={() => void checkout()} disabled={!approvalId || !addressReady(sender) || Boolean(busy)}>Continue to secure payment</button>}
        >
          <SectionCard title="Return address" description="Used as the sender/return address for the approved mailing.">
            <AddressFields value={sender} onChange={setSender} />
          </SectionCard>
        </FulfillmentPanel>
      )}

      <div className="wf-draft-actions">
        <button className="wf-btn wf-btn--outline" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>Back</button>
        {currentStep.id !== "mail" && (
          <button className="wf-btn wf-btn--primary" type="button" disabled={!stepReady(currentStep.id)} onClick={() => setStepIndex((value) => Math.min(SSDI_STEPS.length - 1, value + 1))}>Continue</button>
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
