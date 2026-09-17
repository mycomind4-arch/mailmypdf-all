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
  IMMIGRATION_COVER_LETTER_DOCUMENT_KINDS,
  IMMIGRATION_COVER_LETTER_STEPS,
  IMMIGRATION_COVER_LETTER_VERTICAL_ID,
  IMMIGRATION_COVER_LETTER_WORKFLOW_ID,
  immigrationCoverLetterCompletedSteps,
  type ImmigrationCoverLetterDocumentKind,
  type ImmigrationCoverLetterStepId,
} from "./workflow";

type FilingFacts = {
  applicantName: string;
  petitionerName: string;
  filingType: string;
  formNumbers: string;
  receiptOrANumber: string;
  filingPurpose: string;
  specialInstructions: string;
};

const EMPTY_FACTS: FilingFacts = {
  applicantName: "",
  petitionerName: "",
  filingType: "",
  formNumbers: "",
  receiptOrANumber: "",
  filingPurpose: "",
  specialInstructions: "",
};

const EMPTY_ADDRESS: MailingAddress = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal: "",
};

function addressReady(value: MailingAddress): boolean {
  return Boolean(
    value.name.trim() &&
    value.line1.trim() &&
    value.city.trim() &&
    /^[A-Za-z]{2}$/.test(value.state.trim()) &&
    /^\d{5}(?:-\d{4})?$/.test(value.postal.trim()),
  );
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
    name: typeof value.name === "string" && value.name.trim() ? value.name : "U.S. Citizenship and Immigration Services",
    line1,
    line2: typeof value.line2 === "string" ? value.line2 : "",
    city,
    state,
    postal,
  };
}

function documentLabel(kind: string | null): string {
  return IMMIGRATION_COVER_LETTER_DOCUMENT_KINDS.find(([value]) => value === kind)?.[1] ?? kind ?? "Packet document";
}

export default function ImmigrationFilingCoverLetterWorkflow() {
  const [matterId, setMatterId] = useState("");
  const [documents, setDocuments] = useState<WorkflowCaseDocument[]>([]);
  const [analysis, setAnalysis] = useState<WorkflowAnalysis | null>(null);
  const [facts, setFacts] = useState<FilingFacts>(EMPTY_FACTS);
  const [factsSaved, setFactsSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [documentKind, setDocumentKind] = useState<ImmigrationCoverLetterDocumentKind>("supporting_evidence");
  const [packet, setPacket] = useState<PacketPreview | null>(null);
  const [approvalId, setApprovalId] = useState("");
  const [recipient, setRecipient] = useState<MailingAddress>(EMPTY_ADDRESS);
  const [sender, setSender] = useState<MailingAddress>(EMPTY_ADDRESS);
  const [mailClass, setMailClass] = useState<"standard" | "certified" | "registered">("certified");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const primary = documents.find((document) => document.role === "subject_notice") ?? null;
  const supporting = documents.filter((document) => document.role === "evidence");
  const primaryReady = Boolean(primary?.usable && primary.security_status === "clean");
  const analysisReady = Boolean(analysis?.result.summary);

  const completedStepIds = useMemo(() => immigrationCoverLetterCompletedSteps({
    hasCleanPrimary: primaryReady,
    hasAnalysis: analysisReady,
    hasFacts: factsSaved,
    hasDraft: draftSaved,
    hasApproval: Boolean(approvalId),
  }), [primaryReady, analysisReady, factsSaved, draftSaved, approvalId]);

  const currentStep = IMMIGRATION_COVER_LETTER_STEPS[stepIndex]!;

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
        setFacts({ ...EMPTY_FACTS, ...(storedInput.input as Partial<FilingFacts>) });
        setFactsSaved(true);
      }
      if (storedDraft?.bodyText) {
        setDraft(storedDraft.bodyText);
        setDraftSaved(true);
      }
      if (storedApproval?.approvalId) setApprovalId(storedApproval.approvalId);
      const inferred = immigrationCoverLetterCompletedSteps({
        hasCleanPrimary: snapshot.documents.some((document) => document.role === "subject_notice" && document.usable && document.security_status === "clean"),
        hasAnalysis: Boolean(storedAnalysis?.result.summary),
        hasFacts: Boolean(storedInput),
        hasDraft: Boolean(storedDraft?.bodyText),
        hasApproval: Boolean(storedApproval?.approvalId),
      });
      setStepIndex(Math.min(inferred.length, IMMIGRATION_COVER_LETTER_STEPS.length - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restore this filing-cover-letter matter.");
      sessionStorage.removeItem("mailmypdf:immigration-filing-cover-letter:matter");
      setMatterId("");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("matter");
    const stored = fromUrl || sessionStorage.getItem("mailmypdf:immigration-filing-cover-letter:matter");
    if (!stored) return;
    setMatterId(stored);
    sessionStorage.setItem("mailmypdf:immigration-filing-cover-letter:matter", stored);
    void restore(stored);
  }, []);

  useEffect(() => {
    if (!matterId || !documents.some((document) => !document.usable && document.security_status !== "rejected")) return;
    const timer = window.setInterval(() => void refresh(matterId).catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [matterId, documents]);

  async function ensureMatter(): Promise<string> {
    if (matterId) return matterId;
    const created = await createWorkflowCase(IMMIGRATION_COVER_LETTER_WORKFLOW_ID, IMMIGRATION_COVER_LETTER_VERTICAL_ID);
    setMatterId(created.id);
    sessionStorage.setItem("mailmypdf:immigration-filing-cover-letter:matter", created.id);
    return created.id;
  }

  async function uploadPrimary(files: File[]) {
    const file = files[0];
    if (!file) return;
    const id = await ensureMatter();
    setBusy("upload-primary");
    setError("");
    try {
      if (primary) await detachWorkflowDocument(id, primary.document_id);
      const uploaded = await uploadSecureWorkflowDocument({
        file,
        workflowId: IMMIGRATION_COVER_LETTER_WORKFLOW_ID,
        purpose: "immigration_filing_primary",
      });
      setDocuments(await attachWorkflowDocument({
        caseId: id,
        documentId: uploaded.id,
        role: "subject_notice",
        position: 0,
      }));
      setAnalysis(null);
      setFactsSaved(false);
      setDraft("");
      setDraftSaved(false);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload the filing document.");
    } finally {
      setBusy("");
    }
  }

  async function analyzePrimary() {
    if (!matterId) return;
    setBusy("analyze");
    setError("");
    try {
      const next = await analyzeWorkflowCase(matterId);
      setAnalysis(next);
      const detectedAddress = responseAddressFromAnalysis(next);
      if (detectedAddress) setRecipient(detectedAddress);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to analyze the filing document.");
    } finally {
      setBusy("");
    }
  }

  async function saveFacts() {
    const id = await ensureMatter();
    setBusy("save-facts");
    setError("");
    try {
      await saveWorkflowInput(id, facts);
      setFactsSaved(true);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the filing details.");
    } finally {
      setBusy("");
    }
  }

  async function uploadSupporting(files: File[]) {
    const id = await ensureMatter();
    setBusy("upload-documents");
    setError("");
    try {
      let position = documents.length + 1;
      for (const file of files) {
        const uploaded = await uploadSecureWorkflowDocument({
          file,
          workflowId: IMMIGRATION_COVER_LETTER_WORKFLOW_ID,
          purpose: documentKind,
        });
        setDocuments(await attachWorkflowDocument({
          caseId: id,
          documentId: uploaded.id,
          role: "evidence",
          evidenceKind: documentKind,
          position: position++,
        }));
      }
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload packet documents.");
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
    setDocuments(await updateWorkflowDocument({
      caseId: matterId,
      documentId: document.document_id,
      included: !document.included,
    }));
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
      setError(cause instanceof Error ? cause.message : "Unable to generate the cover letter.");
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
      setError(cause instanceof Error ? cause.message : "Unable to save the cover letter.");
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
      setError(cause instanceof Error ? cause.message : "Unable to build the filing packet.");
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
      setError(cause instanceof Error ? cause.message : "Unable to approve the exact filing packet.");
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
      sessionStorage.setItem("mailmypdf:immigration-filing-cover-letter:order", result.orderId);
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open secure checkout.");
      setBusy("");
    }
  }

  function stepReady(step: ImmigrationCoverLetterStepId): boolean {
    if (step === "filing") return primaryReady;
    if (step === "analysis") return analysisReady;
    if (step === "facts" || step === "documents") return factsSaved;
    if (step === "draft") return draftSaved;
    if (step === "review") return Boolean(approvalId);
    return false;
  }

  const rail = <>
    <StatusCard
      current={stepIndex + 1}
      total={IMMIGRATION_COVER_LETTER_STEPS.length}
      stepLabel={currentStep.label}
      state={approvalId ? "ready" : "in_progress"}
      summary={matterId ? "Secure immigration matter active." : "Upload the primary filing document to open the matter."}
    />
    <ReadinessChecklist title="Filing readiness" items={[
      { id: "primary", label: "Primary filing document cleared security scanning", done: primaryReady },
      { id: "analysis", label: "Filing details extracted for review", done: analysisReady },
      { id: "facts", label: "Filing details confirmed", done: factsSaved },
      { id: "draft", label: "Cover letter reviewed and saved", done: draftSaved },
      { id: "approval", label: "Exact filing packet approved", done: Boolean(approvalId) },
    ]} />
  </>;

  return <StepShell
    breadcrumb={[
      { label: "Immigration Mail", href: "/immigration-mail" },
      { label: "Immigration Filing Cover Letter", href: "/immigration-mail/workflows/immigration-filing-cover-letter" },
      { label: currentStep.label },
    ]}
    title="Immigration Filing Cover Letter"
    subtitle="Create a source-grounded filing cover letter, organize the packet, review the exact PDF, and keep mailing proof connected to the matter."
    lastSavedLabel={matterId ? "Matter saved" : undefined}
    steps={[...IMMIGRATION_COVER_LETTER_STEPS]}
    currentStepId={currentStep.id}
    completedStepIds={completedStepIds}
    onStepClick={(id) => {
      const target = IMMIGRATION_COVER_LETTER_STEPS.findIndex((step) => step.id === id);
      if (target >= 0 && (target <= stepIndex || completedStepIds.includes(id as ImmigrationCoverLetterStepId))) setStepIndex(target);
    }}
    rail={rail}
  >
    {error && <div className="wf-callout wf-callout--danger">{error}</div>}

    {currentStep.id === "filing" && <DocumentUpload
      title="1. Upload the primary filing document"
      description="Upload the application, petition, form, or USCIS document this cover letter will accompany. The file is quarantined and scanned before use."
      multiple={false}
      items={primary ? [{
        id: primary.document_id,
        name: primary.filename,
        sizeBytes: primary.size_bytes ?? undefined,
        status: primary.usable ? "Clean and ready" : primary.security_status,
        category: "Primary filing document",
      }] : []}
      onUpload={uploadPrimary}
      onRemove={primary ? () => removeDocument(primary.document_id) : undefined}
    />}

    {currentStep.id === "analysis" && <SectionCard
      title="2. Review extracted filing details"
      description="Extract candidate filing type, identifiers, dates, and destination clues from the primary document. You confirm the important details before drafting."
      footer={<button className="wf-btn wf-btn--primary" type="button" onClick={() => void analyzePrimary()} disabled={!primaryReady || Boolean(busy)}>
        {busy === "analyze" ? "Analyzing…" : analysis ? "Analyze again" : "Analyze filing document"}
      </button>}
    >
      {analysis ? <div className="wf-review-list">
        {[
          ["Document type", analysis.result.decision ?? "Not confirmed"],
          ["Issuer", analysis.result.issuer ?? "Not confirmed"],
          ["Document date", analysis.result.decisionDate ?? "Not confirmed"],
          ["Deadline", analysis.result.deadline ?? "Not identified"],
        ].map(([label, value]) => <div className="wf-review-row" key={label}>
          <div className="wf-review-copy"><strong>{label}</strong><div className="wf-review-detail">{value}</div></div>
        </div>)}
        <div className="wf-callout wf-callout--info">{analysis.result.summary}</div>
      </div> : <p>Run analysis after the primary document clears security scanning.</p>}
    </SectionCard>}

    {currentStep.id === "facts" && <SectionCard
      title="3. Confirm filing details"
      description="These user-confirmed details are stored separately from extracted document facts."
      footer={<button className="wf-btn wf-btn--primary" type="button" onClick={() => void saveFacts()} disabled={Boolean(busy)}>Save filing details</button>}
    >
      <div className="wf-form-grid">
        <Field label="Applicant or beneficiary name" required><TextField value={facts.applicantName} onChange={(e) => setFacts({ ...facts, applicantName: e.target.value })} /></Field>
        <Field label="Petitioner or filer name"><TextField value={facts.petitionerName} onChange={(e) => setFacts({ ...facts, petitionerName: e.target.value })} /></Field>
        <Field label="Filing type" required><TextField value={facts.filingType} onChange={(e) => setFacts({ ...facts, filingType: e.target.value })} placeholder="Example: Adjustment of Status packet" /></Field>
        <Field label="Form number(s)" required><TextField value={facts.formNumbers} onChange={(e) => setFacts({ ...facts, formNumbers: e.target.value })} placeholder="Example: I-485, I-765" /></Field>
        <Field label="Receipt number or A-Number"><TextField value={facts.receiptOrANumber} onChange={(e) => setFacts({ ...facts, receiptOrANumber: e.target.value })} /></Field>
      </div>
      <Field label="Purpose of this filing" required><TextArea rows={4} value={facts.filingPurpose} onChange={(e) => setFacts({ ...facts, filingPurpose: e.target.value })} /></Field>
      <Field label="Special instructions or context"><TextArea rows={4} value={facts.specialInstructions} onChange={(e) => setFacts({ ...facts, specialInstructions: e.target.value })} /></Field>
    </SectionCard>}

    {currentStep.id === "documents" && <>
      <SectionCard title="4. Organize packet documents" description="Choose a document type before uploading. Only clean, explicitly included documents enter the outgoing packet.">
        <Field label="Document type">
          <select className="wf-input" value={documentKind} onChange={(e) => setDocumentKind(e.target.value as ImmigrationCoverLetterDocumentKind)}>
            {IMMIGRATION_COVER_LETTER_DOCUMENT_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </SectionCard>
      <DocumentUpload
        title="Upload packet documents"
        items={supporting.map((document) => ({
          id: document.document_id,
          name: document.filename,
          sizeBytes: document.size_bytes ?? undefined,
          status: document.usable ? (document.included ? "Included" : "Excluded") : document.security_status,
          category: documentLabel(document.evidence_kind),
        }))}
        onUpload={uploadSupporting}
        onRemove={removeDocument}
      />
      {supporting.map((document) => <CheckboxField
        key={document.document_id}
        checked={document.included}
        onChange={() => void toggleIncluded(document)}
        label={`Include ${document.filename} in the outgoing packet`}
      />)}
    </>}

    {currentStep.id === "draft" && <SectionCard
      title="5. Draft the filing cover letter"
      description="Generate a concise cover letter from the confirmed filing details and selected packet documents. Review and edit it before saving."
      footer={<div className="wf-draft-actions">
        <button className="wf-btn wf-btn--outline" type="button" onClick={() => void generateDraft()} disabled={!factsSaved || Boolean(busy)}>Generate cover letter</button>
        <button className="wf-btn wf-btn--primary" type="button" onClick={() => void saveDraft()} disabled={!draft.trim() || Boolean(busy)}>Save reviewed cover letter</button>
      </div>}
    >
      <TextArea rows={20} value={draft} onChange={(e) => { setDraft(e.target.value); setDraftSaved(false); }} placeholder="Generate the filing cover letter or enter your own." />
    </SectionCard>}

    {currentStep.id === "review" && <>
      <SectionCard title="6. Build the exact filing packet" description="Confirm the mailing destination and build the exact PDF packet that will be approved and mailed.">
        <AddressFields value={recipient} onChange={setRecipient} />
        <Field label="Mailing method">
          <select className="wf-input" value={mailClass} onChange={(e) => { setMailClass(e.target.value as typeof mailClass); setPacket(null); setApprovalId(""); }}>
            <option value="standard">Standard mail</option>
            <option value="certified">Certified mail</option>
            <option value="registered">Registered mail</option>
          </select>
        </Field>
        <button className="wf-btn wf-btn--primary" type="button" onClick={() => void buildPreview()} disabled={!draftSaved || !addressReady(recipient) || Boolean(busy)}>
          {busy === "preview" ? "Building…" : "Build exact packet preview"}
        </button>
      </SectionCard>
      {packet && <ApprovalChecklist
        reviewItems={[
          { id: "hash", label: "Exact packet SHA-256", detail: packet.packetSha256, status: "Built", tone: "success" },
          { id: "pages", label: "Packet pages", detail: String(packet.responsePages + packet.supportingPages), status: "Measured", tone: "info" },
          { id: "price", label: "Server-authoritative total", detail: `$${(packet.quote.totalCents / 100).toFixed(2)}`, status: "Quoted", tone: "info" },
          { id: "recipient", label: "Recipient", detail: `${recipient.name}, ${recipient.line1}, ${recipient.city}, ${recipient.state} ${recipient.postal}`, status: "Review", tone: "warning" },
        ]}
        confirmations={[
          { id: "content", label: "I reviewed the cover letter and every included packet document." },
          { id: "recipient", label: "I confirmed the filing address against current filing instructions for this submission." },
        ]}
        approveLabel={busy === "approve" ? "Approving…" : "Approve this exact packet"}
        onApprove={approve}
      />}
    </>}

    {currentStep.id === "mail" && <FulfillmentPanel
      phase={approvalId ? "payment" : "review"}
      title="7. Pay, mail, track, and retain proof"
      description="Payment and mailing are tied to the immutable approval so a retry cannot silently mail a different filing packet."
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
    </FulfillmentPanel>}

    <div className="wf-draft-actions">
      <button className="wf-btn wf-btn--outline" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>Back</button>
      {currentStep.id !== "mail" && <button className="wf-btn wf-btn--primary" type="button" disabled={!stepReady(currentStep.id)} onClick={() => setStepIndex((value) => Math.min(IMMIGRATION_COVER_LETTER_STEPS.length - 1, value + 1))}>Continue</button>}
    </div>
  </StepShell>;
}

function AddressFields({ value, onChange }: { value: MailingAddress; onChange: (next: MailingAddress) => void }) {
  return <div className="wf-form-grid">
    <Field label="Name" required><TextField value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></Field>
    <Field label="Address line 1" required><TextField value={value.line1} onChange={(e) => onChange({ ...value, line1: e.target.value })} /></Field>
    <Field label="Address line 2"><TextField value={value.line2 ?? ""} onChange={(e) => onChange({ ...value, line2: e.target.value })} /></Field>
    <Field label="City" required><TextField value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} /></Field>
    <Field label="State" required><TextField maxLength={2} value={value.state} onChange={(e) => onChange({ ...value, state: e.target.value.toUpperCase() })} /></Field>
    <Field label="ZIP" required><TextField value={value.postal} onChange={(e) => onChange({ ...value, postal: e.target.value })} /></Field>
  </div>;
}
