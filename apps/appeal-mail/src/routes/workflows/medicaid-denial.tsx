import { createFileRoute } from "@tanstack/react-router";
import { MedicaidDenialWorkspace } from "@/components/workflow/medicaid-denial-workspace";
import { getWorkflow } from "@/domain/workflows";

export const Route = createFileRoute("/workflows/medicaid-denial")({
  head: () => ({ meta: [
    { title: `${getWorkflow("medicaid-denial").title} — Appeal Mail` },
    { name: "description", content: getWorkflow("medicaid-denial").description },
    { property: "og:title", content: `${getWorkflow("medicaid-denial").title} — Appeal Mail` }, { property: "og:description", content: getWorkflow("medicaid-denial").description }, { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: `${getWorkflow("medicaid-denial").title} — Appeal Mail` }, { name: "twitter:description", content: getWorkflow("medicaid-denial").description },
  ], links: [{ rel: "canonical", href: "/workflows/medicaid-denial" }] }),
  component: () => <MedicaidDenialWorkspace />,
});
