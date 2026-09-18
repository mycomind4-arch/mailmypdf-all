import {
  createRecordsRequestRuntimePolicy,
  type RecordsRequestRuntimeWorkflowId,
} from "@mailmypdf/workflows";

export const AGENCY_RECORDS_REQUEST_WORKFLOW_ID: RecordsRequestRuntimeWorkflowId =
  "agency-records-request";
export const RECORDS_REQUEST_VERTICAL_ID = "records-request";

export const agencyRecordsRequestRuntimePolicy =
  createRecordsRequestRuntimePolicy(AGENCY_RECORDS_REQUEST_WORKFLOW_ID);

export default agencyRecordsRequestRuntimePolicy;
