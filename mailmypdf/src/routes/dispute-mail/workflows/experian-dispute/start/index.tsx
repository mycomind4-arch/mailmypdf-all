// Thin file-route mount for the top-level dispute-mail/workflows/experian-dispute/start/
// implementation. The authenticated step-workflow UI itself is owned by
// dispute-mail/shared/CreditBureauDisputeIntake.tsx, driven by the ported
// StepWorkflowDefinition in dispute-mail/workflows/experian-dispute/step-workflow.ts.
import { createFileRoute } from "@tanstack/react-router"
import { CreditBureauDisputeIntake } from "../../../../../../../dispute-mail/shared/CreditBureauDisputeIntake"
import { experianDisputeStepWorkflow } from "../../../../../../../dispute-mail/workflows/experian-dispute/step-workflow"

export const Route = createFileRoute("/dispute-mail/workflows/experian-dispute/start/")({
  component: () => (
    <CreditBureauDisputeIntake
      bureauId="experian"
      workflow={experianDisputeStepWorkflow}
      breadcrumbLabel="Experian Dispute"
      backHref="/dispute-mail/workflows/experian-dispute"
    />
  ),
})
