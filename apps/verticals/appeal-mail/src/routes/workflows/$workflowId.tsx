import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { getWorkflow, isWorkflowId } from "@/domain/workflows";

export const Route = createFileRoute("/workflows/$workflowId")({
  head: ({ params }) => {
    const workflow = isWorkflowId(params.workflowId) ? getWorkflow(params.workflowId) : undefined;
    if (!workflow) return {};
    const title = `${workflow.title} — Appeal Mail`;
    const desc = workflow.description;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: `/workflows/${params.workflowId}` }],
    };
  },
  component: WorkflowLanding,
});

function WorkflowLanding() {
  const { workflowId } = Route.useParams();
  if (!isWorkflowId(workflowId)) return <Navigate to="/workflows/denied-claim" />;
  const workflow = getWorkflow(workflowId);

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <Link to="/workflows" className="text-sm text-muted-foreground hover:text-foreground">← All appeal workflows</Link>
        <section className="mt-8 rounded-3xl border border-rule bg-card p-7 shadow-card sm:p-10">
          <div className="postmark w-fit">APPEAL MAIL WORKFLOW</div>
          <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">{workflow.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{workflow.description}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-rule bg-paper p-5"><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Understand</div><p className="mt-2 text-sm leading-6">Review the decision, deadline, and issues that matter.</p></div>
            <div className="rounded-xl border border-rule bg-paper p-5"><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Build</div><p className="mt-2 text-sm leading-6">Organize evidence and prepare a source-grounded response.</p></div>
            <div className="rounded-xl border border-rule bg-paper p-5"><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Send</div><p className="mt-2 text-sm leading-6">Review, approve, and continue to mailing with proof.</p></div>
          </div>
          {workflow.focusAreas.length > 0 && (
            <div className="mt-8 border-t border-rule/60 pt-7">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">This workflow checks</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {workflow.focusAreas.slice(0, 10).map((item) => <span key={item} className="rounded-full border border-rule bg-paper px-3 py-1.5 text-xs text-ink-soft">{item}</span>)}
              </div>
            </div>
          )}
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/workflows/$workflowId/start" params={{ workflowId }} className="btn-primary">Start this workflow →</Link>
            <Link to="/workflows" className="btn-secondary">Browse other workflows</Link>
          </div>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">You remain in control. Nothing is mailed until the response has been reviewed and approved.</p>
        </section>
      </div>
    </main>
  );
}
