import { createFileRoute } from "@tanstack/react-router";
import { CreditBureauDisputeIntake } from "../../../shared/CreditBureauDisputeIntake";
import { experianDisputeStepWorkflow } from "../step-workflow";

export const Route = createFileRoute("/dispute-mail/workflows/experian-dispute/start/")({
  component: () => (
    <CreditBureauDisputeIntake
      bureauId="experian"
      workflow={experianDisputeStepWorkflow}
      breadcrumbLabel="Experian Dispute"
      backHref="/dispute-mail/workflows/experian-dispute"
    />
  ),
});
