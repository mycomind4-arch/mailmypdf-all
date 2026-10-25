import { createFileRoute } from "@tanstack/react-router";
import { CreditBureauDisputeIntake } from "../../../shared/CreditBureauDisputeIntake";
import { equifaxDisputeStepWorkflow } from "../step-workflow";

export function EquifaxDisputeStart() {
  return (
    <CreditBureauDisputeIntake
      bureauId="equifax"
      workflow={equifaxDisputeStepWorkflow}
      breadcrumbLabel="Equifax Dispute"
      backHref="/dispute-mail/workflows/equifax-dispute"
    />
  );
}

export const Route = createFileRoute("/dispute-mail/workflows/equifax-dispute/start/")({
  component: EquifaxDisputeStart,
});

export default EquifaxDisputeStart;
