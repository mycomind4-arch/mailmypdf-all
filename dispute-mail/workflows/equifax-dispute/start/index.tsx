import { createFileRoute } from "@tanstack/react-router";
import { CreditBureauDisputeIntake } from "../../../shared/CreditBureauDisputeIntake";
import { equifaxDisputeStepWorkflow } from "../step-workflow";

export const Route = createFileRoute("/dispute-mail/workflows/equifax-dispute/start/")({
  component: () => (
    <CreditBureauDisputeIntake
      bureauId="equifax"
      workflow={equifaxDisputeStepWorkflow}
      breadcrumbLabel="Equifax Dispute"
      backHref="/dispute-mail/workflows/equifax-dispute"
    />
  ),
});
