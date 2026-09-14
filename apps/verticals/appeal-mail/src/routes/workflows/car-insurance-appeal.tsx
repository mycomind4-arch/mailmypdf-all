import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CAR_INSURANCE_APPEAL_PRICING } from "@/domain/car-insurance-appeal-pricing";
import { createStepMatter } from "@/lib/fns/step-matter";
import { useAuth } from "@/lib/auth";
import { WorkflowLandingSection, WorkflowFAQSection, RelatedWorkflowsSection, getFAQSchema } from "@/components/workflow/workflow-landing-section";

const WORKFLOW_ID = "car-insurance-appeal";

export const Route = createFileRoute("/workflows/car-insurance-appeal")({
  head: () => ({
    meta: [
      { title: "Car Insurance Appeal Letter — Appeal a Denied Claim | Appeal Mail" },
      { name: "description", content: "Appeal a denied or reduced car insurance claim. AI identifies the insurer's liability, damage, or coverage determination, drafts a specific evidence-backed appeal letter, and mails it by certified mail." },
      { property: "og:title", content: "Car Insurance Appeal Letter — Appeal a Denied Claim" },
      { property: "og:description", content: "Analyze your auto insurance denial, dispute liability, damage, or coverage findings with evidence, and mail a human-reviewed appeal letter with transparent pricing." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Car Insurance Appeal Letter — Appeal Mail" },
      { name: "twitter:description", content: "Upload your claim denial and build a specific, evidence-backed appeal letter." },
    ],
    links: [{ rel: "canonical", href: "/workflows/car-insurance-appeal" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Car Insurance Appeal Letter",
          description: "Appeal a denied or reduced car insurance claim with an AI-assisted, evidence-backed appeal letter and certified mailing.",
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
            { "@type": "ListItem", position: 3, name: "Car Insurance Appeal", item: "/workflows/car-insurance-appeal" },
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
 * Replaces the generic `AppealWorkflowWorkspace` (ephemeral single-page
 * upload/analyze/draft/send flow) other not-yet-converted workflows still
 * use. This workflow is on the step-matter engine instead: the CTA creates a
 * persisted matter and hands off to `/matters/$matterId/intake`, gated by
 * auth exactly like administrative-decision-appeal. `id="workflow-start"` is
 * the anchor target for WorkflowLandingSection's hero CTA link.
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
                "Identify the insurer, claim number, policy number, adjuster, accident date, and the stated denial reason.",
                "Extract the liability determination — including any comparative-negligence or percentage-at-fault split — and check it against the accident report.",
                "Separate the insurer's damage assessment and repair or total-loss valuation from your own repair estimate and photos.",
                "Map coverage provisions and exclusions cited in the denial against your policy declarations page.",
                "Draft a specific, evidence-referencing rebuttal and independently validate it before you approve mailing.",
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
              Starting price: <strong className="text-foreground">${CAR_INSURANCE_APPEAL_PRICING.preparationFee.toFixed(2)}</strong> plus mailing, assuming {CAR_INSURANCE_APPEAL_PRICING.includedResponsePages} response pages and no supporting-document sheets.
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              We'll walk you through intake, documents, analysis, evidence, drafting, review, and mailing — one step at a time, with your approval required before anything is sent.
            </p>
            {user ? (
              <button type="button" className="mt-6 w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90" onClick={startWorkflow}>
                Analyze my claim
              </button>
            ) : (
              <Link
                to="/auth"
                search={{ returnTo: "/workflows/car-insurance-appeal" } as never}
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
              ["Preparation", `$${CAR_INSURANCE_APPEAL_PRICING.preparationFee.toFixed(2)}`],
              ["Included response", `${CAR_INSURANCE_APPEAL_PRICING.includedResponsePages} pages`],
              ["Extra response", `$${CAR_INSURANCE_APPEAL_PRICING.responsePagePrice.toFixed(2)}/sheet`],
              ["Supporting evidence", `$${CAR_INSURANCE_APPEAL_PRICING.supportingPagePrice.toFixed(2)}/sheet`],
              ["Standard mail", `$${CAR_INSURANCE_APPEAL_PRICING.standardMail.toFixed(2)}`],
              ["Certified", `$${CAR_INSURANCE_APPEAL_PRICING.certifiedMail.toFixed(2)}`],
              ["Registered", `$${CAR_INSURANCE_APPEAL_PRICING.registeredMail.toFixed(2)}`],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-paper-deep p-4">
                <div className="text-xs text-muted-foreground">{a}</div>
                <div className="mt-1 font-semibold">{b}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs leading-6 text-muted-foreground">The exact price is calculated from the approved physical packet. Supporting-document sheets are billed separately when included.</p>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">Appeal Mail is not a law firm and does not provide legal advice. Insurance policies, appeal procedures, and deadlines vary by insurer and state and must be verified against your actual policy.</p>
      </div>
    </section>
  );
}
