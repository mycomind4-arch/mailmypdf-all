import { createFileRoute } from "@tanstack/react-router";
import RecordsRequestWorkflow from "../../../shared/RecordsRequestWorkflow";
import workflow from "../manifest";

export function OpenRecordsRequestStart() {
  return (
    <RecordsRequestWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        recordsSoughtPlaceholder:
          "Describe the open records you want using record types, subjects, dates, departments, case numbers, addresses, or other locating details.",
      }}
    />
  );
}

export const Route = createFileRoute(
  "/records-request/workflows/open-records-request/start/",
)({
  component: OpenRecordsRequestStart,
});

export default OpenRecordsRequestStart;
