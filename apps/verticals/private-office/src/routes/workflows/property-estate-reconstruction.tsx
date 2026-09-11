import { createFileRoute } from "@tanstack/react-router";
import { CompoundWorkflowPage } from "@/components/compound-workflow-page";

export const Route = createFileRoute("/workflows/property-estate-reconstruction")({
  head: () => ({
    meta: [
      { title: "Property & Estate Reconstruction | Private Office" },
      {
        name: "description",
        content:
          "Reconstruct lineage, probate authority, trusts, powers of attorney, deeds, liens, title history, transfer anomalies, notices, and professional handoff.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: () => <CompoundWorkflowPage workflowId="property-estate-reconstruction" />,
});
