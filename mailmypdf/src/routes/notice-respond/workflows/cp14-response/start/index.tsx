// Thin file-route mount — see ../../../index.tsx (notice-respond section)
// for why this file exists. The authenticated workflow UI itself is owned
// entirely by notice-respond/shared/NoticeResponseWorkflow.tsx.
import { createFileRoute } from "@tanstack/react-router";
import NoticeResponseWorkflow from "../../../../../../../notice-respond/shared/NoticeResponseWorkflow";

export const Route = createFileRoute("/notice-respond/workflows/cp14-response/start/")({
  component: () => <NoticeResponseWorkflow config={{ workflowId: "cp14-response" }} />,
});
