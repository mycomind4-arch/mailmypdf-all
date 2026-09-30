import { createFileRoute } from "@tanstack/react-router";
import NoticeResponseWorkflow from "../../../shared/NoticeResponseWorkflow";
import { getNoticeResponseFactoryArtifact } from "@mailmypdf/workflows";

const resolvedFactoryArtifact = getNoticeResponseFactoryArtifact("cp14-response");

if (!resolvedFactoryArtifact) {
  throw new Error("CP14 factory artifact is missing");
}
if (!resolvedFactoryArtifact.factoryReady) {
  throw new Error("CP14 factory artifact is not ready");
}

const factoryArtifact = resolvedFactoryArtifact;

export function Cp14ResponseStart() {
  return <NoticeResponseWorkflow config={factoryArtifact.startConfig} />;
}

export const Route = createFileRoute(
  "/notice-respond/workflows/cp14-response/start/",
)({
  component: Cp14ResponseStart,
});

export default Cp14ResponseStart;
