// Thin file-route mount for the top-level secured-transactions/workflows/ucc1-preparation-authorization/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import workflowConfig from "../../../../../../../secured-transactions/workflows/ucc1-preparation-authorization/config"
import { SecuredTransactionWorkflowStartScaffold } from "../../../../../../../secured-transactions/shared/components/SecuredTransactionWorkflowStartScaffold"

export const Route = createFileRoute("/secured-transactions/workflows/ucc1-preparation-authorization/start/")({
  component: () => (
    <SecuredTransactionWorkflowStartScaffold title={workflowConfig.title} description={workflowConfig.heroDescription} />
  ),
})
