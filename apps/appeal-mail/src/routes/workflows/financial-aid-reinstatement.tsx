import { createFileRoute } from "@tanstack/react-router";
import { FinancialAidReinstatementWorkspace } from "@/components/workflow/financial-aid-reinstatement-workspace";
import { getWorkflow } from "@/domain/workflows";

export const Route = createFileRoute("/workflows/financial-aid-reinstatement")({
  head: () => ({ meta: [{ title: `${getWorkflow("financial-aid-reinstatement").title} — Appeal Mail` }, { name: "description", content: getWorkflow("financial-aid-reinstatement").description }, { property: "og:title", content: `${getWorkflow("financial-aid-reinstatement").title} — Appeal Mail` }, { property: "og:description", content: getWorkflow("financial-aid-reinstatement").description }, { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: `${getWorkflow("financial-aid-reinstatement").title} — Appeal Mail` }, { name: "twitter:description", content: getWorkflow("financial-aid-reinstatement").description }], links: [{ rel: "canonical", href: "/workflows/financial-aid-reinstatement" }] }),
  component: FinancialAidReinstatementWorkspace,
});
