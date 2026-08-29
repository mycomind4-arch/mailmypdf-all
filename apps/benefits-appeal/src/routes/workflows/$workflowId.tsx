import { createFileRoute, redirect } from "@tanstack/react-router";
import { APPEAL_CATALOG } from "@/domain/appeal-catalog";

export const Route = createFileRoute("/workflows/$workflowId")({
  beforeLoad: ({ params }) => {
    // Check if it's a catalog slug that maps to a workflow route
    const entry = APPEAL_CATALOG.find((e) => e.slug === params.workflowId);
    if (entry && entry.workflowRoute !== `/workflows/${params.workflowId}`) {
      throw redirect({ to: entry.workflowRoute });
    }
    // If not found, let the 404 handle it
  },
  component: () => null,
});
