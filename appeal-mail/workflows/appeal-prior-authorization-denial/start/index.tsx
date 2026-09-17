import { createFileRoute } from "@tanstack/react-router";
import InsuranceAppealWorkflow from "../../../shared/InsuranceAppealWorkflow";
import workflow from "../manifest";

export function PriorAuthorizationDenialStart() {
  return (
    <InsuranceAppealWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        primaryDocumentLabel: "Prior authorization denial letter",
        sourcePurpose: "claim_denial_notice",
      }}
    />
  );
}

export const Route = createFileRoute("/appeal-mail/workflows/appeal-prior-authorization-denial/start/")({
  component: PriorAuthorizationDenialStart,
});

export default PriorAuthorizationDenialStart;
