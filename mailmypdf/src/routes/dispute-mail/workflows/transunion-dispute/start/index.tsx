// Thin file-route mount for the top-level dispute-mail/workflows/transunion-dispute/start/
// implementation. The authenticated step-workflow UI itself is owned by
// dispute-mail/shared/CreditBureauDisputeIntake.tsx, driven by the ported
// StepWorkflowDefinition in dispute-mail/workflows/transunion-dispute/step-workflow.ts.
import { createFileRoute } from "@tanstack/react-router"
import { CreditBureauDisputeIntake } from "../../../../../../../dispute-mail/shared/CreditBureauDisputeIntake"
import { transunionDisputeStepWorkflow } from "../../../../../../../dispute-mail/workflows/transunion-dispute/step-workflow"

export const Route = createFileRoute("/dispute-mail/workflows/transunion-dispute/start/")({
  component: () => (
    <CreditBureauDisputeIntake
      bureauId="transunion"
      workflow={transunionDisputeStepWorkflow}
      breadcrumbLabel="TransUnion Dispute"
      backHref="/dispute-mail/workflows/transunion-dispute"
    />
  ),
})
