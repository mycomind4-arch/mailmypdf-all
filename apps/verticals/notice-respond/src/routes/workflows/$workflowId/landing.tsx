import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getWorkflowById } from "@/domain/workflow-catalog";

export const Route = createFileRoute("/workflows/$workflowId/landing")({
  head: ({ params }) => {
    const workflow = getWorkflowById(params.workflowId);
    if (!workflow) return {};
    return {
      meta: [
        { title: `${workflow.title} — Notice Respond` },
        { name: "description", content: workflow.description },
      ],
      links: [{ rel: "canonical", href: `/workflows/${params.workflowId}/landing` }],
    };
  },
  component: NoticeWorkflowLanding,
});

function NoticeWorkflowLanding() {
  const { workflowId } = Route.useParams();
  const workflow = getWorkflowById(workflowId);
  if (!workflow) throw notFound();

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <Link to="/workflows/" className="text-sm text-muted-foreground hover:text-foreground">← All Notice Respond workflows</Link>
            <div className="postmark mt-7 w-fit">NOTICE RESPOND WORKFLOW</div>
            <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">{workflow.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-ink-soft sm:text-lg">{workflow.description}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {(workflow.ux?.steps ?? []).slice(0, 3).map((step, index) => (
                <div key={step.id} className="rounded-xl border border-rule bg-card p-5">
                  <div className="font-mono text-xs text-muted-foreground">0{index + 1}</div>
                  <div className="mt-2 font-serif text-lg">{step.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to={workflow.searchIntent.canonicalPath} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">Start this workflow →</Link>
              <Link to="/workflows/" className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3.5 text-sm font-medium">Browse workflows</Link>
            </div>
            <p className="mt-5 max-w-2xl text-xs leading-5 text-muted-foreground">Review the notice, confirm your facts, and approve the response before anything is mailed.</p>
          </div>
        </section>

        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-8 md:grid-cols-2">
              <div><div className="eyebrow">Best for</div><p className="mt-3 text-sm leading-6 text-muted-foreground">{workflow.directory?.bestFor ?? workflow.description}</p></div>
              <div><div className="eyebrow">Documents to prepare</div><ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">{(workflow.directory?.documents ?? []).slice(0, 8).map((doc) => <li key={doc}>• {doc}</li>)}</ul></div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
