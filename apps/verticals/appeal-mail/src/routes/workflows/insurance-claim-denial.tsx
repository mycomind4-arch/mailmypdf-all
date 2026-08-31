import { createFileRoute } from "@tanstack/react-router";
import { AppealWorkflowWorkspace } from "@/components/workflow/appeal-workflow-workspace";
import { WorkflowLandingSection, WorkflowFAQSection, RelatedWorkflowsSection, getFAQSchema } from "@/components/workflow/workflow-landing-section";

const WORKFLOW_ID = "insurance-claim-denial";

export const Route = createFileRoute("/workflows/insurance-claim-denial")({
  head: () => ({
    meta: [
      { title: "Appeal an Insurance Claim Denial — Appeal Mail" },
      { name: "description", content: "Upload an insurance claim denial letter, identify coverage issues and policy violations, and build a documented appeal to your insurer." },
      { property: "og:title", content: "Appeal an Insurance Claim Denial — Appeal Mail" },
      { property: "og:description", content: "Upload an insurance claim denial letter, identify coverage issues and policy violations, and build a documented appeal to your insurer." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Appeal an Insurance Claim Denial — Appeal Mail" },
      { name: "twitter:description", content: "Upload an insurance claim denial letter, identify coverage issues and policy violations, and build a documented appeal to your insurer." },
    ],
    links: [{ rel: "canonical", href: "/workflows/insurance-claim-denial" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Appeal an Insurance Claim Denial",
          description: "Upload an insurance claim denial letter, identify coverage issues and policy violations, and build a documented appeal to your insurer.",
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
            { "@type": "ListItem", position: 3, name: "Insurance Claim Denial", item: "/workflows/insurance-claim-denial" },
          ],
        }),
      },
      ...(getFAQSchema(WORKFLOW_ID) ? [{ type: "application/ld+json", children: JSON.stringify(getFAQSchema(WORKFLOW_ID)) }] : []),
    ],
  }),
  component: () => (
    <>
      <WorkflowLandingSection workflowId={WORKFLOW_ID} />
      <AppealWorkflowWorkspace workflowId="insurance-claim-denial" suppressH1 />
      <WorkflowFAQSection workflowId={WORKFLOW_ID} />
      <RelatedWorkflowsSection workflowId={WORKFLOW_ID} />
    </>
  ),
});
