import { WORKFLOW_REGISTRY } from "./canonical-workflow-registry.js";
import { canonicalChatFactoryReport } from "./chat-execution-registry.js";

const terms = (value: string) => value.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];

/** Private, side-effect-free reuse proposal. It does not infer case facts or publish templates. */
export function planWorkflowFromProblem(
  problem: string,
  availableTools: ReadonlySet<string> | readonly string[],
) {
  const query = new Set(terms(problem.slice(0, 4000)));
  const readiness = new Map(canonicalChatFactoryReport(availableTools).map((entry) => [entry.id, entry]));
  const candidates = WORKFLOW_REGISTRY.map((workflow) => {
    const labelTerms = new Set(terms(`${workflow.label} ${workflow.slug}`));
    const matched = [...query].filter((term) => labelTerms.has(term));
    const exactSlug = problem.toLowerCase().includes(workflow.slug);
    // Form and notice codes such as CP14 are more specific than generic words
    // like "account" or "notice" and must survive long problem descriptions.
    const score = matched.reduce(
      (sum, term) => sum + (/[a-z]/.test(term) && /[0-9]/.test(term) ? 12 : term.length >= 4 ? 2 : 1),
      0,
    ) + (exactSlug ? 20 : 0);
    return { workflow, score, matched, ready: readiness.get(workflow.id)?.chatExecutable === true };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.ready) - Number(a.ready) || a.workflow.id.localeCompare(b.workflow.id))
    .slice(0, 5)
    .map(({ workflow, score, matched, ready }) => Object.freeze({
      id: workflow.id,
      label: workflow.label,
      publicHref: workflow.publicHref,
      chatExecutable: ready,
      matchedTerms: Object.freeze(matched),
      score,
    }));

  return Object.freeze({
    decision: candidates[0]?.chatExecutable && candidates[0].score >= 2
      ? "review-existing-workflow" : "needs-template-review",
    candidates: Object.freeze(candidates),
    // Problem text and any personal details are deliberately absent from the result.
    nextStep: candidates[0]?.chatExecutable && candidates[0].score >= 2
      ? "Review the suggested workflow with the user before creating an owned matter."
      : "A reviewer must assess the problem and supported capabilities before proposing a new workflow.",
  });
}
