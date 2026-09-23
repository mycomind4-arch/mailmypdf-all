import { createFileRoute } from "@tanstack/react-router";
import { CreditBureauDisputeIntake } from "../../../shared/CreditBureauDisputeIntake";
import { transunionDisputeStepWorkflow } from "../step-workflow";

export const Route = createFileRoute("/dispute-mail/workflows/transunion-dispute/start/")({
  component: () => (
    <CreditBureauDisputeIntake
      bureauId="transunion"
      workflow={transunionDisputeStepWorkflow}
      breadcrumbLabel="TransUnion Dispute"
      backHref="/dispute-mail/workflows/transunion-dispute"
    />
  ),
});
