import { createFileRoute } from "@tanstack/react-router";
import InsuranceAppealWorkflow from "../../../shared/InsuranceAppealWorkflow";
import workflow from "../manifest";

export function InsuranceClaimDenialStart() {
  return (
    <InsuranceAppealWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        primaryDocumentLabel: "Insurance claim denial letter",
        sourcePurpose: "claim_denial_notice",
      }}
    />
  );
}

export const Route = createFileRoute("/appeal-mail/workflows/appeal-insurance-claim-denial/start/")({
  component: InsuranceClaimDenialStart,
});

export default InsuranceClaimDenialStart;
