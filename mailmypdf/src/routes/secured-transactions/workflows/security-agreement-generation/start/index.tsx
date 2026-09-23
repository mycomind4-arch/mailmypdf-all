// Thin file-route mount for the top-level secured-transactions/workflows/security-agreement-generation/start/ implementation.
import { createFileRoute } from "@tanstack/react-router"
import workflowConfig from "../../../../../../../secured-transactions/workflows/security-agreement-generation/config"
import { SecuredTransactionWorkflowStartScaffold } from "../../../../../../../secured-transactions/shared/components/SecuredTransactionWorkflowStartScaffold"

export const Route = createFileRoute("/secured-transactions/workflows/security-agreement-generation/start/")({
  component: () => (
    <SecuredTransactionWorkflowStartScaffold title={workflowConfig.title} description={workflowConfig.heroDescription} />
  ),
})
