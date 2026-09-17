import { createFileRoute } from "@tanstack/react-router";
import InsuranceAppealWorkflow from "../../../shared/InsuranceAppealWorkflow";
import workflow from "../manifest";

export function OutOfNetworkDenialStart() {
  return (
    <InsuranceAppealWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        primaryDocumentLabel: "Out-of-network denial letter",
        sourcePurpose: "claim_denial_notice",
      }}
    />
  );
}

export const Route = createFileRoute("/appeal-mail/workflows/appeal-out-of-network-denial/start/")({
  component: OutOfNetworkDenialStart,
});

export default OutOfNetworkDenialStart;
