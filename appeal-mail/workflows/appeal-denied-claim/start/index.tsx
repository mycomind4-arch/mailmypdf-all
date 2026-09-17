import InsuranceAppealWorkflow from "../../../shared/InsuranceAppealWorkflow";
import workflow from "../manifest";

export default function DeniedClaimWorkflow() {
  return (
    <InsuranceAppealWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        primaryDocumentLabel: "Claim denial letter",
        sourcePurpose: "claim_denial_notice",
      }}
    />
  );
}
