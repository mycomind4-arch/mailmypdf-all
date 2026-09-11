import { createFileRoute } from "@tanstack/react-router";
import { CompoundWorkflowPage } from "@/components/compound-workflow-page";

export const Route = createFileRoute("/workflows/government-accusation-defense")({
  head: () => ({
    meta: [
      { title: "Government Accusation Defense Preparation | Private Office" },
      {
        name: "description",
        content:
          "Organize an accusation, authority, deadlines, evidence, records, contradictions, procedure issues, hearing preparation, and attorney handoff in one governed Private Office matter.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: () => <CompoundWorkflowPage workflowId="government-accusation-defense" />,
});
