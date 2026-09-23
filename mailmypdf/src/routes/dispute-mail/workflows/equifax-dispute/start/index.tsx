// Thin file-route mount for the top-level dispute-mail/workflows/equifax-dispute/start/
// implementation. The authenticated step-workflow UI itself is owned by
// dispute-mail/shared/CreditBureauDisputeIntake.tsx, driven by the ported
// StepWorkflowDefinition in dispute-mail/workflows/equifax-dispute/step-workflow.ts.
import { createFileRoute } from "@tanstack/react-router"
import { CreditBureauDisputeIntake } from "../../../../../../../dispute-mail/shared/CreditBureauDisputeIntake"
import { equifaxDisputeStepWorkflow } from "../../../../../../../dispute-mail/workflows/equifax-dispute/step-workflow"

export const Route = createFileRoute("/dispute-mail/workflows/equifax-dispute/start/")({
  component: () => (
    <CreditBureauDisputeIntake
      bureauId="equifax"
      workflow={equifaxDisputeStepWorkflow}
      breadcrumbLabel="Equifax Dispute"
      backHref="/dispute-mail/workflows/equifax-dispute"
    />
  ),
})
