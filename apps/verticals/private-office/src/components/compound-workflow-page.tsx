import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2, GitBranch, ShieldCheck } from "lucide-react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import {
  compoundWorkflows,
  type CompoundWorkflowId,
} from "@/domain/compound-workflows";

export function CompoundWorkflowPage({ workflowId }: { workflowId: CompoundWorkflowId }) {
  const workflow = compoundWorkflows[workflowId];

  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <PrivateOfficeChrome />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14">
        <div className="max-w-4xl">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Private Office · Compound workflow
          </div>
          <h1 className="font-serif text-4xl leading-tight md:text-6xl">{workflow.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">{workflow.summary}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/start"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
            >
              Start a matter <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/workflows"
              className="inline-flex items-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold"
            >
              All workflows
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <ShieldCheck className="h-6 w-6" />
            <h2 className="mt-4 font-serif text-2xl">Major outcome</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{workflow.majorOutcome}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <CheckCircle2 className="h-6 w-6" />
            <h2 className="mt-4 font-serif text-2xl">Controlled execution</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Evidence, authority, deadline, and human-review gates control progression. Consequential
              actions are never automatic.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <GitBranch className="h-6 w-6" />
            <h2 className="mt-4 font-serif text-2xl">{workflow.phases.length} linked phases</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Each phase unlocks only when its prerequisite record is complete, preserving a traceable
              path from intake through final proof or handoff.
            </p>
          </div>
        </div>

        <section className="mt-16">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Orchestration map
            </div>
            <h2 className="mt-3 font-serif text-4xl">One major objective, multiple governed operations.</h2>
          </div>
          <div className="mt-8 space-y-5">
            {workflow.phases.map((phase, index) => (
              <article key={phase.id} className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-2xl">{phase.title}</h3>
                    <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{phase.objective}</p>
                    <div className="mt-5 grid gap-5 lg:grid-cols-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capabilities</div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {phase.capabilities.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outputs</div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {phase.outputs.map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gates</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {phase.gates.map((gate) => (
                            <span key={gate} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                              {gate}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <h2 className="font-serif text-3xl">What to gather first</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              {workflow.entryDocuments.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-serif text-3xl">Escalate for professional review</h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              {workflow.attorneyEscalationTriggers.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-7 text-white">
          <h2 className="font-serif text-3xl">Guardrails</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
            {workflow.guardrails.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </section>
      </section>
    </main>
  );
}
