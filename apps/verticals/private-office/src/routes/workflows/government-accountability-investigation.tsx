import { createFileRoute } from "@tanstack/react-router";
import { CompoundWorkflowPage } from "@/components/compound-workflow-page";

export const Route = createFileRoute("/workflows/government-accountability-investigation")({
  head: () => ({
    meta: [
      { title: "Government Accountability Investigation | Private Office" },
      {
        name: "description",
        content:
          "Map agency authority, obtain records and policies, preserve evidence, reconstruct events, identify contradictions, audit procedure, and prepare a governed escalation packet.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: () => <CompoundWorkflowPage workflowId="government-accountability-investigation" />,
});
