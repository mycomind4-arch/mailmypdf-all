import { createFileRoute } from "@tanstack/react-router";
import { AppealWorkflowWorkspace } from "@/components/workflow/appeal-workflow-workspace";
import { InsuranceClaimDenialPricing } from "@/components/workflow/insurance-claim-denial-pricing";
import { getWorkflow } from "@/domain/workflows";
import { getWorkflowHeroImage } from "@/domain/workflow-hero-images";

export const Route = createFileRoute("/workflows/denied-claim")({
  head: () => ({ meta: [
    { title: "Appeal an Insurance Claim Denial — Authority-First | Appeal Mail" },
    { name: "description", content: "Analyze an insurance claim denial against the actual notice, policy terms, current authoritative guidance, and evidence. Gemini drafts and independently validates the response before human approval and proof-backed mailing." },
    { property: "og:title", content: "Appeal an Insurance Claim Denial" },
    { property: "og:description", content: "Authority-first insurance claim denial appeal with source-grounded analysis, Gemini drafting, independent validation, transparent packet pricing, and proof-backed mailing." },
    { name: "twitter:card", content: "summary" },
  ], links: [{ rel: "canonical", href: "/workflows/denied-claim" }] }),
  component: () => <><section className="mx-auto max-w-6xl px-6 pt-12"><div className="relative isolate overflow-hidden rounded-3xl bg-slate-950 p-8 hero-light shadow-xl"><div className="absolute inset-0 -z-10" style={{backgroundImage:`url(${getWorkflowHeroImage("denied-claim")})`,backgroundSize:"cover",backgroundPosition:"center",opacity:0.3}}/><div className="absolute inset-0 -z-10" style={{background:"linear-gradient(135deg,rgba(26,29,41,0.5) 0%,rgba(26,29,41,0.3) 100%)"}}/><p className="text-sm font-semibold uppercase tracking-[0.22em] hero-muted">Authority-first insurance appeal</p><h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">Appeal an Insurance Claim Denial</h1><p className="mt-6 max-w-3xl text-lg leading-8 hero-muted">We analyze the actual denial, distinguish the insurer's stated reasons from disputed facts, map evidence and gaps, verify the applicable review path, and prepare a response you approve before it is mailed.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{[["Notice-grounded","The denial notice, supplied policy material, and current authoritative sources control procedural conclusions."],["Evidence-aware","Claim facts, policy references, contradictions, missing records, and requested relief remain traceable to the record."],["Independently challenged","Gemini drafts; a separate validation pass challenges unsupported claims, deadline assumptions, and missing evidence."]].map(([t,c])=><div key={t} className="rounded-2xl border hero-border hero-bg-glass p-5"><h2 className="font-semibold">{t}</h2><p className="mt-2 text-sm leading-6 hero-muted">{c}</p></div>)}</div></div></section><InsuranceClaimDenialPricing/><AppealWorkflowWorkspace workflowId="denied-claim" /></>,
});
