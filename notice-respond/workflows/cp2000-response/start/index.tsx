import { createFileRoute } from "@tanstack/react-router";
import NoticeResponseWorkflow from "../../../shared/NoticeResponseWorkflow";

export function Cp2000ResponseStart() {
  return (
    <NoticeResponseWorkflow
      config={{
        workflowId: "cp2000-response",
      }}
    />
  );
}

export const Route = createFileRoute(
  "/notice-respond/workflows/cp2000-response/start/",
)({
  component: Cp2000ResponseStart,
});

export default Cp2000ResponseStart;
