import { createFileRoute } from "@tanstack/react-router"
import { AuthenticatedWorkflowBrowser } from "@/components/authenticated-workflow-browser"

export const Route = createFileRoute("/_authenticated/dashboard/workflows/")({
  head: () => ({
    meta: [
      { title: "Workflows — MailMyPDF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <AuthenticatedWorkflowBrowser />,
})
