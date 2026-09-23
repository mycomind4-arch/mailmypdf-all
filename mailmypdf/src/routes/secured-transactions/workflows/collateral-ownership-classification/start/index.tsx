// Thin file-route mount for the top-level secured-transactions/workflows/collateral-ownership-classification/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import workflowConfig from "../../../../../../../secured-transactions/workflows/collateral-ownership-classification/config"
import { SecuredTransactionWorkflowStartScaffold } from "../../../../../../../secured-transactions/shared/components/SecuredTransactionWorkflowStartScaffold"

export const Route = createFileRoute("/secured-transactions/workflows/collateral-ownership-classification/start/")({
  component: () => (
    <SecuredTransactionWorkflowStartScaffold title={workflowConfig.title} description={workflowConfig.heroDescription} />
  ),
})
