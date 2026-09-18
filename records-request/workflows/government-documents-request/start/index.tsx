import { createFileRoute } from "@tanstack/react-router";
import RecordsRequestWorkflow from "../../../shared/RecordsRequestWorkflow";
import workflow from "../manifest";

export function GovernmentDocumentsRequestStart() {
  return (
    <RecordsRequestWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        recordsSoughtPlaceholder:
          "Describe the government documents you want using document types, subjects, dates, departments, case numbers, addresses, or other locating details.",
      }}
    />
  );
}

export const Route = createFileRoute(
  "/records-request/workflows/government-documents-request/start/",
)({
  component: GovernmentDocumentsRequestStart,
});

export default GovernmentDocumentsRequestStart;
