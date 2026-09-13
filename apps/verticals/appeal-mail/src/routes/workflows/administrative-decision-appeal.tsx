import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ADMINISTRATIVE_DECISION_APPEAL_PRICING } from "@/domain/administrative-decision-appeal-gold";
import { createStepMatter } from "@/lib/fns/step-matter";
import { useAuth } from "@/lib/auth";
import { WorkflowLandingSection, WorkflowFAQSection, RelatedWorkflowsSection, getFAQSchema } from "@/components/workflow/workflow-landing-section";

const WORKFLOW_ID = "administrative-decision-appeal";

export const Route = createFileRoute("/workflows/administrative-decision-appeal")({
  head: () => ({
    meta: [
      { title: "How to Appeal an Administrative Decision | Appeal Mail" },
      { name: "description", content: "Step-by-step guidance to appeal an administrative or agency decision. AI identifies the governing jurisdiction, deadline, and disputed findings, drafts a specific response, and mails it by certified mail." },
      { property: "og:title", content: "How to Appeal an Administrative Decision" },
      { property: "og:description", content: "Authority-first administrative decision appeal analysis with jurisdiction and deadline verification, evidence organization, drafting, and certified mailing proof." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "How to Appeal an Administrative Decision — Appeal Mail" },
      { name: "twitter:description", content: "Upload your decision notice and build a specific, evidence-backed administrative appeal." },
    ],
    links: [{ rel: "canonical", href: "/workflows/administrative-decision-appeal" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Administrative Decision Appeal",
          description: "Appeal an adverse administrative or agency decision with an AI-assisted, evidence-backed appeal letter and certified mailing.",
          provider: { "@type": "Organization", name: "Appeal Mail", url: "/" },
          areaServed: "US",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "/" },
            { "@type": "ListItem", position: 2, name: "Workflows", item: "/workflows" },
            { "@type": "ListItem", position: 3, name: "Administrative Decision Appeal", item: "/workflows/administrative-decision-appeal" },
          ],
        }),
      },
      ...(getFAQSchema(WORKFLOW_ID) ? [{ type: "application/ld+json", children: JSON.stringify(getFAQSchema(WORKFLOW_ID)) }] : []),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <WorkflowLandingSection workflowId={WORKFLOW_ID} />
      <StartAppealSection />
      <WorkflowFAQSection workflowId={WORKFLOW_ID} />
      <RelatedWorkflowsSection workflowId={WORKFLOW_ID} />
    </>
  );
}

/**
 * Replaces the generic `AppealWorkflowWorkspace` other not-yet-converted
 * workflows still use. This workflow is on the step-matter engine instead:
 * the CTA creates a persisted matter and hands off to
 * `/matters/$matterId/intake`, gated by auth exactly like
 * car-insurance-appeal. `id="workflow-start"` is the anchor target for
 * WorkflowLandingSection's hero CTA link.
 */
function StartAppealSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function startWorkflow() {
    const { matter } = await createStepMatter({ data: { workflowId: WORKFLOW_ID } });
    navigate({ to: "/matters/$matterId/$step", params: { matterId: matter.id, step: "intake" } });
  }

  return (
    <section id="workflow-start" className="border-t border-rule bg-paper-deep">
      <div className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-rule bg-paper p-7">
            <h2 className="font-serif text-2xl">What we analyze</h2>
            <ol className="mt-6 space-y-4">
              {[
                "Identify the decision-maker, jurisdiction, decision date, reference numbers, findings, instructions, and cited authority.",
                "Verify the controlling appeal path and deadline computation from the notice and current authoritative sources.",
                "Separate the agency's stated findings and supported facts from disputed facts and assumptions.",
                "Map evidence gaps, contradictions, timeline issues, and procedural exhaustion requirements.",
                "Draft and independently validate the response before explicit human approval for mailing.",
              ].map((x, i) => (
                <li key={x} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">{i + 1}</span>
                  <span className="text-sm leading-7 text-muted-foreground">{x}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-rule bg-paper p-7">
            <h2 className="font-serif text-2xl">Start your appeal</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Starting price: <strong className="text-foreground">${ADMINISTRATIVE_DECISION_APPEAL_PRICING.preparationFee.toFixed(2)}</strong> plus mailing, assuming {ADMINISTRATIVE_DECISION_APPEAL_PRICING.includedResponsePages} response pages and no supporting-document sheets.
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              We'll walk you through intake, documents, analysis, evidence, timeline, drafting, review, and mailing — one step at a time, with your approval required before anything is sent.
            </p>
            {user ? (
              <button type="button" className="mt-6 w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90" onClick={startWorkflow}>
                Analyze administrative decision
              </button>
            ) : (
              <Link
                to="/auth"
                search={{ returnTo: "/workflows/administrative-decision-appeal" } as never}
                className="mt-6 block w-full rounded-xl bg-foreground px-5 py-3 text-center text-sm font-semibold text-background hover:opacity-90"
              >
                Sign in to start your appeal
              </Link>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-rule bg-paper p-7">
          <h2 className="font-serif text-xl">Transparent pricing</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[
              ["Preparation", `$${ADMINISTRATIVE_DECISION_APPEAL_PRICING.preparationFee.toFixed(2)}`],
              ["Included response", `${ADMINISTRATIVE_DECISION_APPEAL_PRICING.includedResponsePages} pages`],
              ["Extra response", `$${ADMINISTRATIVE_DECISION_APPEAL_PRICING.responsePagePrice.toFixed(2)}/sheet`],
              ["Supporting evidence", `$${ADMINISTRATIVE_DECISION_APPEAL_PRICING.supportingPagePrice.toFixed(2)}/sheet`],
              ["Standard mail", `$${ADMINISTRATIVE_DECISION_APPEAL_PRICING.standardMail.toFixed(2)}`],
              ["Certified", `$${ADMINISTRATIVE_DECISION_APPEAL_PRICING.certifiedMail.toFixed(2)}`],
              ["Certified + return receipt", `$${ADMINISTRATIVE_DECISION_APPEAL_PRICING.certifiedReturnReceipt.toFixed(2)}`],
              ["Flat packet surcharge", `$${ADMINISTRATIVE_DECISION_APPEAL_PRICING.flatEnvelopeFee.toFixed(2)} when required`],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-paper-deep p-4">
                <div className="text-xs text-muted-foreground">{a}</div>
                <div className="mt-1 font-semibold">{b}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-6 text-muted-foreground">The exact price is calculated from the approved physical packet. Supporting-document sheets are billed separately when included.</p>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">Appeal Mail is not a law firm and does not provide legal advice. Administrative procedures, deadlines, and exhaustion requirements vary by agency and jurisdiction and must be verified against current authoritative sources.</p>
      </div>
    </section>
  );
}
