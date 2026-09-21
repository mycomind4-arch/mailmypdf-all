import { createFileRoute } from "@tanstack/react-router";
import NoticeResponseWorkflow from "../../../../../../../notice-respond/shared/NoticeResponseWorkflow";

export function Cp504ResponseStart() {
  return (
    <NoticeResponseWorkflow
      config={{
        workflowId: "cp504-response",
      }}
    />
  );
}

export const Route = createFileRoute(
  "/notice-respond/workflows/cp504-response/start/",
)({
  component: Cp504ResponseStart,
});

export default Cp504ResponseStart;
