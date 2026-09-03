import { createFileRoute } from "@tanstack/react-router";
import { CaseWorkspace } from "@/components/case-workspace";

export const Route = createFileRoute("/case/$caseId")({
  head: () => ({ meta: [
    { title: "Case Workspace — Appeal Mail" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { caseId } = Route.useParams();
  return <CaseWorkspace caseId={caseId} />;
}
