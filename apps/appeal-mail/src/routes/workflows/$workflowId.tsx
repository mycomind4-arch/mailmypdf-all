import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppealWorkflowWorkspace } from "@/components/workflow/appeal-workflow-workspace";
import { SsiDenialWorkspace } from "@/components/workflow/ssi-denial-workspace";
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
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: workflow.title,
            description: desc,
            provider: {
              "@type": "Organization",
              name: "Appeal Mail",
              url: "/",
            },
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
              { "@type": "ListItem", position: 3, name: workflow.title, item: `/workflows/${params.workflowId}` },
            ],
          }),
        },
      ],
    };
  },
  component: WorkflowRoute,
});
function WorkflowRoute(){const {workflowId}=Route.useParams();if(!isWorkflowId(workflowId))return <Navigate to="/workflows/denied-claim"/>;if(workflowId==="ssi-denial")return <SsiDenialWorkspace/>;return <AppealWorkflowWorkspace workflowId={workflowId}/>;}
