import NoticeResponseWorkflow from "../../../shared/NoticeResponseWorkflow";

// Mounted by the authenticated host at
// /dashboard/workflows/notice-respond/irs-balance-due-notice-response/start
// (see mailmypdf/src/lib/workflow-start-registry.tsx).
export function IrsBalanceDueNoticeResponseStart() {
  return <NoticeResponseWorkflow config={{ workflowId: "irs-balance-due-notice-response" }} />;
}

export default IrsBalanceDueNoticeResponseStart;
