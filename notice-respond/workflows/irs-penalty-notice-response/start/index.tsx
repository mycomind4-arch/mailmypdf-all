import NoticeResponseWorkflow from "../../../shared/NoticeResponseWorkflow";

// Mounted by the authenticated host at
// /dashboard/workflows/notice-respond/irs-penalty-notice-response/start
// (see mailmypdf/src/lib/workflow-start-registry.tsx).
export function IrsPenaltyNoticeResponseStart() {
  return <NoticeResponseWorkflow config={{ workflowId: "irs-penalty-notice-response" }} />;
}

export default IrsPenaltyNoticeResponseStart;
