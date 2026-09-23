// Thin file-route mount for the top-level secured-transactions/workflows/attachment-certification/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import workflowConfig from "../../../../../../../secured-transactions/workflows/attachment-certification/config"
import { SecuredTransactionWorkflowStartScaffold } from "../../../../../../../secured-transactions/shared/components/SecuredTransactionWorkflowStartScaffold"

export const Route = createFileRoute("/secured-transactions/workflows/attachment-certification/start/")({
  component: () => (
    <SecuredTransactionWorkflowStartScaffold title={workflowConfig.title} description={workflowConfig.heroDescription} />
  ),
})
