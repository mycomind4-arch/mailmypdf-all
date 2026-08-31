import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AppealWorkflowWorkspace } from "@/components/workflow/appeal-workflow-workspace";
import { workflows } from "@/domain/workflows";

const workflow = workflows["overpayment"];

export const Route = createFileRoute("/workflows/overpayment")({
  head: () => ({
    meta: [
      { title: workflow.title + " | Benefits Appeal" },
      { name: "description", content: workflow.description },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "https://benefits-appeal.pages.dev/workflows/overpayment" }],
  }),
  component: () => (
    <>
      <SiteHeader />
      <AppealWorkflowWorkspace workflowId="overpayment" />
      <SiteFooter />
    </>
  ),
});
