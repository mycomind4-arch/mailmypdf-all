import { createFileRoute } from "@tanstack/react-router";
import { LicenseRevocationAppealWorkspace } from "@/components/workflow/license-revocation-appeal-workspace";
import { WorkflowLandingSection, WorkflowFAQSection, RelatedWorkflowsSection, getFAQSchema } from "@/components/workflow/workflow-landing-section";
import { getWorkflow } from "@/domain/workflows";

const WORKFLOW_ID = "license-revocation-appeal";

export const Route = createFileRoute("/workflows/license-revocation-appeal")({
  head: () => ({
    meta: [
      { title: "Appeal a License Revocation — Appeal Mail" },
      { name: "description", content: "Upload your revocation decision, understand the stated reason and appeal path, build an appeal, and send it by certified mail." },
      { property: "og:title", content: "Appeal a License Revocation — Appeal Mail" },
      { property: "og:description", content: "Upload your revocation decision, understand the stated reason and appeal path, build an appeal, and send it by certified mail." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Appeal a License Revocation — Appeal Mail" },
      { name: "twitter:description", content: "Upload your revocation decision, understand the stated reason and appeal path, build an appeal, and send it by certified mail." },
    ],
    links: [{ rel: "canonical", href: "/workflows/license-revocation-appeal" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Appeal a License Revocation",
          description: "Upload your revocation decision, understand the stated reason and appeal path, build an appeal, and send it by certified mail.",
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
            { "@type": "ListItem", position: 3, name: "License Revocation", item: "/workflows/license-revocation-appeal" },
          ],
        }),
      },
      ...(getFAQSchema(WORKFLOW_ID) ? [{ type: "application/ld+json", children: JSON.stringify(getFAQSchema(WORKFLOW_ID)) }] : []),
    ],
  }),
  component: () => (
    <>
      <WorkflowLandingSection workflowId={WORKFLOW_ID} />
      <LicenseRevocationAppealWorkspace />
      <WorkflowFAQSection workflowId={WORKFLOW_ID} />
      <RelatedWorkflowsSection workflowId={WORKFLOW_ID} />
    </>
  ),
});
