import { createFileRoute } from "@tanstack/react-router";
import RecordsRequestWorkflow from "../../../shared/RecordsRequestWorkflow";
import workflow from "../manifest";

export function PublicInformationRequestStart() {
  return (
    <RecordsRequestWorkflow
      config={{
        workflowId: workflow.manifest.id,
        title: workflow.manifest.title,
        recordsSoughtPlaceholder:
          "Describe the public information or records you want using subjects, dates, departments, record types, references, addresses, or other locating details.",
      }}
    />
  );
}

export const Route = createFileRoute(
  "/records-request/workflows/public-information-request/start/",
)({
  component: PublicInformationRequestStart,
});

export default PublicInformationRequestStart;
