import { composeWorkflow } from "./workflow-factory.js";
import { getPipeline } from "./pipeline-registry.js";
import { certifyWorkflowCapabilities } from "./capability-certification.js";
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

  const capabilities = certifyWorkflowCapabilities(manifest);
  checks.push({
    id: "capability-dependencies",
    passed:
      capabilities.dependencyErrors.length === 0 &&
      capabilities.nonProductionRequired.length === 0,
    message:
      capabilities.dependencyErrors.length === 0 &&
      capabilities.nonProductionRequired.length === 0
        ? "Required capability dependencies are implemented at production status."
        : capabilities.issues.map((issue) => issue.message).join(" "),
  });

  if (manifest.maturity === "production-verified") {
    checks.push({
      id: "production-capability-baseline",
      passed: capabilities.productionBaselineMissing.length === 0,
      message:
        capabilities.productionBaselineMissing.length === 0
          ? "Production capability baseline is complete."
          : `Missing production baseline: ${capabilities.productionBaselineMissing.join(", ")}.`,
    });
  }

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
