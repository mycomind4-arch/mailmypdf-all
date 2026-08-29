import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, FileText, ArrowRight, Upload, Sparkles, Send, ShieldCheck } from "lucide-react";
import { workflowLandingContent, type LandingContent } from "@/domain/workflow-landing-content";
import { workflows } from "@/domain/workflows";

export function WorkflowLandingSection({ workflowId }: { workflowId: string }) {
  const content = workflowLandingContent[workflowId];
  if (!content) return null;

  return (
    <section className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <h1 className="font-serif text-3xl md:text-5xl">{content.h1}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{content.subheadline}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#workflow-start" className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90">
            <Upload size={16} /> {content.ctaText}
          </a>
          <Link to="/pricing" className="inline-flex items-center gap-2 rounded-full border border-foreground px-5 py-2.5 text-sm font-medium hover:bg-muted">
            See pricing
          </Link>
        </div>

        <div className="mt-12 space-y-10">
          {/* What it means */}
          <div>
            <h2 className="font-serif text-2xl">What this denial means</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{content.whatItMeans}</p>
          </div>

          {/* Who is this for */}
          <div>
            <h2 className="font-serif text-2xl">Who this is for</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{content.whoIsThisFor}</p>
          </div>

          {/* Common reasons */}
          <div>
            <h2 className="font-serif text-2xl">Common reasons for denial</h2>
            <ul className="mt-4 space-y-2">
              {content.commonReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* What information matters */}
          <div>
            <h2 className="font-serif text-2xl">What information matters</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{content.whatMatters}</p>
          </div>

          {/* Evidence checklist */}
          <div className="rounded-2xl border border-rule bg-paper-deep p-6 md:p-8">
            <h2 className="font-serif text-2xl">Documents to prepare</h2>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {content.evidenceChecklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-6">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Deadline guidance */}
          <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <Clock size={24} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <h2 className="font-serif text-xl">Deadline guidance</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{content.deadlineGuidance}</p>
            </div>
          </div>

          {/* What Appeal Mail does */}
          <div>
            <h2 className="font-serif text-2xl">What Appeal Mail does</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{content.whatWeDo}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-rule bg-paper p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-rule"><Upload size={18} /></div>
                <p className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Upload</p>
                <p className="mt-1 text-xs text-muted-foreground">Your denial letter</p>
              </div>
              <div className="rounded-xl border border-rule bg-paper p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-rule"><Sparkles size={18} /></div>
                <p className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Analyze</p>
                <p className="mt-1 text-xs text-muted-foreground">AI identifies issues</p>
              </div>
              <div className="rounded-xl border border-rule bg-paper p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-rule"><FileText size={18} /></div>
                <p className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Build</p>
                <p className="mt-1 text-xs text-muted-foreground">Draft + validate</p>
              </div>
              <div className="rounded-xl border border-rule bg-paper p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-rule"><Send size={18} /></div>
                <p className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Send</p>
                <p className="mt-1 text-xs text-muted-foreground">Certified mail</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WorkflowFAQSection({ workflowId }: { workflowId: string }) {
  const content = workflowLandingContent[workflowId];
  if (!content || !content.faqs.length) return null;

  return (
    <section className="border-t border-rule bg-paper-deep">
      <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <h2 className="font-serif text-2xl md:text-3xl">Frequently asked questions</h2>
        <div className="mt-8 space-y-6">
          {content.faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-rule bg-paper p-6">
              <h3 className="font-medium">{faq.question}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RelatedWorkflowsSection({ workflowId }: { workflowId: string }) {
  const content = workflowLandingContent[workflowId];
  if (!content || !content.relatedWorkflowIds.length) return null;

  const related = content.relatedWorkflowIds
    .map((id) => workflows[id])
    .filter(Boolean);

  if (!related.length) return null;

  return (
    <section className="border-t border-rule bg-paper">
      <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <h2 className="font-serif text-2xl md:text-3xl">Related appeal workflows</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {related.map((w) => (
            <Link
              key={w.id}
              to="/workflows/$workflowId"
              params={{ workflowId: w.id }}
              className="group flex items-center justify-between rounded-xl border border-rule bg-paper-deep p-5 transition-colors hover:border-foreground/30 hover:bg-muted"
            >
              <div>
                <p className="font-medium">{w.title}</p>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{w.description}</p>
              </div>
              <ArrowRight size={18} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function getFAQSchema(workflowId: string) {
  const content = workflowLandingContent[workflowId];
  if (!content || !content.faqs.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
