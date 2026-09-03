import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, ChevronRight, FileText, FolderOpen, Loader2, Mail, Package, RefreshCw, Send, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppShell, IssueCard, ProgressRail, StatusBadge } from "@/components/workspace/app-shell";
import type { WorkflowStep } from "@/domain/workflows";
import type { Appeal } from "@/domain/appeal";
import { useAuth } from "@/lib/auth";
import { loadAppeal } from "@/platform/appeal-repository";
import { runCaseAnalysis, runCaseDraft, reviseCaseDraft } from "@/platform/case-ai";

export type CaseWorkspaceProps = { caseId: string };
type Tab = "overview" | "documents" | "analysis" | "response" | "packet" | "mail";

const steps: Array<{ step: WorkflowStep; label: string; icon: typeof FileText }> = [
  { step: "intro", label: "Overview", icon: FolderOpen },
  { step: "document", label: "Documents", icon: FileText },
  { step: "xray", label: "AI Analysis", icon: Bot },
  { step: "draft", label: "Response", icon: FileText },
  { step: "packet", label: "Packet", icon: Package },
  { step: "mailing", label: "Mail", icon: Send },
  { step: "proof", label: "Proof", icon: ShieldCheck },
];

export function CaseWorkspace({ caseId }: CaseWorkspaceProps) {
  const { user, loading: authLoading } = useAuth();
  const [appeal, setAppeal] = useState<(Appeal & { version?: number }) | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [step, setStep] = useState<WorkflowStep>("intro");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [userFacts, setUserFacts] = useState("");
  const [objective, setObjective] = useState("Request reversal of the decision and a full review of the supporting facts.");
  const [revision, setRevision] = useState("");

  async function refresh() {
    if (!user) return;
    setLoading(true); setError(null);
    try { setAppeal(await loadAppeal({ data: { id: caseId, userId: user.id } })); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load case."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, [caseId, user]);

  const go = (next: Tab) => { setTab(next); setStep(({ overview: "intro", documents: "document", analysis: "xray", response: "draft", packet: "packet", mail: "mailing" } as Record<Tab, WorkflowStep>)[next]); };
  const documentText = sourceText || appeal?.decision.rawText || appeal?.decision.facts.map((f) => `${f.label}: ${f.value}`).join("\n") || "";
  const facts = useMemo(() => appeal?.decision.facts || [], [appeal]);

  if (authLoading || loading) return <div className="min-h-screen bg-cream flex items-center justify-center"><Loader2 className="animate-spin text-stamp" size={22} /></div>;
  if (!user) return <div className="min-h-screen bg-cream flex items-center justify-center"><div className="text-center"><h1 className="heading-lg">Sign in required</h1><Link to="/auth" className="btn-amber mt-5 inline-flex">Sign in</Link></div></div>;
  if (error || !appeal) return <div className="min-h-screen bg-cream flex items-center justify-center"><div className="max-w-md text-center"><h1 className="heading-lg">Case unavailable</h1><p className="mt-3 text-sm text-muted-foreground">{error || "We could not load this case."}</p><Link to="/dashboard" className="btn-outline mt-5 inline-flex">Back to cases</Link></div></div>;

  const navItems = steps.map((item, index) => ({ ...item, completed: index === 0 || (index === 1 && Boolean(documentText)) || (index === 2 && Boolean(appeal.decision.extractedAt)) || (index === 3 && appeal.draft.length > 50) || (index === 4 && Boolean(appeal.packet)), attention: item.step === "document" && !documentText }));

  const analyze = async () => {
    if (documentText.trim().length < 20) { setTab("documents"); setStep("document"); return; }
    setAnalysisBusy(true); setError(null);
    try { const result = await runCaseAnalysis({ data: { caseId, userId: user.id, documentText } }); setAppeal(result.appeal); go("analysis"); }
    catch (err) { setError(err instanceof Error ? err.message : "AI analysis failed."); }
    finally { setAnalysisBusy(false); }
  };

  const draft = async () => {
    setDraftBusy(true); setError(null);
    try { const result = await runCaseDraft({ data: { caseId, userId: user.id, userFacts, userObjective: objective } }); setAppeal(result.appeal); go("response"); }
    catch (err) { setError(err instanceof Error ? err.message : "Draft generation failed."); }
    finally { setDraftBusy(false); }
  };

  const revise = async () => {
    if (!revision.trim() || !appeal.draft.trim()) return;
    setRevisionBusy(true); setError(null);
    try { const result = await reviseCaseDraft({ data: { caseId, userId: user.id, draft: appeal.draft, instruction: revision } }); setAppeal(result.appeal); setRevision(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Revision failed."); }
    finally { setRevisionBusy(false); }
  };

  return <AppShell navItems={navItems} currentStep={step} onNavigate={(next) => go(({ intro: "overview", document: "documents", xray: "analysis", draft: "response", packet: "packet", mailing: "mail", proof: "mail" } as Record<WorkflowStep, Tab>)[next])} appealNumber={appeal.decision.referenceNumber || `CASE-${caseId.slice(0, 8).toUpperCase()}`} appealTitle={appeal.decision.decisionTypeLabel || appeal.workflowId} statusLabel={appeal.status}>
    <div className="mb-5 flex items-center justify-between gap-3"><div className="min-w-0"><div className="section-label">{appeal.workflowId}</div><h1 className="heading-xl truncate">{appeal.decision.decisionTypeLabel || appeal.workflowId}</h1></div><Link to="/dashboard" className="btn-outline hidden sm:inline-flex">All cases</Link></div>
    <ProgressRail steps={steps.map((item, index) => ({ label: item.label, step: item.step, status: index === 0 ? "current" : index < 1 || (index === 1 && Boolean(documentText)) ? "done" : "todo" }))} currentStep={step} />
    <div className="mt-6 flex gap-1 overflow-x-auto border-b border-warm-border">{(["overview", "documents", "analysis", "response", "packet", "mail"] as Tab[]).map((key) => <button key={key} onClick={() => go(key)} className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${tab === key ? "border-stamp text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{key === "analysis" ? "AI Analysis" : key[0].toUpperCase() + key.slice(1)}</button>)}</div>
    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {tab === "overview" && <Overview appeal={appeal} onGo={go} />}
    {tab === "documents" && <Documents sourceText={sourceText} setSourceText={setSourceText} documentText={documentText} />}
    {tab === "analysis" && <Analysis appeal={appeal} busy={analysisBusy} onRun={analyze} />}
    {tab === "response" && <Response appeal={appeal} userFacts={userFacts} setUserFacts={setUserFacts} objective={objective} setObjective={setObjective} busy={draftBusy} onDraft={draft} revision={revision} setRevision={setRevision} revisionBusy={revisionBusy} onRevise={revise} />}
    {tab === "packet" && <Packet appeal={appeal} onGo={go} />}
    {tab === "mail" && <MailStage appeal={appeal} />}
  </AppShell>;
}

function Overview({ appeal, onGo }: { appeal: Appeal; onGo: (tab: Tab) => void }) { return <div className="space-y-5"><div className="card p-6"><div className="flex items-start gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50"><Sparkles size={20} className="text-indigo-700" /></div><div><p className="section-label">Case workspace</p><h2 className="heading-lg mt-1">Build the appeal from the record.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Source documents, extracted facts, AI analysis, response revisions, packet integrity, and mailing stay together in one owner-scoped case.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Action label="Review documents" icon={FileText} onClick={() => onGo("documents")} /><Action label="Run AI analysis" icon={Bot} onClick={() => onGo("analysis")} /><Action label="Prepare response" icon={Send} onClick={() => onGo("response")} /></div></div><div className="grid gap-4 md:grid-cols-2"><Fact label="Agency" value={appeal.decision.agency || "Not identified"} /><Fact label="Reference" value={appeal.decision.referenceNumber || "Not provided"} /><Fact label="Deadline" value={appeal.decision.deadline?.date || "Not established"} /><Fact label="Status" value={appeal.status} /></div></div> }
function Documents({ sourceText, setSourceText, documentText }: { sourceText: string; setSourceText: (v: string) => void; documentText: string }) { return <div className="space-y-5"><div className="card p-6"><div className="flex items-start justify-between gap-4"><div><p className="section-label">Document room</p><h2 className="heading-lg mt-1">Give the analyst the source record.</h2><p className="mt-2 text-sm text-slate-600">Paste extracted text here or use the existing stored decision text. The production packet remains server-authoritative.</p></div><label className="btn-outline cursor-pointer"><Upload size={16} /> Stage file<input type="file" accept=".txt,.md" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setSourceText(await f.text()); }} /></label></div><textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste the text of the decision, denial, notice, or ruling…" className="mt-6 min-h-[300px] w-full rounded-xl border border-warm-border bg-white p-5 text-sm leading-7 outline-none focus:border-indigo-500" /><div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 size={14} /> {documentText.length.toLocaleString()} characters available to the pipeline.</div></div><div className="card p-5"><p className="section-label">Integrity</p><p className="mt-2 text-sm leading-6 text-slate-600">Source material is treated as data. AI output is advisory; confirmed case facts remain the authoritative record.</p></div></div> }
function Analysis({ appeal, busy, onRun }: { appeal: Appeal; busy: boolean; onRun: () => void }) { return <div className="space-y-5"><div className="card p-6"><div className="flex items-start justify-between"><div><p className="section-label">AI analyst</p><h2 className="heading-lg mt-1">Understand before writing.</h2><p className="mt-2 text-sm text-slate-600">The shared AI service extracts structured facts and deadlines, then persists them into the case.</p></div><Bot className="text-indigo-700" size={26} /></div><button className="btn-amber mt-6 inline-flex" disabled={busy} onClick={onRun}>{busy ? <><Loader2 className="animate-spin" size={16} /> Analyzing…</> : <><RefreshCw size={16} /> {appeal.decision.extractedAt ? "Run analysis again" : "Run AI analysis"}</>}</button></div><div className="grid gap-4 md:grid-cols-2">{appeal.decision.facts.map((f) => <div key={f.id} className="card p-4"><p className="section-label">{f.label}</p><p className="mt-1 text-sm text-slate-700">{f.value}</p><p className="mt-2 text-xs text-muted-foreground">{f.source} · {Math.round(f.confidence * 100)}% confidence</p></div>)}</div><div className="card p-5"><div className="flex gap-3"><ShieldCheck className="text-emerald-600" size={19} /><p className="text-sm text-slate-600">AI findings are persisted with provenance and do not overwrite user-confirmed facts silently.</p></div></div></div> }
function Response({ appeal, userFacts, setUserFacts, objective, setObjective, busy, onDraft, revision, setRevision, revisionBusy, onRevise }: { appeal: Appeal; userFacts: string; setUserFacts: (v: string) => void; objective: string; setObjective: (v: string) => void; busy: boolean; onDraft: () => void; revision: string; setRevision: (v: string) => void; revisionBusy: boolean; onRevise: () => void }) { return <div className="space-y-5"><div className="card p-6"><p className="section-label">Response writer</p><h2 className="heading-lg mt-1">Generate and refine the appeal.</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Your facts<textarea value={userFacts} onChange={(e) => setUserFacts(e.target.value)} placeholder="Facts, circumstances, evidence, or corrections only you know…" className="mt-2 min-h-32 w-full rounded-xl border border-warm-border p-4" /></label><label className="text-sm font-medium">Your objective<textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-warm-border p-4" /></label></div><button className="btn-amber mt-4 inline-flex" disabled={busy} onClick={onDraft}>{busy ? <><Loader2 className="animate-spin" size={16} /> Writing…</> : <><Sparkles size={16} /> Generate response</>}</button></div>{appeal.draft && <div className="card p-6"><div className="flex items-center justify-between"><div><p className="section-label">Current draft</p><p className="mt-1 text-xs text-muted-foreground">Persisted case draft · {appeal.draft.length.toLocaleString()} characters</p></div><StatusBadge status="in-progress">Editable</StatusBadge></div><textarea value={appeal.draft} readOnly className="mt-5 min-h-[420px] w-full rounded-xl border border-warm-border bg-white p-5 text-sm leading-7" /><div className="mt-4 border-t border-warm-border pt-4"><label className="text-sm font-medium">Ask AI to revise the draft<textarea value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="Make the opening more direct; clarify the deadline; preserve all facts…" className="mt-2 min-h-24 w-full rounded-xl border border-warm-border p-4" /></label><button className="btn-outline mt-3 inline-flex" disabled={revisionBusy || !revision.trim()} onClick={onRevise}>{revisionBusy ? <><Loader2 className="animate-spin" size={16} /> Revising…</> : "Revise with AI"}</button></div></div>}</div> }
function Packet({ appeal, onGo }: { appeal: Appeal; onGo: (tab: Tab) => void }) { return <div className="space-y-5"><div className="card p-6"><p className="section-label">Final packet</p><h2 className="heading-lg mt-1">Assemble only after the response is ready.</h2><p className="mt-2 text-sm text-slate-600">The existing packet editor remains the authoritative assembly surface. A locked packet is the only artifact eligible for payment fulfillment.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><Fact label="Draft" value={appeal.draft.length > 50 ? "Ready" : "Not ready"} /><Fact label="Packet" value={appeal.packet ? "Assembled" : "Not assembled"} /><Fact label="Proof" value={appeal.proof ? "Present" : "Pending"} /></div><button className="btn-amber mt-5 inline-flex" onClick={() => onGo("mail")} disabled={!appeal.packet}>Review mailing</button></div><IssueCard title="Human authorization boundary" description="Before payment, verify the recipient, final pages, mailing method, and locked-packet hash in the existing packet workflow." actionLabel="Open mailing stage" onAction={() => onGo("mail")} /></div> }
function MailStage({ appeal }: { appeal: Appeal }) { const ready = Boolean(appeal.packet && appeal.status !== "mailed" && appeal.status !== "delivered"); return <div className="space-y-5"><div className="card p-6"><div className="flex gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50"><Mail className="text-amber-700" size={21} /></div><div><p className="section-label">Mailing</p><h2 className="heading-lg mt-1">{ready ? "Review the final artifact before mailing." : "Mailing record"}</h2><p className="mt-2 text-sm text-slate-600">Payment and fulfillment continue through the existing locked-packet pipeline. This workspace does not generate a second document.</p></div></div>{ready && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Recipient, mailing method, packet lock, and approval must all be verified before checkout.</div>}</div><div className="card p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-emerald-600" size={20} /><div><p className="font-semibold">Stored artifact integrity</p><p className="text-xs text-muted-foreground mt-1">Fulfillment is designed to send the approved stored packet rather than reconstructing it after payment.</p></div></div></div></div> }
function Action({ label, icon: Icon, onClick }: { label: string; icon: typeof FileText; onClick: () => void }) { return <button className="card flex items-center gap-3 p-4 text-left hover:border-indigo-300" onClick={onClick}><Icon size={18} className="text-indigo-700" /><span className="text-sm font-medium">{label}</span><ChevronRight className="ml-auto" size={16} /></button> }
function Fact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-warm-border bg-white p-4"><p className="section-label">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{value}</p></div> }
