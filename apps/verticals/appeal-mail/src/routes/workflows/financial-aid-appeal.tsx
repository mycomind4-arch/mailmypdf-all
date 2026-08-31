import { createFileRoute } from "@tanstack/react-router";
import { FinancialAidAppealWorkspace } from "@/components/workflow/financial-aid-appeal-workspace";
import { constructWorkflow } from "@/domain/workflow-capabilities";
import { evaluateGoldStandardGate } from "@/domain/gold-standard-gate";
import { workflows } from "@/domain/workflows";

export const Route = createFileRoute("/workflows/financial-aid-appeal")({
  head: () => ({ meta: [{ title: "Financial Aid Appeal — Appeal Mail" }, { name: "description", content: "Upload a financial-aid decision, build a documented appeal, review it, and prepare it for mailing." }, { property: "og:title", content: "Financial Aid Appeal — Appeal Mail — Appeal Mail" }, { property: "og:description", content: "Upload a financial-aid decision, build a documented appeal, review it, and prepare it for mailing." }, { name: "twitter:card", content: "summary" }, { name: "twitter:title", content: "Financial Aid Appeal — Appeal Mail — Appeal Mail" }, { name: "twitter:description", content: "Upload a financial-aid decision, build a documented appeal, review it, and prepare it for mailing." }], links: [{ rel: "canonical", href: "/workflows/financial-aid-appeal" }] }),
  component: Page,
});

function Page() {
  const constructed = constructWorkflow(workflows["financial-aid-appeal"]);
  const gate = evaluateGoldStandardGate(constructed);
  if (!gate.passed) return <main className="min-h-screen bg-paper px-6 py-20"><div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-2xl font-semibold text-amber-900">This workflow is temporarily unavailable</h1><p className="mt-3 text-sm text-amber-800">The production execution gate is not satisfied.</p>{gate.blockingReasons.map((reason) => <div key={reason} className="mt-2 text-sm text-amber-800">{reason}</div>)}</div></main>;
  return <FinancialAidAppealWorkspace />;
}
