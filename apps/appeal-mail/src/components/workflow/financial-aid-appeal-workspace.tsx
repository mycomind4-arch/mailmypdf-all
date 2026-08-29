import { useState } from "react";
import { Upload, Sparkles, Send, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getSupabaseClient } from "@/platform/supabase";

export function FinancialAidAppealWorkspace() {
  const [stage, setStage] = useState<"understand" | "build" | "send">("understand");
  const [file, setFile] = useState<File | null>(null);
  const [appealId, setAppealId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [draft, setDraft] = useState("");
  const [validation, setValidation] = useState("");
  const [recipient, setRecipient] = useState({ name: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [mailingMethod, setMailingMethod] = useState<"standard" | "certified" | "registered">("certified");
  const [review, setReview] = useState<any>(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function token() {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error("Authentication is not configured.");
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) throw new Error("Please sign in to continue.");
    return data.session.access_token;
  }

  async function analyze() {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const accessToken = await token();
      const form = new FormData(); form.append("document", file);
      const res = await fetch("/api/workflows/financial-aid-appeal/analyze", { method: "POST", body: form, headers: { authorization: `Bearer ${accessToken}` }, credentials: "include" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Analysis failed.");
      setAppealId(body.appealId); setAnalysis(body.analysis); setStage("build");
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed."); }
    finally { setBusy(false); }
  }

  async function build() {
    if (!appealId) return;
    setBusy(true); setError(null);
    try {
      const accessToken = await token();
      const res = await fetch("/api/workflows/financial-aid-appeal/draft", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, credentials: "include", body: JSON.stringify({ appealId, analysis }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Drafting failed.");
      setDraft(body.draft || ""); setValidation(body.validation || ""); setStage("send");
    } catch (e) { setError(e instanceof Error ? e.message : "Drafting failed."); }
    finally { setBusy(false); }
  }

  async function approve() {
    if (!appealId || !recipient.name || !recipient.address1 || !recipient.city || !recipient.state || !recipient.zip) return;
    setBusy(true); setError(null);
    try {
      const accessToken = await token();
      const res = await fetch("/api/workflows/financial-aid-appeal/approve", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, credentials: "include", body: JSON.stringify({ appealId, recipient, mailingMethod }) });
      const body = await res.json();
      if (!res.ok) { if (body.review) setReview(body.review); throw new Error(body.error || "Approval failed."); }
      setReview(body.review); setApproved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Approval failed."); }
    finally { setBusy(false); }
  }

  async function checkout() {
    if (!appealId || !approved) return;
    setBusy(true); setError(null);
    try {
      const accessToken = await token();
      const res = await fetch("/api/workflows/financial-aid-appeal/checkout", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, credentials: "include", body: JSON.stringify({ appealId }) });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error(body.error || "Checkout failed.");
      window.location.assign(body.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout failed."); }
    finally { setBusy(false); }
  }

  const complete = recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip;
  return <main className="min-h-screen bg-paper px-6 py-10"><div className="mx-auto max-w-5xl">
    <header className="mb-10"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Financial Aid Appeal</div><h1 className="mt-3 font-serif text-4xl md:text-5xl">Understand it. Build it. Send it.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Upload your financial-aid decision. We’ll identify the decision, relevant circumstances, evidence, and next-step response.</p></header>
    {error && <div className="mb-6 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={16}/>{error}</div>}
    {stage === "understand" && <section className="rounded-2xl border border-rule bg-paper-deep p-8 text-center"><Upload className="mx-auto" size={28}/><h2 className="mt-4 font-serif text-3xl">Start with your decision</h2><p className="mt-3 text-sm text-muted-foreground">Upload the financial-aid decision or notice as PDF, PNG, or JPG.</p><label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background"><Upload size={16}/> Choose document<input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)}/></label>{file && <div className="mt-4 flex justify-center gap-2 text-sm"><FileText size={16}/>{file.name}</div>}<button disabled={!file || busy} onClick={analyze} className="mt-6 rounded-full border border-foreground px-5 py-3 text-sm disabled:opacity-40">{busy ? "Analyzing…" : "Analyze my decision"}</button></section>}
    {stage === "build" && analysis && <section className="rounded-2xl border border-rule bg-paper-deep p-8"><div className="flex items-center gap-3"><Sparkles/><div><h2 className="font-serif text-2xl">Here’s what we found</h2><p className="text-sm text-muted-foreground">Gemini analyzed the document for financial-aid appeal issues.</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-rule bg-paper p-5"><small>Decision</small><div className="mt-2 font-medium">{analysis.decision || "Needs review"}</div></div><div className="rounded-xl border border-rule bg-paper p-5"><small>Deadline</small><div className="mt-2 font-medium">{analysis.deadline || "Needs confirmation"}</div></div><div className="rounded-xl border border-rule bg-paper p-5"><small>Confidence</small><div className="mt-2 font-medium capitalize">{analysis.confidence || "Review required"}</div></div></div><div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">What matters</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{analysis.summary || "No summary returned."}</p></div>{analysis.reasons?.length ? <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">Reasons</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{analysis.reasons.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div> : null}<button disabled={busy} onClick={build} className="mt-8 rounded-full bg-foreground px-6 py-3 text-sm text-background">{busy ? "Building your appeal…" : "Build my appeal"}</button></section>}
    {stage === "send" && <section className="rounded-2xl border border-rule bg-paper-deep p-8"><div className="flex items-center gap-3"><CheckCircle2/><div><h2 className="font-serif text-2xl">Your appeal is ready for review</h2><p className="text-sm text-muted-foreground">Review the draft. Nothing is mailed without your approval.</p></div></div><div className="mt-6 rounded-xl border border-rule bg-paper p-6"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[320px] w-full rounded-lg border border-rule bg-paper-deep p-4 text-sm leading-7"/></div><div className="mt-6 rounded-xl border border-rule bg-paper p-6"><small>Independent validation</small><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{validation}</p></div><div className="mt-6 rounded-xl border border-rule bg-paper p-6"><h3 className="font-serif text-xl">Where should we send it?</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{([['name','Recipient name'],['address1','Street address'],['address2','Apartment / suite'],['city','City'],['state','State'],['zip','ZIP code']] as const).map(([key,label]) => <input key={key} value={recipient[key]} onChange={(e) => setRecipient(r => ({...r,[key]:e.target.value}))} className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm" placeholder={label}/>)}</div><select value={mailingMethod} onChange={(e) => setMailingMethod(e.target.value as typeof mailingMethod)} className="mt-4 rounded-lg border border-rule bg-paper px-4 py-3 text-sm"><option value="standard">Standard</option><option value="certified">Certified</option><option value="registered">Registered</option></select></div>{review && <div className="mt-6 rounded-xl border border-rule bg-paper p-6"><small>Readiness</small><div className="mt-2 text-2xl font-semibold">{review.score}/100</div><p className="mt-2 text-sm text-muted-foreground">{review.issuesRequiringAttention} issue(s) need attention.</p></div>}<div className="mt-6 flex flex-wrap gap-3"><button disabled={!complete || busy || approved} onClick={approve} className={`rounded-full border px-5 py-3 text-sm disabled:opacity-40 ${approved ? "bg-foreground text-background" : "border-foreground"}`}>{approved ? "Approved and ready" : busy ? "Checking readiness…" : "Approve & prepare to send"}</button><button disabled={!approved || busy} onClick={checkout} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-40"><Send size={16}/>{busy ? "Opening payment…" : "Continue to payment"}</button></div></section>}
  </div></main>;
}
