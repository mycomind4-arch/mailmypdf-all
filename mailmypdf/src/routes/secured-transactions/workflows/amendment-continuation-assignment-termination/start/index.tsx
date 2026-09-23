// Thin file-route mount for the top-level secured-transactions/workflows/amendment-continuation-assignment-termination/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import workflowConfig from "../../../../../../../secured-transactions/workflows/amendment-continuation-assignment-termination/config"
import { SecuredTransactionWorkflowStartScaffold } from "../../../../../../../secured-transactions/shared/components/SecuredTransactionWorkflowStartScaffold"

export const Route = createFileRoute("/secured-transactions/workflows/amendment-continuation-assignment-termination/start/")({
  component: () => (
    <SecuredTransactionWorkflowStartScaffold title={workflowConfig.title} description={workflowConfig.heroDescription} />
  ),
})
