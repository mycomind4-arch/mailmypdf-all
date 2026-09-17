import { createFileRoute } from "@tanstack/react-router";
import InsuranceAppealWorkflow from "../../../shared/InsuranceAppealWorkflow";
import workflow from "../manifest";

export function TimelyFilingDenialStart() {
  return (
    <InsuranceAppealWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        primaryDocumentLabel: "Timely filing denial letter",
        sourcePurpose: "timely_filing_denial_notice",
        defaultRequestedOutcome:
          "Reconsider the timely filing denial based on the controlling filing rule, confirmed submission facts, and supporting evidence.",
      }}
    />
  );
}

export const Route = createFileRoute("/appeal-mail/workflows/appeal-timely-filing-denial/start/")({
  component: TimelyFilingDenialStart,
});

export default TimelyFilingDenialStart;
