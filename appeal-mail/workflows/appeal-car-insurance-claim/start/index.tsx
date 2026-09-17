import { createFileRoute } from "@tanstack/react-router";
import InsuranceAppealWorkflow from "../../../shared/InsuranceAppealWorkflow";
import workflow from "../manifest";

export function CarInsuranceClaimStart() {
  return (
    <InsuranceAppealWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        primaryDocumentLabel: "Car insurance claim decision",
        sourcePurpose: "auto_claim_decision",
        defaultRequestedOutcome:
          "Reconsider the claim decision based on the policy, confirmed claim facts, and supporting evidence in this appeal.",
      }}
    />
  );
}

export const Route = createFileRoute("/appeal-mail/workflows/appeal-car-insurance-claim/start/")({
  component: CarInsuranceClaimStart,
});

export default CarInsuranceClaimStart;
