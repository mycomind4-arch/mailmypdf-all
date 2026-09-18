import { createFileRoute } from "@tanstack/react-router";
import workflowConfig from "../config";
import { SecuredTransactionWorkflowStartScaffold } from "../../../shared/components/SecuredTransactionWorkflowStartScaffold";

export const Route = createFileRoute("/secured-transactions/workflows/secured-transaction-eligibility/start/")({
  component: () => (
    <SecuredTransactionWorkflowStartScaffold
      title={workflowConfig.title}
      description={workflowConfig.heroDescription}
    />
  ),
});
