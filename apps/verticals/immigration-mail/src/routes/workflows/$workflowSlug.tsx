import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getImmigrationWorkflow } from "@/lib/immigration-workflows";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/workflows/$workflowSlug")({
  loader: ({ params }) => {
    const workflow = getImmigrationWorkflow(params.workflowSlug);
    if (!workflow) throw notFound();
    return workflow;
  },
  head: ({ loaderData }) => {
    const workflow = loaderData;
    return {
      meta: [
        { title: `${workflow.title} | Immigration Mail` },
        { name: "description", content: workflow.description },
        { property: "og:title", content: `${workflow.title} | Immigration Mail` },
        { property: "og:description", content: workflow.description },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/workflows/${workflow.slug}` }],
    };
  },
  component: WorkflowLandingPage,
});

function ArrowRight() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
}

function WorkflowLandingPage() {
  const workflow = Route.useLoaderData();
  const faq = [
    ["What does this workflow do?", workflow.description],
    ["Will Immigration Mail decide my legal options?", "No. Immigration Mail organizes documents, facts, correspondence, and reviewable drafts. It does not provide legal advice or determine eligibility."],
    ["Can I review the response before mailing?", "Yes. The workflow is designed so the user reviews and edits the correspondence before a mailing is created."],
  ];

  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
            <div className="eyebrow">{workflow.intent}</div>
            <h1 className="mt-5 max-w-4xl text-4xl leading-[1.05] md:text-6xl md:leading-[1.03]">{workflow.h1}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-muted-foreground">{workflow.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/respond-to-a-uscis-notice" search={{ workflow: workflow.slug }} className="btn-primary text-base">
                Start this workflow <ArrowRight />
              </Link>
              <Link to="/workflows" className="btn-secondary">See all workflows</Link>
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60 bg-paper-deep/30">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
              {[
                { t: "Start with the record", d: workflow.notes[0] ?? "Preserve the source notice and facts before drafting." },
                { t: "Review before action", d: workflow.notes[1] ?? "Keep facts reviewable and avoid unsupported legal conclusions." },
                { t: "Prepare to send", d: "Review the final correspondence and preserve the mailing record through MailMyPDF." },
              ].map((item) => (
                <article key={item.t} className="envelope-card p-6">
                  <h2 className="font-serif text-xl">{item.t}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <div className="eyebrow">What to have ready</div>
            <h2 className="mt-3 text-2xl md:text-3xl font-serif">Useful information for this workflow</h2>
            <ul className="mt-8 grid gap-3 md:grid-cols-2">
              {workflow.relatedTerms.map((term) => (
                <li key={term} className="rounded-lg border border-rule bg-card px-4 py-3 text-sm text-ink-soft">{term}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-paper-deep/30">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <div className="eyebrow">Frequently asked questions</div>
            <div className="mt-6 space-y-4">
              {faq.map(([question, answer]) => (
                <article key={question} className="envelope-card p-6">
                  <h2 className="font-serif text-lg text-foreground">{question}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
                </article>
              ))}
            </div>
            <p className="mt-8 text-sm leading-6 text-muted-foreground">Immigration Mail is not a law firm or government agency. Procedures can be fact-specific. Verify official requirements with the relevant government agency or qualified counsel.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
