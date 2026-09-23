import { createFileRoute } from "@tanstack/react-router"
import { NoticeResponseWorkflow } from "../../../../../../notice-respond/shared/NoticeResponseWorkflow"

export const Route = createFileRoute("/notice-respond/workflows/irs-penalty-notice-response/start")({
  component: () => <NoticeResponseWorkflow workflowId="irs-penalty-notice-response" />,
})
