import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdministrativeDecisionPricing } from "@/components/workflow/administrative-decision-pricing";
import { getWorkflowHeroImage } from "@/domain/workflow-hero-images";

export const Route = createFileRoute("/workflows/administrative-decision")({
  head: () => ({ meta: [
    { title: "Appeal an Administrative Decision — Authority-First | Appeal Mail" },
    { name: "description", content: "Analyze an administrative decision, verify the applicable procedure and deadline from authoritative sources, identify evidence gaps, prepare a human-reviewed response, and see transparent packet pricing." },
    { property: "og:title", content: "Appeal an Administrative Decision" },
    { property: "og:description", content: "Authority-first administrative decision analysis with deadline verification, evidence mapping, adversarial validation, transparent pricing, and documented mailing proof." },
  ], links: [{ rel: "canonical", href: "/workflows/administrative-decision" }] }),
  component: AdministrativeDecisionPage,
});

function AdministrativeDecisionPage() {
  const [file, setFile] = useState<File | null>(null); const [status, setStatus] = useState(""); const [result, setResult] = useState<any>(null);
  async function analyze() {
    if (!file) return; setStatus("Analyzing the decision and separating document facts from authority-backed procedure…");
    const form = new FormData(); form.set("document", file);
    try { const response = await fetch("/api/workflows/administrative-decision/analyze", { method: "POST", body: form }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Unable to analyze the decision."); setResult(payload); setStatus("Analysis complete. Review verified and unresolved items before drafting."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Unable to analyze the decision."); }
  }
  return <main className="mx-auto max-w-6xl px-6 py-12">
    <section className="relative isolate overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-8 hero-light shadow-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] hero-muted">Authority-first administrative review</p>
      <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">Appeal an Administrative Decision</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 hero-muted">Analyze what the decision actually says, identify the agency and jurisdiction, verify the applicable appeal path from authoritative sources, expose evidence gaps and contradictions, and build a response that you approve before it is mailed. No generic deadline or filing rule is treated as universal.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">{[["Authority raised","Procedural claims are separated from document facts and tied to official agency, court, statute, regulation, or rule sources."],["Deadline discipline","A date appearing in a decision is not promoted to a filing deadline unless supported by the governing authority."],["Proof-backed fulfillment","The final approved PDF flows through MailMyPDF and retains provider status and tracking/proof."]].map(([title,copy]) => <div key={title} className="rounded-2xl border hero-border hero-bg-glass p-5"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 hero-muted">{copy}</p></div>)}</div>
    </section>
    <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><h2 className="text-2xl font-semibold">The Gold pipeline</h2><ol className="mt-6 space-y-4 text-slate-700">{["Classify the administrative decision and extract agency findings, dates, references, instructions, and cited authority.","Verify the apparent appeal path, filing destination, deadline, hearing/stay rules, and exhaustion requirements from authoritative sources—or surface them as unresolved.","Map evidence, contradictions, disputed facts, and timeline issues before drafting.","Draft from supported facts and authority, then run independent validation and adversarial stress testing.","Require explicit human approval before payment and final-response mailing."].map((x,i)=><li key={x} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold hero-light">{i+1}</span><span>{x}</span></li>)}</ol></div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7"><h2 className="text-2xl font-semibold">Start with the decision</h2><p className="mt-3 text-sm leading-6 hero-divider">Upload the actual notice or decision. Missing agency or jurisdiction information is surfaced rather than guessed.</p><input className="mt-6 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e)=>setFile(e.target.files?.[0]||null)}/><button className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold hero-light disabled:opacity-40" disabled={!file} onClick={analyze}>Analyze administrative decision</button>{status&&<p className="mt-4 text-sm hero-divider">{status}</p>}{result&&<div className="mt-6 rounded-2xl bg-white p-5"><h3 className="font-semibold">Authority snapshot</h3><dl className="mt-3 space-y-2 text-sm"><div><dt className="inline font-medium">Agency: </dt><dd className="inline">{result.analysis?.issuer||"Not identified"}</dd></div><div><dt className="inline font-medium">Jurisdiction: </dt><dd className="inline">{result.analysis?.jurisdiction||"Not identified"}</dd></div><div><dt className="inline font-medium">Decision date: </dt><dd className="inline">{result.analysis?.decisionDate||"Not identified"}</dd></div><div><dt className="inline font-medium">Deadline status: </dt><dd className="inline">{result.analysis?.deadlineStatus||"unverified"}</dd></div></dl></div>}</div>
    </section>
    <div className="mt-10"><AdministrativeDecisionPricing /></div>
    <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-7"><h2 className="text-2xl font-semibold">What we refuse to guess</h2><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{["Deadline","Appeal level","Recipient","Filing portal","Hearing right","Stay rule","Exhaustion","Judicial-review path"].map(item=><div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm font-medium">{item}</div>)}</div><p className="mt-6 text-sm leading-7 hero-divider">Administrative procedures vary by agency and jurisdiction. Official federal guidance itself shows that distinct administrative regimes can prescribe materially different appeal periods and filing methods.</p></section>
    <footer className="mt-10 flex flex-wrap gap-4 text-sm hero-divider"><Link to="/workflows/agency-decision" className="underline">Agency decision workflow</Link><span>•</span><span>Appeal Mail is not a law firm and does not provide legal advice.</span></footer>
  </main>;
}
