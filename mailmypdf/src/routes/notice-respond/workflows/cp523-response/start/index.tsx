import { createFileRoute } from "@tanstack/react-router"
import { NoticeResponseWorkflow } from "../../../../../../notice-respond/shared/NoticeResponseWorkflow"

export const Route = createFileRoute("/notice-respond/workflows/cp523-response/start")({
  component: () => <NoticeResponseWorkflow workflowId="cp523-response" />,
})
