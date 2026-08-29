import { useMemo, useState } from "react";
import { Upload, Sparkles, CheckCircle2, Send, FileText, AlertTriangle, ArrowRight } from "lucide-react";

type Stage = "understand" | "build" | "send";
type AnalysisPayload = {
  appealId?: string;
  extracted?: { summary?: string; decision?: string; deadline?: string; denialReasons?: string[]; facts?: Record<string, unknown>; evidenceMentions?: string[]; uncertainties?: string[] };
  analysis?: { analysisText?: string };
};
type Recipient = { name: string; address1: string; address2: string; city: string; state: string; zip: string };

async function getAccessToken(): Promise<string> {
  const { getSupabaseClient } = await import("@/platform/supabase");
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Authentication is not configured. Please sign in again after Supabase is configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Please sign in to use this workflow.");
  return data.session.access_token;
}

export function DeniedClaimWorkspace() {
  const [stage, setStage] = useState<Stage>("understand");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [approving, setApproving] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [draft, setDraft] = useState("");
  const [validation, setValidation] = useState("");
  const [approved, setApproved] = useState(false);
  const [review, setReview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<Recipient>({ name: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [mailingMethod, setMailingMethod] = useState<"standard" | "certified" | "registered">("certified");

  const progress = useMemo(() => ({ understand: 0, build: 50, send: 100 }[stage]), [stage]);

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const body = new FormData();
      body.append("document", file);
      body.append("workflowId", "denied-claim");
      const response = await fetch("/api/workflows/denied-claim/analyze", { method: "POST", body, credentials: "include", headers: { authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Analysis failed.");
      setAnalysis(payload);
      setStage("build");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function build() {
    if (!analysis?.appealId) return;
    setBuilding(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/workflows/denied-claim/draft", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ appealId: analysis.appealId, extracted: analysis.extracted, analysis: analysis.analysis }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Drafting failed.");
      setDraft(payload.draft || "");
      setValidation(payload.validation || "");
      setStage("send");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drafting failed.");
    } finally {
      setBuilding(false);
    }
  }

  async function approveAndPrepareSend() {
    if (!analysis?.appealId) return;
    setApproving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/workflows/denied-claim/approve", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ appealId: analysis.appealId, recipient, mailingMethod }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (payload?.review) setReview(payload.review);
        throw new Error(payload?.error || "Approval failed.");
      }
      setReview(payload.review);
      setApproved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setApproving(false);
    }
  }

  async function checkout() {
    if (!analysis?.appealId || !approved) return;
    setCheckingOut(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/workflows/denied-claim/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ appealId: analysis.appealId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "Checkout could not be created.");
      window.location.assign(payload.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  }

  const recipientComplete = recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip;

  return (
    <main className="min-h-screen bg-paper px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Denied claim</div>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">Understand your denial. Build your response. Send it.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Upload the denial and supporting documents. The system handles the hard work in the background and keeps you in control before anything is mailed.</p>
          <div className="mt-6 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-2 flex justify-between text-[11px] uppercase tracking-widest text-muted-foreground"><span className={stage === "understand" ? "text-foreground" : ""}>Understand</span><span className={stage === "build" ? "text-foreground" : ""}>Build</span><span className={stage === "send" ? "text-foreground" : ""}>Send</span></div>
        </header>

        {error && <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}

        {stage === "understand" && (
          <section className="rounded-2xl border border-rule bg-paper-deep p-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-rule bg-paper"><Upload size={24} /></div>
              <h2 className="mt-5 font-serif text-3xl">Start with your denial</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Upload a PDF, PNG, or JPG. The document goes directly to the server-side AI workflow—no retyping required.</p>
              <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background hover:opacity-90">
                <Upload size={16} /> Choose document
                <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              {file && <div className="mt-5 flex items-center justify-center gap-2 text-sm"><FileText size={16} /><span>{file.name}</span></div>}
              <button disabled={!file || analyzing} onClick={analyze} className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={16} />{analyzing ? "Analyzing your documents…" : "Analyze my denial"}</button>
            </div>
          </section>
        )}

        {stage === "build" && analysis && (
          <section className="rounded-2xl border border-rule bg-paper-deep p-8">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-paper"><Sparkles size={18} /></div><div><h2 className="font-serif text-2xl">Here's what we found</h2><p className="text-sm text-muted-foreground">The document analysis is complete.</p></div></div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-rule bg-paper p-5"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Decision</div><div className="mt-2 font-medium">{analysis.extracted?.decision || "Needs review"}</div></div>
              <div className="rounded-xl border border-rule bg-paper p-5"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Deadline</div><div className="mt-2 font-medium">{analysis.extracted?.deadline || "Needs confirmation"}</div></div>
              <div className="rounded-xl border border-rule bg-paper p-5"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Evidence mentions</div><div className="mt-2 font-medium">{analysis.extracted?.evidenceMentions?.length ?? 0}</div></div>
            </div>
            <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">What the analysis says</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{analysis.analysis?.analysisText || analysis.extracted?.summary || "No summary returned."}</p></div>
            {analysis.extracted?.denialReasons?.length ? <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">Reasons for denial</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{analysis.extracted.denialReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div> : null}
            <button disabled={building || !analysis.appealId} onClick={build} className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm text-background disabled:opacity-40"><Sparkles size={16} />{building ? "Building your appeal…" : "Build my appeal"}<ArrowRight size={16} /></button>
          </section>
        )}

        {stage === "send" && (
          <section className="rounded-2xl border border-rule bg-paper-deep p-8">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-paper"><CheckCircle2 size={18} /></div><div><h2 className="font-serif text-2xl">Your appeal is ready for review</h2><p className="text-sm text-muted-foreground">The response was drafted and checked by Gemini. Nothing is mailed without your explicit approval.</p></div></div>
            <div className="mt-8 rounded-xl border border-rule bg-paper p-6"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Draft response</div><p className="mt-4 whitespace-pre-wrap text-sm leading-7">{draft || "No draft returned."}</p></div>
            <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Validation</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{validation || "No validation result returned."}</p></div>

            <div className="mt-6 rounded-xl border border-rule bg-paper p-6">
              <h3 className="font-serif text-xl">Where should we send it?</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm" placeholder="Recipient name" value={recipient.name} onChange={(e) => setRecipient((r) => ({ ...r, name: e.target.value }))} />
                <input className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm" placeholder="Street address" value={recipient.address1} onChange={(e) => setRecipient((r) => ({ ...r, address1: e.target.value }))} />
                <input className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm" placeholder="Apartment / suite (optional)" value={recipient.address2} onChange={(e) => setRecipient((r) => ({ ...r, address2: e.target.value }))} />
                <input className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm" placeholder="City" value={recipient.city} onChange={(e) => setRecipient((r) => ({ ...r, city: e.target.value }))} />
                <input className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm" placeholder="State" value={recipient.state} onChange={(e) => setRecipient((r) => ({ ...r, state: e.target.value }))} />
                <input className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm" placeholder="ZIP code" value={recipient.zip} onChange={(e) => setRecipient((r) => ({ ...r, zip: e.target.value }))} />
              </div>
              <select className="mt-4 rounded-lg border border-rule bg-paper px-4 py-3 text-sm" value={mailingMethod} onChange={(e) => setMailingMethod(e.target.value as typeof mailingMethod)}>
                <option value="standard">Standard</option>
                <option value="certified">Certified</option>
                <option value="registered">Registered</option>
              </select>
            </div>

            {review && <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Readiness review</div><div className="mt-2 text-2xl font-semibold">{review.score}/100</div><p className="mt-2 text-sm text-muted-foreground">{review.issuesRequiringAttention} item(s) require attention.</p></div>}

            <div className="mt-6 flex flex-wrap gap-3"><button disabled={!recipientComplete || approving || approved} onClick={approveAndPrepareSend} className={`rounded-full border px-5 py-3 text-sm disabled:opacity-40 ${approved ? "bg-foreground text-background" : "border-foreground"}`}>{approved ? "Approved and ready" : approving ? "Checking readiness…" : "Approve & prepare to send"}</button><button disabled={!approved || checkingOut} onClick={checkout} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-40"><Send size={16} />{checkingOut ? "Opening payment…" : "Continue to payment"}</button></div>
          </section>
        )}
      </div>
    </main>
  );
}
