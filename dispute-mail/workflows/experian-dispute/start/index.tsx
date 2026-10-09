import { createFileRoute } from "@tanstack/react-router";
import { CreditBureauDisputeIntake } from "../../../shared/CreditBureauDisputeIntake";
import { experianDisputeStepWorkflow } from "../step-workflow";

export function ExperianDisputeStart() {
  return (
    <CreditBureauDisputeIntake
      bureauId="experian"
      workflow={experianDisputeStepWorkflow}
      breadcrumbLabel="Experian Dispute"
      backHref="/dispute-mail/workflows/experian-dispute"
    />
  );
}

export const Route = createFileRoute("/dispute-mail/workflows/experian-dispute/start/")({
  component: ExperianDisputeStart,
});

export default ExperianDisputeStart;
