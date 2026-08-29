import { createFileRoute } from "@tanstack/react-router";
import { GovernmentDecisionWorkspace } from "@/components/workflow/government-decision-workspace";
import { getWorkflow } from "@/domain/workflows";

export const Route = createFileRoute("/workflows/government-decision")({
  head: () => ({ meta: [{ title: `${getWorkflow("government-decision").title} — Appeal Mail` }, { name: "description", content: getWorkflow("government-decision").description }, { property: "og:title", content: `${getWorkflow("government-decision").title} — Appeal Mail` }, { property: "og:description", content: getWorkflow("government-decision").description }, { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: `${getWorkflow("government-decision").title} — Appeal Mail` }, { name: "twitter:description", content: getWorkflow("government-decision").description }], links: [{ rel: "canonical", href: "/workflows/government-decision" }] }),
  component: GovernmentDecisionWorkspace,
});
