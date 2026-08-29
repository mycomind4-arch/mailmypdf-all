import { createFileRoute } from "@tanstack/react-router";
import { DriversLicenseSuspensionWorkspace } from "@/components/workflow/drivers-license-suspension-workspace";
import { WorkflowLandingSection, WorkflowFAQSection, RelatedWorkflowsSection, getFAQSchema } from "@/components/workflow/workflow-landing-section";
import { getWorkflow } from "@/domain/workflows";

const WORKFLOW_ID = "drivers-license-suspension";

export const Route = createFileRoute("/workflows/drivers-license-suspension")({
  head: () => ({
    meta: [
      { title: "Appeal a Driver's License Suspension — Appeal Mail" },
      { name: "description", content: "Upload your DMV suspension notice, understand the reason and deadline, build a hearing request, and send it by certified mail." },
      { property: "og:title", content: "Appeal a Driver's License Suspension — Appeal Mail" },
      { property: "og:description", content: "Upload your DMV suspension notice, understand the reason and deadline, build a hearing request, and send it by certified mail." },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Appeal a Driver's License Suspension — Appeal Mail" },
      { name: "twitter:description", content: "Upload your DMV suspension notice, understand the reason and deadline, build a hearing request, and send it by certified mail." },
    ],
    links: [{ rel: "canonical", href: "/workflows/drivers-license-suspension" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Appeal a Driver's License Suspension",
          description: "Upload your DMV suspension notice, understand the reason and deadline, build a hearing request, and send it by certified mail.",
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
            { "@type": "ListItem", position: 3, name: "Driver's License Suspension", item: "/workflows/drivers-license-suspension" },
          ],
        }),
      },
      ...(getFAQSchema(WORKFLOW_ID) ? [{ type: "application/ld+json", children: JSON.stringify(getFAQSchema(WORKFLOW_ID)) }] : []),
    ],
  }),
  component: () => (
    <>
      <WorkflowLandingSection workflowId={WORKFLOW_ID} />
      <DriversLicenseSuspensionWorkspace />
      <WorkflowFAQSection workflowId={WORKFLOW_ID} />
      <RelatedWorkflowsSection workflowId={WORKFLOW_ID} />
    </>
  ),
});
