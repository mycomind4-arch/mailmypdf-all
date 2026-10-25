import { createRoot } from "react-dom/client";
import { WorkflowFactoryPage } from "../../../src/components/WorkflowFactoryPage";
import "../../../src/styles.css";

const entries = [
  { id: "notice-respond/cp14-response", maturity: "executable", policyFamily: "notice-response", chatExecutable: true, reason: "certified", diagnostics: [] },
  { id: "appeal-mail/appeal-ssdi-denial", maturity: "executable", policyFamily: "ssa-reconsideration", chatExecutable: false, reason: "chat-contract-not-registered", diagnostics: [] },
];
const request = async (path: string) => {
  await new Promise((resolve) => setTimeout(resolve, 180));
  if (location.search.includes("error=1")) throw new Error("Could not load the factory. Try again.");
  if (path.endsWith("readiness")) return { total: 441, chatExecutable: 21, awaitingChatContract: 3, workflows: entries };
  return {
    decision: "review-existing-workflow" as const,
    nextStep: "Review the suggested workflow with the user before creating an owned matter.",
    candidates: [{ id: entries[0].id, label: "CP14 Response", publicHref: "/notice-respond/workflows/cp14-response", chatExecutable: true, matchedTerms: ["cp14"], score: 12 }],
  };
};

createRoot(document.getElementById("root")!).render(<WorkflowFactoryPage request={request} />);
