import { createFileRoute } from "@tanstack/react-router";
import InsuranceAppealWorkflow from "../../../shared/InsuranceAppealWorkflow";
import workflow from "../manifest";

export function InsuranceCoverageDenialStart() {
  return (
    <InsuranceAppealWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        primaryDocumentLabel: "Insurance coverage denial letter",
        sourcePurpose: "claim_denial_notice",
      }}
    />
  );
}

export const Route = createFileRoute("/appeal-mail/workflows/appeal-insurance-coverage-denial/start/")({
  component: InsuranceCoverageDenialStart,
});

export default InsuranceCoverageDenialStart;
