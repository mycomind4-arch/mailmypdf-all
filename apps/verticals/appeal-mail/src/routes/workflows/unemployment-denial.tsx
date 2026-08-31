import { createFileRoute } from "@tanstack/react-router";
import { UnemploymentDenialWorkspace } from "@/components/workflow/unemployment-denial-workspace";
import { WorkflowLandingSection, WorkflowFAQSection, RelatedWorkflowsSection, getFAQSchema } from "@/components/workflow/workflow-landing-section";

const WORKFLOW_ID = "unemployment-denial";

export const Route = createFileRoute("/workflows/unemployment-denial")({
  head: () => ({
    meta: [
      { title: "Appeal an Unemployment Denial — Appeal Mail" },
      { name: "description", content: "Upload an unemployment decision, understand the findings, build a response, and prepare it for mailing." },
      { property: "og:title", content: "Appeal an Unemployment Denial — Appeal Mail" },
      { property: "og:description", content: "Upload an unemployment decision, understand the findings, build a response, and prepare it for mailing." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Appeal an Unemployment Denial — Appeal Mail" },
      { name: "twitter:description", content: "Upload an unemployment decision, understand the findings, build a response, and prepare it for mailing." },
    ],
    links: [{ rel: "canonical", href: "/workflows/unemployment-denial" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Appeal an Unemployment Denial",
          description: "Upload an unemployment decision, understand the findings, build a response, and prepare it for mailing.",
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
            { "@type": "ListItem", position: 3, name: "Unemployment Denial", item: "/workflows/unemployment-denial" },
          ],
        }),
      },
      ...(getFAQSchema(WORKFLOW_ID) ? [{ type: "application/ld+json", children: JSON.stringify(getFAQSchema(WORKFLOW_ID)) }] : []),
    ],
  }),
  component: () => (
    <>
      <WorkflowLandingSection workflowId={WORKFLOW_ID} />
      <UnemploymentDenialWorkspace />
      <WorkflowFAQSection workflowId={WORKFLOW_ID} />
      <RelatedWorkflowsSection workflowId={WORKFLOW_ID} />
    </>
  ),
});
