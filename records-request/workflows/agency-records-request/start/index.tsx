import { createFileRoute } from "@tanstack/react-router";
import RecordsRequestWorkflow from "../../../shared/RecordsRequestWorkflow";
import workflow from "../manifest";

export function AgencyRecordsRequestStart() {
  return (
    <RecordsRequestWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        recordsSoughtPlaceholder:
          "Describe the agency records, categories, subjects, dates, case or incident references, and other identifiers that will help locate the records.",
      }}
    />
  );
}

export const Route = createFileRoute(
  "/records-request/workflows/agency-records-request/start/",
)({
  component: AgencyRecordsRequestStart,
});

export default AgencyRecordsRequestStart;
