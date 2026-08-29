import { composeWorkflow } from "./workflow-factory.js";
import { getPipeline } from "./pipeline-registry.js";
import { getWorkflowAuthorityPage } from "./workflow-page-registry.js";
import type { WorkflowManifest } from "./workflow-manifest.js";

export type WorkflowCertificationResult = {
  workflowId: string;
  valid: boolean;
  checks: readonly {
    id: string;
    passed: boolean;
    message: string;
  }[];
};

export function certifyWorkflowManifest(manifest: WorkflowManifest): WorkflowCertificationResult {
  const checks: { id: string; passed: boolean; message: string }[] = [];
  const composed = composeWorkflow(manifest);

  checks.push({
    id: "factory",
    passed: composed.executable,
    message: composed.executable ? "Workflow composition is valid." : composed.diagnostics.map((d) => d.message).join(" "),
  });

  const pipeline = getPipeline(manifest.pipeline);
  checks.push({
    id: "pipeline",
    passed: Boolean(pipeline),
    message: `Primary pipeline ${manifest.pipeline} is registered.`,
  });

  const page = getWorkflowAuthorityPage(manifest.id);
  checks.push({
    id: "authority-page",
    passed: Boolean(page),
    message: page ? `Authority page registered at ${page.canonicalPath}.` : "Workflow has no registered authority page.",
  });

  const routeMatchesPage = !page || page.canonicalPath === manifest.route;
  checks.push({
    id: "route-contract",
    passed: routeMatchesPage,
    message: routeMatchesPage ? "Workflow route matches authority-page canonical path." : `Route mismatch: ${manifest.route} vs ${page?.canonicalPath}.`,
  });

  const goldEligible = ["gold", "production-verified"].includes(manifest.maturity);
  if (goldEligible) {
    checks.push({
      id: "gold-human-review",
      passed: manifest.requiresHumanReview,
      message: manifest.requiresHumanReview ? "Human review is required." : "Gold workflow is missing mandatory human review.",
    });
    checks.push({
      id: "gold-consequential-gate",
      passed: !manifest.allowsConsequentialAction || manifest.requiresHumanReview,
      message: "Consequential-action gate is explicit.",
    });
  }

  return {
    workflowId: manifest.id,
    valid: checks.every((check) => check.passed),
    checks,
  };
}
