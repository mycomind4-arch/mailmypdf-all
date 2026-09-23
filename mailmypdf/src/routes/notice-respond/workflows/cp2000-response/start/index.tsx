import { createFileRoute } from "@tanstack/react-router"
import { NoticeResponseWorkflow } from "../../../../../../notice-respond/shared/NoticeResponseWorkflow"

export const Route = createFileRoute("/notice-respond/workflows/cp2000-response/start")({
  component: () => <NoticeResponseWorkflow workflowId="cp2000-response" />,
})
