import { useState, type ReactNode } from "react";
import { FileCheck2, LockKeyhole, ShieldCheck, UploadCloud } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import {
  analyzeNotice, approveNoticePacket, attachNoticeDocument, createNoticeCase, generateNoticeDraft,
  loadNoticeCase, previewNoticePacket, saveNoticeDraft, saveNoticeInput,
  uploadNoticeDocument, type NoticeWorkflowId,
} from "@/lib/notice-response-workflow-client";
import type { MailClass, PacketPreview, Recipient } from "@/lib/ssdi-workflow-model";

const configs = {
  "cp14-response": { eyebrow: "IRS CP14", title: "Respond to your balance due notice", subtitle: "Upload the notice, choose a clear response path, and review a secure packet before anything is mailed.", modes: [["pay", "Pay the balance"], ["dispute", "Dispute the balance"], ["request-arrangement", "Request an installment agreement"], ["request-oic", "Request an offer in compromise"], ["request-cnc", "Request hardship status"]] },
  "cp2000-response": { eyebrow: "IRS CP2000", title: "Build your response to a proposed adjustment", subtitle: "Address every proposed item with the evidence you actually have, then approve the exact response packet before mailing.", modes: [["agree", "Agree with the changes"], ["disagree", "Disagree with the changes"], ["partial-agreement", "Partially agree"]] },
} as const;

type Props = { workflow: NoticeWorkflowId };
type Step = "start" | "review" | "facts" | "draft" | "approve";
const steps: Step[] = ["start", "review", "facts", "draft", "approve"];

export function IrsNoticeWorkflow({ workflow }: Props) {
  const config = configs[workflow];
  const [step, setStep] = useState<Step>("start");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; security_status: string } | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState("");
  const [packet, setPacket] = useState<PacketPreview | null>(null);
  const [approved, setApproved] = useState(false);
  const [input, setInput] = useState<Record<string, unknown>>({ taxpayerName: "", ssnOrItin: "", taxpayerAddress: "", taxYear: "", responseMode: config.modes[0][0], userFacts: "", disputedItems: "", correctedAmounts: "", evidenceByItem: "", requestedOutcome: "", amountDisputed: "", monthlyPayment: "", paymentStartDate: "", firstTimeAbateConfirmed: false, penaltyReliefBasis: "" });
  const [recipient, setRecipient] = useState<Recipient>({ name: "Internal Revenue Service", line1: "", line2: undefined, city: "", state: "", postal: "" });

  async function startCase(file?: File) {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const created = await createNoticeCase(workflow); setCaseId(created.id);
      const uploaded = await uploadNoticeDocument(file, workflow); setNotice(uploaded);
      await attachNoticeDocument(created.id, uploaded.id, "subject_notice", "notice");
      setStep("review");
    } catch (e) { setError(e instanceof Error ? e.message : "We could not start this protected workflow."); }
    finally { setBusy(false); }
  }
  async function runAnalysis() {
    if (!caseId) return; setBusy(true); setError(null);
    try {
      let current = notice?.security_status;
      for (let attempt = 0; attempt < 12 && current !== "clean"; attempt += 1) {
        const loaded = await loadNoticeCase(caseId);
        const subject = loaded.documents.find((d) => d.role === "subject_notice");
        current = subject?.security_status;
        setNotice(subject ? { id: subject.document_id, security_status: subject.security_status } : notice);
        if (current !== "clean") await new Promise((resolve) => setTimeout(resolve, 750));
      }
      if (current !== "clean") throw new Error("The security scan is still running. Check again in a moment.");
      const r = await analyzeNotice(caseId); setAnalysis(r.analysis.result); setStep("facts");
    }
    catch (e) { setError(e instanceof Error ? e.message : "Analysis could not be completed."); } finally { setBusy(false); }
  }
  async function saveFacts() {
    if (!caseId) return; setBusy(true); setError(null);
    try { await saveNoticeInput(caseId, input); const r = await generateNoticeDraft(caseId); setDraft(r.draft.bodyText); setStep("draft"); }
    catch (e) { setError(e instanceof Error ? e.message : "Please complete the required notice details."); } finally { setBusy(false); }
  }
  async function saveAndPreview() {
    if (!caseId || !draft.trim()) return; setBusy(true); setError(null);
    try { await saveNoticeDraft(caseId, draft); setPacket(await previewNoticePacket(caseId, "certified")); setStep("approve"); }
    catch (e) { setError(e instanceof Error ? e.message : "The packet could not be prepared."); } finally { setBusy(false); }
  }
  async function approve() {
    if (!caseId || !packet) return; setBusy(true); setError(null);
    try { await approveNoticePacket(caseId, recipient, "certified", packet); setApproved(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Approval could not be recorded."); } finally { setBusy(false); }
  }
  const idx = steps.indexOf(step);
  return <div className="min-h-screen bg-paper text-foreground"><SiteHeader /><main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
    <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-brass">{config.eyebrow}</p><h1 className="mt-4 font-serif text-4xl leading-tight text-cobalt sm:text-6xl">{config.title}</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{config.subtitle}</p></div>
    <div className="mx-auto mt-10 flex max-w-4xl items-center justify-between" aria-label="Workflow progress">{steps.map((s, i) => <div key={s} className="flex flex-1 items-center"><div className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${i <= idx ? "border-cobalt bg-cobalt text-white" : "border-rule bg-paper text-muted-foreground"}`}>{i + 1}</div>{i < steps.length - 1 && <div className={`mx-2 h-px flex-1 ${i < idx ? "bg-cobalt" : "bg-rule"}`} />}</div>)}</div>
    {error && <div role="alert" className="mx-auto mt-6 max-w-4xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    <section className="mx-auto mt-10 max-w-4xl rounded-3xl border border-rule bg-card p-6 shadow-sm sm:p-10">
      {step === "start" && <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-brass/40 bg-paper-deep/40 text-cobalt"><UploadCloud /></div><h2 className="mt-6 font-serif text-3xl text-cobalt">Start with your {workflow === "cp14-response" ? "CP14" : "CP2000"} notice</h2><p className="mt-3 text-muted-foreground">PDF, PNG, or JPG. Your file is owner-scoped, scan-gated, and never mailed without your approval.</p><label className="mx-auto mt-8 flex max-w-sm cursor-pointer items-center justify-center rounded-xl bg-cobalt px-5 py-3 font-semibold text-white hover:bg-cobalt/90"><UploadCloud className="mr-2 h-5 w-5" />{busy ? "Securing document…" : "Choose document"}<input className="sr-only" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => void startCase(e.target.files?.[0])} disabled={busy} /></label><div className="mt-8 grid gap-3 text-left text-sm text-muted-foreground sm:grid-cols-3"><Trust icon={<LockKeyhole />} text="Owner scoped" /><Trust icon={<ShieldCheck />} text="Scan before analysis" /><Trust icon={<FileCheck2 />} text="Approval before mailing" /></div></div>}
      {step === "review" && <div><Header title="Review the protected intake" body="The notice is quarantined until the security scan clears. Start analysis only after the document is clean." /><div className="rounded-xl border border-rule bg-paper-deep/30 p-5"><p className="font-semibold">{notice ? "Notice uploaded" : "No notice attached"}</p><p className="mt-1 text-sm text-muted-foreground">Security status: {notice?.security_status ?? "pending scan"}. The original file remains in private storage.</p></div><Button className="mt-6" onClick={() => void runAnalysis()} disabled={busy}>{busy ? "Checking scan and analyzing…" : "Check scan and analyze"}</Button></div>}
      {step === "facts" && <div><Header title="Confirm what the notice says" body="Analysis extracts facts from the clean notice. Your answers below stay separate and are used to shape the draft." />{analysis && <div className="mb-6 rounded-xl border border-brass/30 bg-paper-deep/30 p-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-brass">Extracted from the notice</p><div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">{Object.entries(analysis).slice(0, 6).map(([key, value]) => <div key={key}><p className="text-xs text-muted-foreground">{key.replaceAll("_", " ")}</p><p className="mt-1 font-medium">{typeof value === "string" || typeof value === "number" ? String(value) : "Recorded"}</p></div>)}</div></div>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Taxpayer name" value={String(input.taxpayerName)} onChange={(v) => setInput({ ...input, taxpayerName: v })} /><Field label="SSN or ITIN as shown" value={String(input.ssnOrItin)} onChange={(v) => setInput({ ...input, ssnOrItin: v })} /><Field label="Tax year" value={String(input.taxYear)} onChange={(v) => setInput({ ...input, taxYear: v })} /><Field label="Mailing address" value={String(input.taxpayerAddress)} onChange={(v) => setInput({ ...input, taxpayerAddress: v })} /><label className="text-sm font-medium sm:col-span-2">Response path<select className="mt-1 w-full rounded-lg border border-rule bg-paper p-3" value={String(input.responseMode)} onChange={(e) => setInput({ ...input, responseMode: e.target.value })}>{config.modes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><label className="text-sm font-medium sm:col-span-2">What should the reviewer know?<textarea className="mt-1 min-h-28 w-full rounded-lg border border-rule bg-paper p-3" value={String(input.userFacts)} onChange={(e) => setInput({ ...input, userFacts: e.target.value })} maxLength={12000} /></label></div>{workflow === "cp2000-response" && <Field label="Items you disagree with" value={String(input.disputedItems)} onChange={(v) => setInput({ ...input, disputedItems: v })} />}<Button className="mt-6" onClick={() => void saveFacts()} disabled={busy}>{busy ? "Preparing draft…" : "Build a draft response"}</Button></div>}
      {step === "draft" && <div><Header title="Review your response draft" body="Edit the letter in your own words. The saved version becomes the source for the packet preview." /><textarea className="min-h-[20rem] w-full rounded-xl border border-rule bg-paper p-4 font-serif leading-7" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={30000} /><Button className="mt-6" onClick={() => void saveAndPreview()} disabled={busy || !draft.trim()}>{busy ? "Building packet…" : "Preview secure mailing packet"}</Button></div>}
      {step === "approve" && <div>{approved ? <div className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-white"><FileCheck2 /></div><Header title="Your packet is approved" body="The approval is bound to the packet hash you reviewed. Mailing stays in the protected fulfillment queue until payment is completed." /><p className="text-sm text-muted-foreground">Keep this page open while the secure payment handoff is prepared.</p></div> : <><Header title="Approve the exact packet" body="Certified Mail is selected. Confirm the destination, packet hash, and quote before approval." /><div className="rounded-xl border border-rule bg-paper-deep/30 p-5 text-sm"><p className="font-semibold">Packet ready for review</p><p className="mt-2 text-muted-foreground">{packet ? `${packet.responsePages} response page(s), ${packet.supportingPages} supporting page(s)` : "Approval recorded."}</p>{packet && <p className="mt-2 break-all font-mono text-xs text-muted-foreground">SHA-256: {packet.packetSha256}</p>}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Recipient street address" value={recipient.line1} onChange={(v) => setRecipient({ ...recipient, line1: v })} /><Field label="City" value={recipient.city} onChange={(v) => setRecipient({ ...recipient, city: v })} /><Field label="State" value={recipient.state} onChange={(v) => setRecipient({ ...recipient, state: v.toUpperCase() })} /><Field label="ZIP code" value={recipient.postal} onChange={(v) => setRecipient({ ...recipient, postal: v })} /></div><Button className="mt-6" onClick={() => void approve()} disabled={busy || !packet}>{busy ? "Recording approval…" : "Approve packet"}</Button></>}</div>}
    </section>
    <p className="mx-auto mt-6 max-w-4xl text-center text-xs leading-5 text-muted-foreground">{analysis ? "Findings are shown for review and are not legal or tax advice." : "Your document stays private. Mailing remains held until you approve the exact packet."}</p>
  </main><SiteFooter /></div>;
}
function Header({ title, body }: { title: string; body: string }) { return <><h2 className="font-serif text-3xl text-cobalt">{title}</h2><p className="mt-2 mb-6 text-muted-foreground">{body}</p></>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="text-sm font-medium">{label}<input className="mt-1 w-full rounded-lg border border-rule bg-paper p-3" value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
function Trust({ icon, text }: { icon: ReactNode; text: string }) { return <div className="flex items-center gap-2 rounded-lg border border-rule bg-paper p-3"><span className="text-cobalt">{icon}</span>{text}</div>; }
