import { createFileRoute } from "@tanstack/react-router";
import RecordsRequestWorkflow from "../../../shared/RecordsRequestWorkflow";
import workflow from "../manifest";

export function PublicRecordsRequestStart() {
  return (
    <RecordsRequestWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        recordsSoughtPlaceholder:
          "Identify the public records you want as specifically as possible: record types, subjects, dates, departments, case numbers, addresses, or other locating details.",
      }}
    />
  );
}

export const Route = createFileRoute(
  "/records-request/workflows/public-records-request/start/",
)({
  component: PublicRecordsRequestStart,
});

export default PublicRecordsRequestStart;
