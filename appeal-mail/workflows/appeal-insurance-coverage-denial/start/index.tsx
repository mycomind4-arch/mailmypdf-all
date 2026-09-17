import InsuranceAppealWorkflow from "../../../shared/InsuranceAppealWorkflow";
import workflow from "../manifest";

export default function InsuranceCoverageDenialStart() {
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
