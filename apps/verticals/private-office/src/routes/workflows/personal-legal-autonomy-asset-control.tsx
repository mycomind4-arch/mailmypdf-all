import { createFileRoute } from "@tanstack/react-router";
import { CompoundWorkflowPage } from "@/components/compound-workflow-page";

export const Route = createFileRoute("/workflows/personal-legal-autonomy-asset-control")({
  head: () => ({
    meta: [
      { title: "Personal Legal Autonomy & Asset Control | Private Office" },
      {
        name: "description",
        content:
          "Build a lawful control map for identity records, property, entities, trusts, delegated authority, contracts, privacy, succession, notices, and proof.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: () => <CompoundWorkflowPage workflowId="personal-legal-autonomy-asset-control" />,
});
