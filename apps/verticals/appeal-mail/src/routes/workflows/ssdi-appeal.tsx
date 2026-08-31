import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getWorkflowHeroImage } from "@/domain/workflow-hero-images";

export const Route = createFileRoute("/workflows/ssdi-appeal")({
  head: () => ({ meta: [
    { title: "Appeal an SSDI Decision — Authority-First | Appeal Mail" },
    { name: "description", content: "Analyze an SSDI decision, verify the applicable appeal path and deadline, map evidence gaps, and prepare a human-reviewed response with transparent pricing." },
    { property: "og:title", content: "Appeal an SSDI Decision" },
    { property: "og:description", content: "Authority-first SSDI appeal analysis with evidence mapping, deadline discipline, Gemini drafting, and documented mailing proof." },
  ], links: [{ rel: "canonical", href: "/workflows/ssdi-appeal" }] }),
  component: SsdIPage,
});

function SsdIPage() {
  const [file, setFile] = useState<File | null>(null); const [status, setStatus] = useState(""); const [result, setResult] = useState<any>(null);
  async function analyze() {
    if (!file) return;
    setStatus("Analyzing the SSDI decision and separating source facts from unresolved procedural questions…");
    const form = new FormData(); form.set("document", file);
    try { const response = await fetch("/api/workflows/ssdi-appeal/analyze", { method: "POST", body: form }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Unable to analyze the decision."); setResult(payload); setStatus("Analysis complete. Review the decision, authority status, evidence gaps, and price estimate."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Unable to analyze the decision."); }
  }
  return <main className="mx-auto max-w-6xl px-6 py-12">
    <section className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-8 hero-light shadow-xl"><p className="text-sm font-semibold uppercase tracking-[0.22em] hero-muted">Authority-first disability appeal</p><h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">Appeal an SSDI Decision</h1><p className="mt-6 max-w-3xl text-lg leading-8 hero-muted">Understand what Social Security decided, what the decision actually supports, what evidence is missing, what procedural steps must be verified, and what your final response will cost before you pay.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{[["Source-grounded","The workflow does not invent medical facts, deadlines, appeal levels, or filing instructions."],["Evidence-aware","Supporting records, gaps, contradictions, and disputed findings are surfaced before drafting."],["Transparent price","Preparation, response pages, supporting pages, and mailing service are shown before checkout."]].map(([title,copy])=><div key={title} className="rounded-2xl border hero-border hero-bg-glass p-5"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 hero-muted">{copy}</p></div>)}</div></section>
    <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-7"><h2 className="text-2xl font-semibold">What the workflow does</h2><ol className="mt-6 space-y-4">{["Extract decision findings, dates, references, instructions, and cited authority.","Verify the apparent appeal path and deadline from the decision and current authoritative sources.","Map medical/functional evidence references without inventing facts and flag missing support.","Stress-test the response and validate dates, claims, references, and requested relief.","Require your explicit approval before price calculation, payment, and mailing."].map((x,i)=><li key={x} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold hero-light">{i+1}</span><span className="leading-7 text-slate-700">{x}</span></li>)}</ol></div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7"><h2 className="text-2xl font-semibold">Start with your decision</h2><p className="mt-3 text-sm leading-6 hero-divider">Starting price: <strong>$69.99</strong> for an 8-page response, no extra evidence sheets, and standard mailing. Exact price is calculated from the final approved packet.</p><input className="mt-6 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e)=>setFile(e.target.files?.[0]||null)}/><button className="mt-4 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold hero-light disabled:opacity-40" disabled={!file} onClick={analyze}>Analyze SSDI decision</button>{status&&<p className="mt-4 text-sm hero-divider">{status}</p>}{result&&<div className="mt-6 rounded-2xl bg-white p-5"><h3 className="font-semibold">Decision snapshot</h3><dl className="mt-3 space-y-2 text-sm"><div><dt className="inline font-medium">Issuer: </dt><dd className="inline">{result.analysis?.issuer||"Not identified"}</dd></div><div><dt className="inline font-medium">Decision date: </dt><dd className="inline">{result.analysis?.decisionDate||"Not identified"}</dd></div><div><dt className="inline font-medium">Deadline status: </dt><dd className="inline">{result.analysis?.deadlineStatus||"unverified"}</dd></div><div><dt className="inline font-medium">Price basis: </dt><dd className="inline">4 response pages included; evidence pages priced separately</dd></div></dl></div>}</div>
    </section>
    <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-7"><h2 className="text-2xl font-semibold">Transparent pricing</h2><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[["Preparation","$69.99"],["Included response","8 pages"],["Standard mail","$4.99"],["Certified","$14.94"],["Registered","$32.49"]].map(([a,b])=><div key={a} className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-500">{a}</div><div className="mt-1 font-semibold">{b}</div></div>)}</div><p className="mt-6 text-sm leading-7 hero-divider">The final price is calculated from the approved packet. All pages are included in the preparation fee.</p></section>
    <p className="mt-10 text-sm text-slate-500">Appeal Mail is not a law firm and does not provide legal advice. Medical and procedural facts must come from your records or verified authoritative sources.</p>
  </main>;
}
