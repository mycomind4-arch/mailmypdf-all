import { createFileRoute } from "@tanstack/react-router";
import InsuranceAppealWorkflow from "../../../shared/InsuranceAppealWorkflow";
import workflow from "../manifest";

export function DentalInsuranceDenialStart() {
  return (
    <InsuranceAppealWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        primaryDocumentLabel: "Dental insurance denial letter",
        sourcePurpose: "claim_denial_notice",
      }}
    />
  );
}

export const Route = createFileRoute("/appeal-mail/workflows/appeal-dental-insurance-denial/start/")({
  component: DentalInsuranceDenialStart,
});

export default DentalInsuranceDenialStart;
