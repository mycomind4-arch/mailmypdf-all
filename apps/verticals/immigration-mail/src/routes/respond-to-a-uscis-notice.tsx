import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getImmigrationWorkflow, getWorkflowRoute } from "@/lib/immigration-workflows";

export const Route = createFileRoute('/respond-to-a-uscis-notice')({
  validateSearch: (search: Record<string, unknown>) => ({
    workflow: typeof search.workflow === "string" ? search.workflow : "i-797-notice",
  }),
  head: ({ search }) => {
    const workflow = getImmigrationWorkflow(search.workflow);
    return {
      meta: [
        { title: `${workflow?.title ?? "Respond to a USCIS Notice"} | Immigration Mail` },
        {
          name: 'description',
          content: workflow?.description ?? 'Organize a USCIS notice, identify its requested response, dates and documents, prepare a reviewable response, and preserve the mailing record.',
        },
      ],
      links: [{ rel: 'canonical', href: '/respond-to-a-uscis-notice' }],
    };
  },
  component: Page,
});

function Page(){
  const { workflow: workflowSlug } = Route.useSearch();
  const workflow = getImmigrationWorkflow(workflowSlug) ?? getImmigrationWorkflow("i-797-notice")!;

  return <div className="min-h-screen page-fade"><SiteHeader/><main>
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="eyebrow">{workflow.intent}</div>
        <h1 className="mt-5 max-w-4xl text-4xl leading-[1.05] md:text-6xl md:leading-[1.03]">{workflow.h1}</h1>
        <p className="mt-7 max-w-2xl text-lg text-ink-soft">{workflow.description} Start with the source record, keep the facts reviewable, and prepare correspondence you can edit before mailing.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/workflows/respond-to-notice" search={{ workflow: workflow.slug } as never} className="btn-primary text-base">Start this workflow</Link>
          <Link to="/workflows" className="btn-secondary">See all workflows</Link>
        </div>
      </div>
    </section>
    <section className="bg-paper-deep/30 border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-4">
          {[['01','Source record','Preserve the exact notice, identifiers, and dates.'],['02','Requested action','Identify what the agency is asking for or deciding.'],['03','Evidence','Organize supporting documents and flag missing information.'],['04','Mail','Review the final response and preserve the resulting mailing information.']].map(([n,t,d])=><article className="envelope-card p-5 sm:p-6" key={n}><div className="font-mono text-xs text-brass">{n}</div><h2 className="mt-3 font-serif text-xl">{t}</h2><p className="mt-2 text-sm text-muted-foreground">{d}</p></article>)}
        </div>
      </div>
    </section>
    <section>
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <div className="eyebrow">Selected workflow</div>
        <h2 className="mt-3 text-2xl md:text-3xl font-serif">{workflow.title}</h2>
        <p className="mt-5 text-base text-ink-soft">{workflow.notes.join(' ')}</p>
        <Link to={getWorkflowRoute(workflow.slug)} className="btn-primary mt-8">Review workflow guidance →</Link>
        <p className="mt-8 text-sm leading-6 text-muted-foreground">Immigration Mail helps organize documents and correspondence. It does not determine eligibility, guarantee an outcome, or replace legal advice.</p>
      </div>
    </section>
  </main><SiteFooter/></div>
}
