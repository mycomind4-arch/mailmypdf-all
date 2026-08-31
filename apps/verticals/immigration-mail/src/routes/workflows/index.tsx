import { createFileRoute, Link } from "@tanstack/react-router";
import { IMMIGRATION_WORKFLOWS, getWorkflowRoute } from "@/lib/immigration-workflows";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/workflows/")({
  head: () => ({
    meta: [
      { title: "Immigration Mail Workflows | USCIS, RFE, FOIA & Immigration Records" },
      { name: "description", content: "Choose a focused Immigration Mail workflow for USCIS notices, RFE responses, NOIDs, immigration FOIA requests, visa refusals, and supporting correspondence." },
      { property: "og:title", content: "Immigration Mail Workflows" },
      { property: "og:description", content: "Focused workflows for USCIS notices, evidence requests, immigration records, refusals, and response letters." },
    ],
    links: [{ rel: "canonical", href: "/workflows" }],
  }),
  component: WorkflowDirectory,
});

function ArrowRight() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
}

function WorkflowDirectory() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
            <div className="max-w-4xl">
              <div className="eyebrow">Workflow directory</div>
              <h1 className="mt-4 text-4xl leading-[1.05] md:text-6xl md:leading-[1.03]">
                Find the immigration workflow that matches your notice, records request, or response.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
                Immigration Mail is the master home for focused USCIS, immigration-records, refusal, and correspondence workflows. Start with the exact document or task you have, then move into the shared review and mailing workspace.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
              {IMMIGRATION_WORKFLOWS.map((workflow) => (
                <Link key={workflow.slug} to={getWorkflowRoute(workflow.slug)} className="envelope-card envelope-card-hover p-5 sm:p-6 block">
                  <div className="flex items-center justify-between gap-4">
                    <span className="badge-base badge-navy">{workflow.intent}</span>
                  </div>
                  <h2 className="mt-4 font-serif text-xl">{workflow.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{workflow.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brass">
                    Open workflow <ArrowRight />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-paper-deep/30">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <div className="envelope-card p-8 md:p-10">
              <div className="eyebrow">One product, specific pages</div>
              <h2 className="mt-3 text-2xl font-serif md:text-3xl">
                One master product. Specific pages for specific immigration problems.
              </h2>
              <p className="mt-4 max-w-3xl leading-7 text-muted-foreground text-sm">
                High-volume document and notice terms such as I-797/I-797C, RFE response, USCIS FOIA, and EOIR FOIA can attract users at different points in the journey. Each page should answer the specific question first, then move the user into the shared Immigration Mail workflow.
              </p>
              <p className="mt-6 text-sm text-muted-foreground">
                Immigration Mail is not a law firm or government agency. Procedures can be fact-specific. Verify official requirements with the relevant government agency or qualified counsel.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
