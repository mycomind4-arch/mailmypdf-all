import { createFileRoute } from "@tanstack/react-router";
import NoticeResponseWorkflow from "../../../shared/NoticeResponseWorkflow";

export function Cp14ResponseStart() {
  return (
    <NoticeResponseWorkflow
      config={{
        workflowId: "cp14-response",
      }}
    />
  );
}

export const Route = createFileRoute(
  "/notice-respond/workflows/cp14-response/start/",
)({
  component: Cp14ResponseStart,
});

export default Cp14ResponseStart;
