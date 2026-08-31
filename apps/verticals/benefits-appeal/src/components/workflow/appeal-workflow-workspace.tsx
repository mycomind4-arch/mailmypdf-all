import { useMemo, useState } from "react";
import { Upload, Sparkles, CheckCircle2, Send, FileText, AlertTriangle, ArrowRight } from "lucide-react";
import { workflows, type WorkflowId } from "@/domain/workflows";

type Stage = "understand" | "build" | "send";
type Recipient = { name: string; address1: string; address2: string; city: string; state: string; zip: string };
type AnalysisResult = {
  ok: boolean;
  appealId?: string;
  workflowId: string;
  workflow: { title: string; primaryKeyword?: string };
  document?: { id?: string; filename?: string; sha256?: string; size_bytes?: number };
  analysis: {
    summary?: string; decision?: string; decisionType?: string; issuer?: string; referenceNumber?: string;
    decisionDate?: string; deadline?: string; reasons?: string[]; denialReasons?: string[]; keyFacts?: string[];
    issues?: Array<{ issue?: string; whyItMatters?: string; evidenceNeeded?: string[] }>;
    evidenceMentioned?: string[]; uncertainties?: string[]; confidence?: string;
  };
  provider: string; model: string;
};

async function getAccessToken(): Promise<string> {
  const { getSupabaseClient } = await import("@/platform/supabase");
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Authentication is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Please sign in to use this workflow.");
  return data.session.access_token;
}

export function AppealWorkflowWorkspace({ workflowId, suppressH1 = false }: { workflowId: WorkflowId; suppressH1?: boolean }) {
  const workflow = workflows[workflowId];
  const insuranceMode = workflowId === "insurance-claim-denial";
  const [stage, setStage] = useState<Stage>("understand");
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [draft, setDraft] = useState("");
  const [validation, setValidation] = useState("");
  const [appealId, setAppealId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<Recipient>({ name: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [mailingMethod, setMailingMethod] = useState<"standard" | "certified" | "registered">("certified");
  const [review, setReview] = useState<any>(null);
  const [approved, setApproved] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [approving, setApproving] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => ({ understand: 0, build: 50, send: 100 }[stage]), [stage]);
  const recipientComplete = Boolean(recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip);

  async function analyze() {
    if (!file) return;
    setAnalyzing(true); setError(null);
    try {
      const token = await getAccessToken();
      const form = new FormData(); form.append("document", file);
      const endpoint = insuranceMode ? "/api/workflows/insurance-claim-denial/analyze" : `/api/workflows/${workflowId}/analyze`;
      const response = await fetch(endpoint, { method: "POST", body: form, credentials: "include", headers: { authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Analysis failed.");
      setAnalysis(payload as AnalysisResult);
      if (payload?.appealId) setAppealId(payload.appealId);
      setStage("build");
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed."); }
    finally { setAnalyzing(false); }
  }

  async function build() {
    if (!analysis || (insuranceMode && !(appealId || analysis.appealId))) return;
    setBuilding(true); setError(null);
    try {
      const token = await getAccessToken();
      const id = appealId || analysis.appealId;
      const endpoint = insuranceMode ? "/api/workflows/insurance-claim-denial/draft" : `/api/workflows/${workflowId}/draft`;
      const body = insuranceMode ? { appealId: id, analysis: analysis.analysis } : { analysis: analysis.analysis };
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, credentials: "include", body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Drafting failed.");
      if (payload?.appealId) setAppealId(payload.appealId);
      setDraft(payload.draft || ""); setValidation(payload.validation || ""); setStage("send");
    } catch (e) { setError(e instanceof Error ? e.message : "Drafting failed."); }
    finally { setBuilding(false); }
  }

  async function approve() {
    if (!insuranceMode || !(appealId || analysis?.appealId) || !recipientComplete) return;
    setApproving(true); setError(null);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/workflows/insurance-claim-denial/approve", {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, credentials: "include",
        body: JSON.stringify({ appealId: appealId || analysis?.appealId, draft, recipient, mailingMethod }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { if (payload?.review) setReview(payload.review); throw new Error(payload?.error || "Approval failed."); }
      setReview(payload.review); setApproved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Approval failed."); }
    finally { setApproving(false); }
  }

  async function checkout() {
    if (!insuranceMode || !approved || !(appealId || analysis?.appealId)) return;
    setCheckingOut(true); setError(null);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/workflows/insurance-claim-denial/checkout", {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, credentials: "include",
        body: JSON.stringify({ appealId: appealId || analysis?.appealId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "Checkout could not be created.");
      window.location.assign(payload.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout failed."); }
    finally { setCheckingOut(false); }
  }

  if (!workflow) return <main className="min-h-screen px-6 py-20"><div className="mx-auto max-w-2xl">Workflow not found.</div></main>;

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{workflow.title}</div>
          {suppressH1 ? <h2 className="mt-3 font-serif text-2xl md:text-3xl">Build and send your appeal</h2> : <h1 className="mt-3 font-serif text-4xl md:text-5xl">Understand it. Build it. Send it.</h1>}
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{workflow.description} Upload the source document and let the system do the hard work while you stay in control.</p>
          <div className="mt-6 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-2 flex justify-between text-[11px] uppercase tracking-widest text-muted-foreground"><span className={stage === "understand" ? "text-foreground" : ""}>Understand</span><span className={stage === "build" ? "text-foreground" : ""}>Build</span><span className={stage === "send" ? "text-foreground" : ""}>Send</span></div>
        </header>

        {error && <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}

        {stage === "understand" && <section id={suppressH1 ? "workflow-start" : undefined} className="rounded-2xl border border-rule bg-paper-deep p-8"><div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-rule bg-paper"><Upload size={24} /></div>
          <h2 className="mt-5 font-serif text-3xl">Start with your document</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">PDF, PNG, or JPG. We analyze the actual document—no retyping required.</p>
          <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background hover:opacity-90"><Upload size={16} /> Choose document<input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          {file && <div className="mt-5 flex items-center justify-center gap-2 text-sm"><FileText size={16} /><span>{file.name}</span></div>}
          <button disabled={!file || analyzing} onClick={analyze} className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={16} />{analyzing ? "Analyzing your document…" : "Analyze my document"}</button>
        </div></section>}

        {stage === "build" && analysis && <section className="rounded-2xl border border-rule bg-paper-deep p-8">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-paper"><Sparkles size={18} /></div><div><h2 className="font-serif text-2xl">Here's what we found</h2><p className="text-sm text-muted-foreground">Gemini analyzed the source document for this specific workflow.</p></div></div>
          <div className="mt-8 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-rule bg-paper p-5"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Decision</div><div className="mt-2 font-medium">{analysis.analysis.decision || "Needs review"}</div></div><div className="rounded-xl border border-rule bg-paper p-5"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Deadline</div><div className="mt-2 font-medium">{analysis.analysis.deadline || "Needs confirmation"}</div></div><div className="rounded-xl border border-rule bg-paper p-5"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</div><div className="mt-2 font-medium capitalize">{analysis.analysis.confidence || "Review required"}</div></div></div>
          <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">What matters</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{analysis.analysis.summary || "No summary returned."}</p></div>
          {analysis.analysis.reasons?.length ? <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">Reasons for the decision</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{analysis.analysis.reasons.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div> : null}
          {analysis.analysis.issues?.length ? <div className="mt-6 grid gap-3">{analysis.analysis.issues.map((issue, index) => <div key={`${issue.issue}-${index}`} className="rounded-xl border border-rule bg-paper p-5"><div className="font-medium">{issue.issue}</div><div className="mt-2 text-sm text-muted-foreground">{issue.whyItMatters}</div></div>)}</div> : null}
          <button disabled={building} onClick={build} className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm text-background disabled:opacity-40"><Sparkles size={16} />{building ? "Building your response…" : "Build my response"}<ArrowRight size={16} /></button>
        </section>}

        {stage === "send" && <section className="rounded-2xl border border-rule bg-paper-deep p-8">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-paper"><CheckCircle2 size={18} /></div><div><h2 className="font-serif text-2xl">Your response is ready for review</h2><p className="text-sm text-muted-foreground">Gemini drafted and independently checked the response. Nothing is mailed without your explicit approval.</p></div></div>
          <div className="mt-8 rounded-xl border border-rule bg-paper p-6"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Draft response</div><textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="mt-4 min-h-[320px] w-full resize-y rounded-lg border border-rule bg-paper-deep p-4 text-sm leading-7 outline-none" /></div>
          <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Independent validation</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{validation || "No validation result returned."}</p></div>
          {insuranceMode ? <>
            <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">Where should we send it?</h3><div className="mt-4 grid gap-3 md:grid-cols-2">
              {([["name","Recipient name"],["address1","Street address"],["address2","Apartment / suite (optional)"],["city","City"],["state","State"],["zip","ZIP code"]] as const).map(([key, label]) => <input key={key} value={recipient[key]} onChange={(e) => setRecipient((r) => ({ ...r, [key]: e.target.value }))} className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm" placeholder={label} />)}
            </div><select className="mt-4 rounded-lg border border-rule bg-paper px-4 py-3 text-sm" value={mailingMethod} onChange={(e) => setMailingMethod(e.target.value as typeof mailingMethod)}><option value="standard">Standard</option><option value="certified">Certified</option><option value="registered">Registered</option></select></div>
            {review && <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Readiness review</div><div className="mt-2 text-2xl font-semibold">{review.score}/100</div><p className="mt-2 text-sm text-muted-foreground">{review.issuesRequiringAttention} item(s) require attention.</p></div>}
            <div className="mt-6 flex flex-wrap gap-3"><button disabled={!recipientComplete || approving || approved} onClick={approve} className={`rounded-full border px-5 py-3 text-sm disabled:opacity-40 ${approved ? "bg-foreground text-background" : "border-foreground"}`}>{approved ? "Approved and ready" : approving ? "Checking readiness…" : "Approve & prepare to send"}</button><button disabled={!approved || checkingOut} onClick={checkout} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-40"><Send size={16} />{checkingOut ? "Opening payment…" : "Continue to payment"}</button></div>
          </> : <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><p className="text-sm text-muted-foreground">Mailing remains behind the workflow's server readiness and fulfillment controls. This workflow will receive the full payment/fulfillment path when it is individually upgraded.</p></div>}
        </section>}
      </div>
    </main>
  );
}
