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
  CP14_EVIDENCE_KINDS,
  CP14_RESPONSE_MODES,
  CP14_STEPS,
  CP14_VERTICAL_ID,
  CP14_WORKFLOW_ID,
  cp14CompletedSteps,
  type Cp14EvidenceKind,
  type Cp14ResponseMode,
  type Cp14StepId,
} from "./workflow";

type Cp14Facts = {
  taxpayerName: string;
  taxpayerAddress: string;
  phone: string;
  noticeNumber: string;
  taxPeriod: string;
  balanceShown: string;
  responseMode: Cp14ResponseMode;
  explanation: string;
  requestedAction: string;
};

const EMPTY_FACTS: Cp14Facts = {
  taxpayerName: "",
  taxpayerAddress: "",
  phone: "",
  noticeNumber: "CP14",
  taxPeriod: "",
  balanceShown: "",
  responseMode: "disagree",
  explanation: "",
  requestedAction: "Please review the account and the enclosed information and update the balance or account record as appropriate.",
};

const EMPTY_ADDRESS: MailingAddress = { name: "", line1: "", line2: "", city: "", state: "", postal: "" };

function addressReady(value: MailingAddress): boolean {
  return Boolean(value.name.trim() && value.line1.trim() && value.city.trim() && /^[A-Za-z]{2}$/.test(value.state.trim()) && /^\d{5}(?:-\d{4})?$/.test(value.postal.trim()));
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
    name: typeof value.name === "string" && value.name.trim() ? value.name : "Internal Revenue Service",
    line1,
    line2: typeof value.line2 === "string" ? value.line2 : "",
    city,
    state,
    postal,
  };
}

function evidenceLabel(kind: string | null): string {
  return CP14_EVIDENCE_KINDS.find(([value]) => value === kind)?.[1] ?? kind ?? "Supporting document";
}

export default function Cp14ResponseWorkflow() {
  const [matterId, setMatterId] = useState("");
  const [documents, setDocuments] = useState<WorkflowCaseDocument[]>([]);
  const [analysis, setAnalysis] = useState<WorkflowAnalysis | null>(null);
  const [facts, setFacts] = useState<Cp14Facts>(EMPTY_FACTS);
  const [factsSaved, setFactsSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [evidenceKind, setEvidenceKind] = useState<Cp14EvidenceKind>("payment_record");
  const [packet, setPacket] = useState<PacketPreview | null>(null);
  const [approvalId, setApprovalId] = useState("");
  const [recipient, setRecipient] = useState<MailingAddress>(EMPTY_ADDRESS);
  const [sender, setSender] = useState<MailingAddress>(EMPTY_ADDRESS);
  const [mailClass, setMailClass] = useState<"standard" | "certified" | "registered">("certified");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const sourceNotice = documents.find((document) => document.role === "subject_notice") ?? null;
  const evidence = documents.filter((document) => document.role === "evidence");
  const sourceReady = Boolean(sourceNotice?.usable && sourceNotice.security_status === "clean");
  const analysisReady = Boolean(analysis?.result.summary);

  const completedStepIds = useMemo(() => cp14CompletedSteps({
    hasCleanNotice: sourceReady,
    hasAnalysis: analysisReady,
    hasResponseFacts: factsSaved,
    hasDraft: draftSaved,
    hasApproval: Boolean(approvalId),
  }), [sourceReady, analysisReady, factsSaved, draftSaved, approvalId]);

  const currentStep = CP14_STEPS[stepIndex]!;

  async function refresh(id = matterId) {
    if (!id) return;
    const snapshot = await loadWorkflowCase(id);
    setDocuments(snapshot.documents);
  }

  async function restore(id: string) {
    setBusy("restore"); setError("");
    try {
      const [snapshot, storedAnalysis, storedInput, storedDraft, storedApproval] = await Promise.all([
        loadWorkflowCase(id), loadWorkflowAnalysis(id), loadWorkflowInput(id), loadWorkflowDraft(id), loadWorkflowApproval(id),
      ]);
      setDocuments(snapshot.documents);
      setAnalysis(storedAnalysis);
      if (storedInput?.input) { setFacts({ ...EMPTY_FACTS, ...(storedInput.input as Partial<Cp14Facts>) }); setFactsSaved(true); }
      if (storedDraft?.bodyText) { setDraft(storedDraft.bodyText); setDraftSaved(true); }
      if (storedApproval?.approvalId) setApprovalId(storedApproval.approvalId);
      const inferred = cp14CompletedSteps({
        hasCleanNotice: snapshot.documents.some((document) => document.role === "subject_notice" && document.usable && document.security_status === "clean"),
        hasAnalysis: Boolean(storedAnalysis?.result.summary),
        hasResponseFacts: Boolean(storedInput),
        hasDraft: Boolean(storedDraft?.bodyText),
        hasApproval: Boolean(storedApproval?.approvalId),
      });
      setStepIndex(Math.min(inferred.length, CP14_STEPS.length - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to restore this CP14 matter.");
      sessionStorage.removeItem("mailmypdf:cp14-response:matter");
      setMatterId("");
    } finally { setBusy(""); }
  }

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("matter");
    const stored = fromUrl || sessionStorage.getItem("mailmypdf:cp14-response:matter");
    if (!stored) return;
    setMatterId(stored);
    sessionStorage.setItem("mailmypdf:cp14-response:matter", stored);
    void restore(stored);
  }, []);

  useEffect(() => {
    if (!matterId || !documents.some((document) => !document.usable && document.security_status !== "rejected")) return;
    const timer = window.setInterval(() => void refresh(matterId).catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [matterId, documents]);

  async function ensureMatter(): Promise<string> {
    if (matterId) return matterId;
    const created = await createWorkflowCase(CP14_WORKFLOW_ID, CP14_VERTICAL_ID);
    setMatterId(created.id);
    sessionStorage.setItem("mailmypdf:cp14-response:matter", created.id);
    return created.id;
  }

  async function uploadSource(files: File[]) {
    const file = files[0]; if (!file) return;
    const id = await ensureMatter(); setBusy("upload-source"); setError("");
    try {
      if (sourceNotice) await detachWorkflowDocument(id, sourceNotice.document_id);
      const uploaded = await uploadSecureWorkflowDocument({ file, workflowId: CP14_WORKFLOW_ID, purpose: "irs_cp14_notice" });
      setDocuments(await attachWorkflowDocument({ caseId: id, documentId: uploaded.id, role: "subject_notice", position: 0 }));
      setAnalysis(null); setFactsSaved(false); setDraft(""); setDraftSaved(false); setPacket(null); setApprovalId("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to upload the CP14 notice."); }
    finally { setBusy(""); }
  }

  async function analyzeSource() {
    if (!matterId) return;
    setBusy("analyze"); setError("");
    try {
      const next = await analyzeWorkflowCase(matterId);
      setAnalysis(next);
      const detectedAddress = responseAddressFromAnalysis(next);
      if (detectedAddress) setRecipient(detectedAddress);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to analyze the CP14 notice."); }
    finally { setBusy(""); }
  }

  async function saveFacts() {
    if (!matterId) return;
    setBusy("save-facts"); setError("");
    try { await saveWorkflowInput(matterId, facts); setFactsSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the CP14 response facts."); }
    finally { setBusy(""); }
  }

  async function uploadEvidence(files: File[]) {
    const id = await ensureMatter(); setBusy("upload-evidence"); setError("");
    try {
      let position = documents.length + 1;
      for (const file of files) {
        const uploaded = await uploadSecureWorkflowDocument({ file, workflowId: CP14_WORKFLOW_ID, purpose: evidenceKind });
        setDocuments(await attachWorkflowDocument({ caseId: id, documentId: uploaded.id, role: "evidence", evidenceKind, position: position++ }));
      }
      setPacket(null); setApprovalId("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to upload supporting documents."); }
    finally { setBusy(""); }
  }

  async function removeDocument(documentId: string) {
    if (!matterId) return;
    setDocuments(await detachWorkflowDocument(matterId, documentId)); setPacket(null); setApprovalId("");
  }

  async function toggleIncluded(document: WorkflowCaseDocument) {
    if (!matterId || document.role !== "evidence") return;
    setDocuments(await updateWorkflowDocument({ caseId: matterId, documentId: document.document_id, included: !document.included }));
    setPacket(null); setApprovalId("");
  }

  async function generateDraft() {
    if (!matterId) return;
    setBusy("generate-draft"); setError("");
    try { const generated = await generateWorkflowDraft(matterId); setDraft(generated.bodyText); setDraftSaved(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to generate the CP14 response draft."); }
    finally { setBusy(""); }
  }

  async function saveDraft() {
    if (!matterId || !draft.trim()) return;
    setBusy("save-draft"); setError("");
    try { await saveWorkflowDraft(matterId, draft); setDraftSaved(true); setPacket(null); setApprovalId(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the response draft."); }
    finally { setBusy(""); }
  }

  async function buildPreview() {
    if (!matterId) return;
    setBusy("preview"); setError("");
    try { setPacket(await previewWorkflowPacket(matterId, mailClass)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to build the CP14 response packet."); }
    finally { setBusy(""); }
  }

  async function approve() {
    if (!matterId || !packet) return;
    setBusy("approve"); setError("");
    try { const result = await approveWorkflowPacket({ caseId: matterId, preview: packet, recipient, mailClass }); setApprovalId(result.approvalId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to approve the exact packet."); }
    finally { setBusy(""); }
  }

  async function checkout() {
    if (!matterId || !approvalId) return;
    setBusy("checkout"); setError("");
    try {
      const result = await checkoutWorkflowCase({ caseId: matterId, approvalId, sender });
      sessionStorage.setItem("mailmypdf:cp14-response:order", result.orderId);
      window.location.assign(result.checkoutUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open secure checkout."); setBusy(""); }
  }

  function stepReady(step: Cp14StepId): boolean {
    if (step === "notice") return sourceReady;
    if (step === "analysis") return analysisReady;
    if (step === "response" || step === "evidence") return factsSaved;
    if (step === "draft") return draftSaved;
    if (step === "review") return Boolean(approvalId);
    return false;
  }

  const rail = <><StatusCard current={stepIndex + 1} total={CP14_STEPS.length} stepLabel={currentStep.label} state={approvalId ? "ready" : "in_progress"} summary={matterId ? "Secure matter active." : "Upload the CP14 notice to open the matter."} /><ReadinessChecklist title="CP14 readiness" items={[
    { id: "source", label: "CP14 notice cleared security scanning", done: sourceReady },
    { id: "analysis", label: "Notice analyzed", done: analysisReady },
    { id: "facts", label: "Response facts confirmed", done: factsSaved },
    { id: "draft", label: "Response draft reviewed and saved", done: draftSaved },
    { id: "approval", label: "Exact packet approved", done: Boolean(approvalId) },
  ]} /></>;

  return <StepShell breadcrumb={[{ label: "Notice Respond", href: "/notice-respond" }, { label: "IRS CP14 Response", href: "/notice-respond/workflows/cp14-response" }, { label: currentStep.label }]} title="IRS CP14 Response" subtitle="Build a source-grounded response from the actual CP14 notice, your confirmed facts, supporting records, exact packet review, mailing, and proof." lastSavedLabel={matterId ? "Matter saved" : undefined} steps={[...CP14_STEPS]} currentStepId={currentStep.id} completedStepIds={completedStepIds} onStepClick={(id) => { const target = CP14_STEPS.findIndex((step) => step.id === id); if (target >= 0 && (target <= stepIndex || completedStepIds.includes(id as Cp14StepId))) setStepIndex(target); }} rail={rail}>
    {error && <div className="wf-callout wf-callout--danger">{error}</div>}

    {currentStep.id === "notice" && <DocumentUpload title="1. Upload the IRS CP14 notice" description="The actual notice is the source record. It is quarantined and scanned before analysis." multiple={false} items={sourceNotice ? [{ id: sourceNotice.document_id, name: sourceNotice.filename, sizeBytes: sourceNotice.size_bytes ?? undefined, status: sourceNotice.usable ? "Clean and ready" : sourceNotice.security_status, category: "IRS CP14 source notice" }] : []} onUpload={uploadSource} onRemove={sourceNotice ? () => removeDocument(sourceNotice.document_id) : undefined} />}

    {currentStep.id === "analysis" && <SectionCard title="2. Analyze the CP14" description="Identify the notice type, tax period, balance, notice date, important dates, and response destination from the source notice." footer={<button className="wf-btn wf-btn--primary" type="button" onClick={() => void analyzeSource()} disabled={!sourceReady || Boolean(busy)}>{busy === "analyze" ? "Analyzing…" : analysis ? "Analyze again" : "Analyze notice"}</button>}>
      {analysis ? <div className="wf-review-list">{[["Notice/decision", analysis.result.decision ?? "Not confirmed"], ["Issuer", analysis.result.issuer ?? "Internal Revenue Service"], ["Notice date", analysis.result.decisionDate ?? "Not confirmed"], ["Deadline or action date", analysis.result.deadline ?? "Not confirmed"]].map(([label, value]) => <div className="wf-review-row" key={label}><div className="wf-review-copy"><strong>{label}</strong><div className="wf-review-detail">{value}</div></div></div>)}<div className="wf-callout wf-callout--info">{analysis.result.summary}</div></div> : <p>Run analysis after the CP14 notice clears security scanning.</p>}
    </SectionCard>}

    {currentStep.id === "response" && <SectionCard title="3. Confirm your CP14 response facts" description="Your statements are stored separately from information extracted from the IRS notice." footer={<button className="wf-btn wf-btn--primary" type="button" onClick={() => void saveFacts()} disabled={Boolean(busy)}>Save response facts</button>}>
      <div className="wf-form-grid"><Field label="Taxpayer name" required><TextField value={facts.taxpayerName} onChange={(e) => setFacts({ ...facts, taxpayerName: e.target.value })} /></Field><Field label="Phone"><TextField value={facts.phone} onChange={(e) => setFacts({ ...facts, phone: e.target.value })} /></Field><Field label="Notice number"><TextField value={facts.noticeNumber} onChange={(e) => setFacts({ ...facts, noticeNumber: e.target.value })} /></Field><Field label="Tax period"><TextField value={facts.taxPeriod} onChange={(e) => setFacts({ ...facts, taxPeriod: e.target.value })} /></Field><Field label="Balance shown on notice"><TextField value={facts.balanceShown} onChange={(e) => setFacts({ ...facts, balanceShown: e.target.value })} /></Field><Field label="Response path" required><select className="wf-input" value={facts.responseMode} onChange={(e) => setFacts({ ...facts, responseMode: e.target.value as Cp14ResponseMode })}>{CP14_RESPONSE_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
      <Field label="Mailing address" required><TextArea rows={3} value={facts.taxpayerAddress} onChange={(e) => setFacts({ ...facts, taxpayerAddress: e.target.value })} /></Field>
      <Field label="Explain what the IRS should know" required={facts.responseMode !== "agree"}><TextArea rows={7} value={facts.explanation} onChange={(e) => setFacts({ ...facts, explanation: e.target.value })} /></Field>
      <Field label="Requested action" required><TextArea rows={3} value={facts.requestedAction} onChange={(e) => setFacts({ ...facts, requestedAction: e.target.value })} /></Field>
      <div className="wf-callout wf-callout--info">This workflow organizes correspondence from the facts and documents you provide. It does not determine whether the IRS balance is legally or mathematically correct.</div>
    </SectionCard>}

    {currentStep.id === "evidence" && <><SectionCard title="4. Supporting documents" description="Choose a category before upload. Only explicitly included clean documents enter the final packet."><Field label="Document type"><select className="wf-input" value={evidenceKind} onChange={(e) => setEvidenceKind(e.target.value as Cp14EvidenceKind)}>{CP14_EVIDENCE_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></SectionCard><DocumentUpload title="Upload supporting documents" items={evidence.map((document) => ({ id: document.document_id, name: document.filename, sizeBytes: document.size_bytes ?? undefined, status: document.usable ? (document.included ? "Included" : "Excluded") : document.security_status, category: evidenceLabel(document.evidence_kind) }))} onUpload={uploadEvidence} onRemove={removeDocument} />{evidence.map((document) => <CheckboxField key={document.document_id} checked={document.included} onChange={() => void toggleIncluded(document)} label={`Include ${document.filename} in the outgoing packet`} />)}</>}

    {currentStep.id === "draft" && <SectionCard title="5. Draft the CP14 response" description="Generate a source-grounded response using the CP14 notice, confirmed facts, selected response path, and included documents. Edit it before saving." footer={<div className="wf-draft-actions"><button className="wf-btn wf-btn--outline" type="button" onClick={() => void generateDraft()} disabled={!factsSaved || Boolean(busy)}>Generate draft</button><button className="wf-btn wf-btn--primary" type="button" onClick={() => void saveDraft()} disabled={!draft.trim() || Boolean(busy)}>Save reviewed draft</button></div>}><TextArea rows={20} value={draft} onChange={(e) => { setDraft(e.target.value); setDraftSaved(false); }} placeholder="Generate the CP14 response draft or enter your own correspondence." /></SectionCard>}

    {currentStep.id === "review" && <><SectionCard title="6. Build the exact packet" description="Confirm the response address printed on the CP14 or current IRS instructions before approval."><AddressFields value={recipient} onChange={setRecipient} /><Field label="Mailing method"><select className="wf-input" value={mailClass} onChange={(e) => { setMailClass(e.target.value as typeof mailClass); setPacket(null); setApprovalId(""); }}><option value="standard">Standard mail</option><option value="certified">Certified mail</option><option value="registered">Registered mail</option></select></Field><button className="wf-btn wf-btn--primary" type="button" onClick={() => void buildPreview()} disabled={!draftSaved || !addressReady(recipient) || Boolean(busy)}>{busy === "preview" ? "Building…" : "Build exact packet preview"}</button></SectionCard>{packet && <ApprovalChecklist reviewItems={[{ id: "hash", label: "Exact packet SHA-256", detail: packet.packetSha256, status: "Built", tone: "success" }, { id: "pages", label: "Packet pages", detail: String(packet.responsePages + packet.supportingPages), status: "Measured", tone: "info" }, { id: "price", label: "Server-authoritative total", detail: `$${(packet.quote.totalCents / 100).toFixed(2)}`, status: "Quoted", tone: "info" }, { id: "recipient", label: "Recipient", detail: `${recipient.name}, ${recipient.line1}, ${recipient.city}, ${recipient.state} ${recipient.postal}`, status: "Review", tone: "warning" }]} confirmations={[{ id: "content", label: "I reviewed the response and every included document." }, { id: "recipient", label: "I confirmed the mailing destination against my CP14 notice or current IRS instructions." }]} approveLabel={busy === "approve" ? "Approving…" : "Approve this exact packet"} onApprove={approve} />}</>}

    {currentStep.id === "mail" && <FulfillmentPanel phase={approvalId ? "payment" : "review"} title="7. Pay, mail, track, and retain proof" description="Payment and mailing are tied to the immutable approval so retries cannot silently mail a different packet." details={[{ label: "Approval", value: approvalId || "Not approved" }, { label: "Mail class", value: mailClass }, { label: "Packet hash", value: packet?.packetSha256 ?? "Stored with approval" }]} actions={<button className="wf-btn wf-btn--primary" type="button" onClick={() => void checkout()} disabled={!approvalId || !addressReady(sender) || Boolean(busy)}>Continue to secure payment</button>}><SectionCard title="Return address" description="Used as the sender/return address for the approved mailing."><AddressFields value={sender} onChange={setSender} /></SectionCard></FulfillmentPanel>}

    <div className="wf-draft-actions"><button className="wf-btn wf-btn--outline" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>Back</button>{currentStep.id !== "mail" && <button className="wf-btn wf-btn--primary" type="button" disabled={!stepReady(currentStep.id)} onClick={() => setStepIndex((value) => Math.min(CP14_STEPS.length - 1, value + 1))}>Continue</button>}</div>
  </StepShell>;
}

function AddressFields({ value, onChange }: { value: MailingAddress; onChange: (next: MailingAddress) => void }) {
  return <div className="wf-form-grid"><Field label="Name" required><TextField value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></Field><Field label="Address line 1" required><TextField value={value.line1} onChange={(e) => onChange({ ...value, line1: e.target.value })} /></Field><Field label="Address line 2"><TextField value={value.line2 ?? ""} onChange={(e) => onChange({ ...value, line2: e.target.value })} /></Field><Field label="City" required><TextField value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} /></Field><Field label="State" required><TextField maxLength={2} value={value.state} onChange={(e) => onChange({ ...value, state: e.target.value.toUpperCase() })} /></Field><Field label="ZIP" required><TextField value={value.postal} onChange={(e) => onChange({ ...value, postal: e.target.value })} /></Field></div>;
}
