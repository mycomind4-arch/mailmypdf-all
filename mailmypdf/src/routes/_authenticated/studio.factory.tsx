import { createFileRoute, redirect } from "@tanstack/react-router";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import { WorkflowFactoryPage } from "@/components/WorkflowFactoryPage";

export const Route = createFileRoute("/_authenticated/studio/factory")({
  beforeLoad: async () => {
    const { isAdmin } = await isCurrentUserAdmin();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Workflow Factory — MailMyPDF Studio" }, { name: "robots", content: "noindex" }] }),
  component: WorkflowFactoryPage,
});
