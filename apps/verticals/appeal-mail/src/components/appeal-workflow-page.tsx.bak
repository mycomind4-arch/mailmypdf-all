import { Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight, FileText, Search, Lightbulb, FolderOpen, Send, ArrowLeft, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { AppealWorkflowEntry } from "@/domain/appeal-catalog";
import { getDomainPack, constructWorkflow } from "@/domain/workflow-capabilities";
import { workflows as workflowDefinitions } from "@/domain/workflows";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Customer-facing workflow page.
 *
 * A catalog flag is not enough to claim executable behavior. The page only
 * advertises an executable workflow when a concrete domain pack is registered
 * and the factory quality gate reaches at least functional execution.
 */
export function AppealWorkflowPage({ workflow }: { workflow: AppealWorkflowEntry }) {
  const definition = workflowDefinitions[workflow.slug as keyof typeof workflowDefinitions];
  const constructed = definition ? constructWorkflow(definition) : undefined;
  const hasRuntimePack = Boolean(getDomainPack(workflow.slug));
  const isExecutable = workflow.executable === true && hasRuntimePack && constructed?.lifecycle !== "blueprint" && constructed?.ready === true;

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
            <Link to="/workflows" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft size={14} /> Appeal workflow directory
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-rule bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{workflow.category}</span>
              {isExecutable ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-color-mix-in-oklab-stamp-8-transparent px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-stamp"><CheckCircle2 size={10} /> Executable workflow</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"><FileText size={10} /> Workflow catalog</span>
              )}
            </div>
            <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl md:text-6xl">{workflow.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">{workflow.shortDescription}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isExecutable ? (
                <Link to="/workflows/denied-claim" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5">Start the workflow <ArrowRight size={16} /></Link>
              ) : (
                <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full bg-paper-deep px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-paper">Explore the workflow directory <ArrowRight size={16} /></Link>
              )}
              <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full border border-rule px-6 py-3 text-sm font-medium transition-colors hover:border-ink">Explore appeal types</Link>
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60"><div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16"><p className="max-w-3xl text-lg leading-8 text-ink-soft">{workflow.longDescription}</p></div></section>

        <section className="border-b border-rule/60 bg-paper-deep/25">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-6 md:grid-cols-2">
              <InfoCard icon={<Search size={18} />} title="What we analyze" items={workflow.whatWeAnalyze} />
              <InfoCard icon={<FolderOpen size={18} />} title="What you'll need" items={workflow.whatYouNeed} />
              <InfoCard icon={<Lightbulb size={18} />} title="What Appeal Mail identifies" items={workflow.whatWeIdentify} />
              <InfoCard icon={<FileText size={18} />} title="What your appeal can address" items={workflow.whatAppealAddresses} />
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60"><div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16"><div className="grid gap-8 md:grid-cols-2"><div><div className="font-mono text-xs uppercase tracking-[0.18em] text-stamp">Who this is for</div><p className="mt-2 text-base leading-7 text-ink-soft">{workflow.intendedUser}</p></div><div><div className="font-mono text-xs uppercase tracking-[0.18em] text-stamp">The problem it solves</div><p className="mt-2 text-base leading-7 text-ink-soft">{workflow.problemSolved}</p></div></div></div></section>

        <section className="border-b border-rule/60 bg-paper-deep/15"><div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16"><div className="grid gap-5 md:grid-cols-3"><ValueCard title="Understand" text="Turn the decision and supporting documents into a clear case picture." /><ValueCard title="Prepare" text="Organize supported grounds, evidence, and the material needed for review." /><ValueCard title="Mail & prove" text="When an executable workflow is ready, transition naturally into MailMyPDF for physical mailing, tracking, and proof." /></div></div></section>

        <section className="border-t border-rule/60 bg-paper-deep/30">
          <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-20">
            {isExecutable ? (
              <><div className="postmark mx-auto w-fit">Ready to start</div><h2 className="mt-4 font-serif text-3xl sm:text-4xl">Start your {workflow.title.toLowerCase()}.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Upload the decision and supporting documents. Appeal Mail will take you through analysis, evidence, preparation, review, and the MailMyPDF fulfillment path.</p><Link to="/workflows/denied-claim" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5"><Send size={16} /> Start an Appeal <ArrowRight size={16} /></Link></>
            ) : (
              <><div className="postmark mx-auto w-fit">Appeal workflow</div><h2 className="mt-4 font-serif text-3xl sm:text-4xl">Understand the path before you act.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">This page describes the intended workflow and the documents, issues, evidence, and response structure associated with this appeal type. Appeal Mail only activates execution when the corresponding capabilities are registered and verified.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link to="/workflows" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp">Browse executable workflows <ArrowRight size={16} /></Link><Link to="/workflows" className="inline-flex items-center gap-2 rounded-full border border-rule px-6 py-3 text-sm font-medium transition-colors hover:border-ink">Browse appeal types</Link></div></>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function InfoCard({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return <div className="rounded-xl border border-rule bg-card p-6"><div className="flex items-center gap-2 text-stamp">{icon}<h2 className="font-serif text-xl text-foreground">{title}</h2></div><ul className="mt-4 space-y-2.5">{items.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stamp" />{item}</li>)}</ul></div>;
}

function ValueCard({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-rule bg-card p-5"><div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-stamp"><ShieldCheck size={14} /> {title}</div><p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}
