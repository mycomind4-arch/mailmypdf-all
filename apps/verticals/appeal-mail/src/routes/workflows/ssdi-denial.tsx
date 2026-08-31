import { createFileRoute } from "@tanstack/react-router";
import { SsiDenialWorkspace } from "@/components/workflow/ssi-denial-workspace";
import { WorkflowLandingSection, WorkflowFAQSection, RelatedWorkflowsSection, getFAQSchema } from "@/components/workflow/workflow-landing-section";
import { SsdiDenialPricing } from "@/components/workflow/ssdi-denial-pricing";

const WORKFLOW_ID = "ssdi-denial";

export const Route = createFileRoute("/workflows/ssdi-denial")({
  head: () => ({
    meta: [
      { title: "Appeal an SSDI Denial — Appeal Mail" },
      { name: "description", content: "Upload your SSDI denial notice, understand the findings, build a reconsideration or hearing request, and send it by certified mail to the SSA." },
      { property: "og:title", content: "Appeal an SSDI Denial — Appeal Mail" },
      { property: "og:description", content: "Upload your SSDI denial notice, understand the findings, build a reconsideration or hearing request, and send it by certified mail to the SSA." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Appeal an SSDI Denial — Appeal Mail" },
      { name: "twitter:description", content: "Upload your SSDI denial notice, understand the findings, build a reconsideration or hearing request, and send it by certified mail to the SSA." },
    ],
    links: [{ rel: "canonical", href: "/workflows/ssdi-denial" }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: "Appeal an SSDI Denial", description: "Upload your SSDI denial notice, understand the findings, build a reconsideration or hearing request, and send it by certified mail to the SSA.", provider: { "@type": "Organization", name: "Appeal Mail", url: "/" }, areaServed: "US" }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "/" }, { "@type": "ListItem", position: 2, name: "Workflows", item: "/workflows" }, { "@type": "ListItem", position: 3, name: "SSDI Denial", item: "/workflows/ssdi-denial" }] }) },
      ...(getFAQSchema(WORKFLOW_ID) ? [{ type: "application/ld+json", children: JSON.stringify(getFAQSchema(WORKFLOW_ID)) }] : []),
    ],
  }),
  component: () => (
    <>
      <WorkflowLandingSection workflowId={WORKFLOW_ID} />
      <SsdiDenialPricing />
      <SsiDenialWorkspace />
      <WorkflowFAQSection workflowId={WORKFLOW_ID} />
      <RelatedWorkflowsSection workflowId={WORKFLOW_ID} />
    </>
  ),
});
