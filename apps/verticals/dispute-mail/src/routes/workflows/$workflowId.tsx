import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getWorkflowProfile } from "@/domain/workflow-profiles";
import { workflows, type WorkflowId } from "@/domain/workflows";

const PLACEHOLDER_IMAGE = "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/06e033fed_generated_image.png";

export const Route = createFileRoute("/workflows/$workflowId")({
  head: ({ params }) => {
    if (!isWorkflowId(params.workflowId)) return {};
    const workflow = workflows[params.workflowId];
    const profile = getWorkflowProfile(params.workflowId);
    return { meta: [
      { title: `${workflow.title} | Dispute Mail` },
      { name: "description", content: `${workflow.description} Learn what to gather, what to review, and how Dispute Mail helps prepare the correspondence.` },
      { name: "keywords", content: [profile.primaryKeyword, ...profile.supportingKeywords].join(", ") },
      { name: "robots", content: "index,follow" },
    ], links: [{ rel: "canonical", href: `/workflows/${params.workflowId}` }] };
  },
  component: ProblemWorkflowPage,
});

function isWorkflowId(value: string): value is WorkflowId { return value in workflows; }

function ProblemWorkflowPage() {
  const { workflowId } = Route.useParams();
  if (!isWorkflowId(workflowId)) throw notFound();
  const workflow = workflows[workflowId];
  const profile = getWorkflowProfile(workflowId);

  return <main className="min-h-screen bg-cream">
    <SiteHeader />
    <section className="border-b border-warm-border bg-teal-50 py-12 md:py-16"><div className="container max-w-6xl"><Link to="/workflows" className="text-sm text-slate-500 hover:text-teal-700">← All dispute workflows</Link><div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center"><div><div className="eyebrow">{profile.primaryKeyword}</div><h1 className="mt-3 max-w-4xl font-serif text-4xl font-bold leading-tight text-teal-700 md:text-6xl">{workflow.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-500">{workflow.description}</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/workflows/$workflowId/start" params={{ workflowId }} className="btn-rose">Start this workflow <ArrowRight size={18} /></Link><Link to="/workflows" className="btn-outline">Browse workflows</Link></div></div><div className="overflow-hidden rounded-2xl border border-warm-border bg-white shadow-lg"><div className="relative aspect-[16/9]"><img src={PLACEHOLDER_IMAGE} alt="" aria-hidden="true" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" /><div className="absolute bottom-4 left-4 rounded-full bg-slate-900/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white backdrop-blur-sm">Workflow image placeholder</div></div><div className="p-5"><div className="eyebrow">Simple on the surface</div><p className="mt-2 text-sm leading-6 text-slate-500">AI handles the research, organization, and drafting underneath. You review the result before anything is sent.</p></div></div></div></div></section>
    <section className="container grid gap-8 py-12 lg:grid-cols-[1fr_360px] md:py-16"><div className="space-y-6"><div className="card p-7"><div className="flex items-start gap-4"><FileText className="mt-1 text-teal-700" size={24} /><div><h2 className="font-serif text-2xl text-teal-700">What this workflow solves</h2><p className="mt-2 leading-7 text-slate-500">{profile.problem}</p></div></div></div><div className="card p-7"><div className="flex items-start gap-4"><ShieldCheck className="mt-1 text-teal-700" size={24} /><div><h2 className="font-serif text-2xl text-teal-700">What you need to prepare</h2><ul className="mt-4 space-y-3">{profile.requiredFacts.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-500"><CheckCircle2 size={18} className="mt-1 shrink-0 text-rose-500" />{item}</li>)}</ul></div></div></div><div className="card p-7"><h2 className="font-serif text-2xl text-teal-700">Evidence checklist</h2><ul className="mt-4 space-y-3">{profile.evidenceRequirements.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-500"><CheckCircle2 size={18} className="mt-1 shrink-0 text-rose-500" />{item}</li>)}</ul></div><div className="card p-7"><h2 className="font-serif text-2xl text-teal-700">A simple workflow</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{workflow.steps.map((step, index) => <div key={step} className="rounded-xl border border-warm-border bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-500">Step {index + 1}</div><div className="mt-1 text-sm font-semibold capitalize text-teal-700">{step.replaceAll("-", " ")}</div></div>)}</div></div></div><aside className="space-y-6"><div className="card p-7"><div className="eyebrow">TARGET OUTCOME</div><p className="mt-3 text-lg font-semibold leading-7 text-teal-700 font-serif">{profile.outcome}</p><Link to="/workflows/$workflowId/start" params={{ workflowId }} className="btn-rose mt-7 w-full">Start this workflow <ArrowRight size={18} /></Link></div><div className="card p-7"><div className="eyebrow">DEADLINE POLICY</div><p className="mt-3 text-sm leading-6 text-slate-500">{profile.deadlinePolicy}</p></div><div className="card p-7"><div className="eyebrow">RECIPIENT</div><p className="mt-3 text-sm font-semibold leading-6 text-teal-700">{profile.recipientRole}</p></div></aside></section>
    <SiteFooter />
  </main>;
}
