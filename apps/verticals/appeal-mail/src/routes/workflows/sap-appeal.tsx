import { createFileRoute } from "@tanstack/react-router";
import { SapAppealWorkspace } from "@/components/workflow/sap-appeal-workspace";
import { getWorkflow } from "@/domain/workflows";

export const Route = createFileRoute("/workflows/sap-appeal")({
  head: () => ({ meta: [{ title: `${getWorkflow("sap-appeal").title} — Appeal Mail` }, { name: "description", content: getWorkflow("sap-appeal").description }, { property: "og:title", content: `${getWorkflow("sap-appeal").title} — Appeal Mail` }, { property: "og:description", content: getWorkflow("sap-appeal").description }, { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: `${getWorkflow("sap-appeal").title} — Appeal Mail` }, { name: "twitter:description", content: getWorkflow("sap-appeal").description }], links: [{ rel: "canonical", href: "/workflows/sap-appeal" }] }),
  component: SapAppealWorkspace,
});
