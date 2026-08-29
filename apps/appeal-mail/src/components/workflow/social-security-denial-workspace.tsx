import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, Send, Sparkles, Upload } from "lucide-react";

type Stage = "understand" | "build" | "send";
type Recipient = { name: string; address1: string; address2: string; city: string; state: string; zip: string };
type Result = { appealId: string; workflow: { title: string; primaryKeyword?: string }; analysis: any; document?: { id?: string; filename?: string } };

async function getToken() {
  const { getSupabaseClient } = await import("@/platform/supabase");
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Authentication is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Please sign in to use this workflow.");
  return data.session.access_token;
}

export function SocialSecurityDenialWorkspace() {
  const [stage, setStage] = useState<Stage>("understand");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [draft, setDraft] = useState("");
  const [validation, setValidation] = useState("");
  const [recipient, setRecipient] = useState<Recipient>({ name: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [mailingMethod, setMailingMethod] = useState<"standard" | "certified" | "registered">("certified");
  const [review, setReview] = useState<any>(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const complete = Boolean(recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip);

  async function analyze() {
    if (!file) return;
    setBusy("analyze"); setError(null);
    try {
      const token = await getToken(); const body = new FormData(); body.append("document", file);
      const response = await fetch("/api/workflows/social-security-denial/analyze", { method: "POST", body, credentials: "include", headers: { authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || "Analysis failed.");
      setResult(payload); setStage("build");
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed."); } finally { setBusy(null); }
  }
  async function build() {
    if (!result) return;
    setBusy("draft"); setError(null);
    try {
      const token = await getToken();
      const response = await fetch("/api/workflows/social-security-denial/draft", { method: "POST", credentials: "include", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ appealId: result.appealId, analysis: result.analysis }) });
      const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error || "Drafting failed.");
      setDraft(payload.draft || ""); setValidation(payload.validation || ""); setStage("send");
    } catch (e) { setError(e instanceof Error ? e.message : "Drafting failed."); } finally { setBusy(null); }
  }
  async function approve() {
    if (!result || !complete) return;
    setBusy("approve"); setError(null);
    try {
      const token = await getToken();
      const response = await fetch("/api/workflows/social-security-denial/approve", { method: "POST", credentials: "include", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ appealId: result.appealId, recipient, mailingMethod }) });
      const payload = await response.json().catch(() => null); if (!response.ok) { if (payload?.review) setReview(payload.review); throw new Error(payload?.error || "Approval failed."); }
      setReview(payload.review); setApproved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Approval failed."); } finally { setBusy(null); }
  }
  async function checkout() {
    if (!result || !approved) return;
    setBusy("checkout"); setError(null);
    try {
      const token = await getToken();
      const response = await fetch("/api/workflows/social-security-denial/checkout", { method: "POST", credentials: "include", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ appealId: result.appealId }) });
      const payload = await response.json().catch(() => null); if (!response.ok || !payload?.url) throw new Error(payload?.error || "Checkout could not be created.");
      window.location.assign(payload.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout failed."); } finally { setBusy(null); }
  }

  return <main className="min-h-screen bg-paper px-6 py-10"><div className="mx-auto max-w-5xl">
    <header className="mb-10"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Social Security denial</div><h1 className="mt-3 font-serif text-4xl md:text-5xl">Understand your decision. Build your response. Send it.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Upload the Social Security decision. Gemini analyzes the actual document, builds a response, and keeps you in control before anything is mailed.</p><div className="mt-6 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-foreground transition-all" style={{ width: stage === "understand" ? "0%" : stage === "build" ? "50%" : "100%" }} /></div><div className="mt-2 flex justify-between text-[11px] uppercase tracking-widest text-muted-foreground"><span>Understand</span><span>Build</span><span>Send</span></div></header>
    {error && <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={16} />{error}</div>}
    {stage === "understand" && <section className="rounded-2xl border border-rule bg-paper-deep p-8"><div className="mx-auto max-w-2xl text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-rule bg-paper"><Upload size={24} /></div><h2 className="mt-5 font-serif text-3xl">Start with your Social Security decision</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">PDF, PNG, or JPG. No retyping required.</p><label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background"><Upload size={16} /> Choose document<input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>{file && <div className="mt-5 flex items-center justify-center gap-2 text-sm"><FileText size={16} />{file.name}</div>}<button disabled={!file || !!busy} onClick={analyze} className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground px-5 py-3 text-sm disabled:opacity-40"><Sparkles size={16} />{busy === "analyze" ? "Analyzing your decision…" : "Analyze my decision"}</button></div></section>}
    {stage === "build" && result && <section className="rounded-2xl border border-rule bg-paper-deep p-8"><div className="flex items-center gap-3"><Sparkles size={18} /><div><h2 className="font-serif text-2xl">Here's what we found</h2><p className="text-sm text-muted-foreground">Gemini analyzed the Social Security decision.</p></div></div><div className="mt-8 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-rule bg-paper p-5"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Decision</div><div className="mt-2 font-medium">{result.analysis.decision || "Needs review"}</div></div><div className="rounded-xl border border-rule bg-paper p-5"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Deadline</div><div className="mt-2 font-medium">{result.analysis.deadline || "Needs confirmation"}</div></div><div className="rounded-xl border border-rule bg-paper p-5"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</div><div className="mt-2 font-medium capitalize">{result.analysis.confidence || "Review required"}</div></div></div><div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">What matters</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{result.analysis.summary || "No summary returned."}</p></div>{result.analysis.reasons?.length ? <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">Reasons for the decision</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{result.analysis.reasons.map((item: string, i: number) => <li key={`${item}-${i}`}>{item}</li>)}</ul></div> : null}{result.analysis.issues?.length ? <div className="mt-6 grid gap-3">{result.analysis.issues.map((issue: any, i: number) => <div key={`${issue.issue}-${i}`} className="rounded-xl border border-rule bg-paper p-5"><div className="font-medium">{issue.issue}</div><div className="mt-2 text-sm text-muted-foreground">{issue.whyItMatters}</div></div>)}</div> : null}<button disabled={!!busy} onClick={build} className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm text-background disabled:opacity-40"><Sparkles size={16} />{busy === "draft" ? "Building your response…" : "Build my response"}<ArrowRight size={16} /></button></section>}
    {stage === "send" && result && <section className="rounded-2xl border border-rule bg-paper-deep p-8"><div className="flex items-center gap-3"><CheckCircle2 size={18} /><div><h2 className="font-serif text-2xl">Your response is ready for review</h2><p className="text-sm text-muted-foreground">Gemini drafted and checked the response. Nothing is mailed without your explicit approval.</p></div></div><div className="mt-8 rounded-xl border border-rule bg-paper p-6"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Draft response</div><textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="mt-4 min-h-[320px] w-full rounded-lg border border-rule bg-paper-deep p-4 text-sm leading-7" /></div><div className="mt-6 rounded-xl border border-rule bg-paper p-6"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Independent validation</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{validation}</p></div><div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">Where should we send it?</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{([["name","Recipient name"],["address1","Street address"],["address2","Apartment / suite (optional)"],["city","City"],["state","State"],["zip","ZIP code"]] as const).map(([key, label]) => <input key={key} value={recipient[key]} onChange={(e) => setRecipient((r) => ({ ...r, [key]: e.target.value }))} className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm" placeholder={label} />)}</div><select className="mt-4 rounded-lg border border-rule bg-paper px-4 py-3 text-sm" value={mailingMethod} onChange={(e) => setMailingMethod(e.target.value as typeof mailingMethod)}><option value="standard">Standard</option><option value="certified">Certified</option><option value="registered">Registered</option></select></div>{review && <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Readiness review</div><div className="mt-2 text-2xl font-semibold">{review.score}/100</div><p className="mt-2 text-sm text-muted-foreground">{review.issuesRequiringAttention} item(s) require attention.</p></div>}<div className="mt-6 flex flex-wrap gap-3"><button disabled={!complete || !!busy || approved} onClick={approve} className="rounded-full border border-foreground px-5 py-3 text-sm disabled:opacity-40">{approved ? "Approved and ready" : busy === "approve" ? "Checking readiness…" : "Approve & prepare to send"}</button><button disabled={!approved || !!busy} onClick={checkout} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-40"><Send size={16} />{busy === "checkout" ? "Opening payment…" : "Continue to payment"}</button></div></section>}
  </div></main>;
}
