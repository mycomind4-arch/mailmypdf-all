import type { CapabilityId } from "./capability-registry.js";
import type { AdapterId } from "./adapter-registry.js";
import type { PipelineId } from "./pipeline-registry.js";
import { validateWorkflowFields, type WorkflowFieldManifest } from "./workflow-fields.js";

export type WorkflowMaturity = "catalog" | "placeholder" | "wired" | "executable" | "gold" | "production-verified";
export type WorkflowCapability = CapabilityId;

export type WorkflowConditionPrimitive = string | number | boolean | null;

export type WorkflowStepCondition =
  | {
      kind: "input_equals" | "input_not_equals";
      path: string;
      value: WorkflowConditionPrimitive;
    }
  | {
      kind: "input_truthy" | "input_falsy";
      path: string;
    }
  | {
      kind: "capability_status";
      capability: WorkflowCapability;
      status: "passed" | "warning" | "blocked" | "failed";
    }
  | {
      kind: "all" | "any";
      conditions: readonly WorkflowStepCondition[];
    };

export type WorkflowStepManifest = {
  id: string;
  title: string;
  description?: string;
  uses: readonly WorkflowCapability[];
  requires?: readonly string[];
  completeWhen?: readonly string[];
  optional?: boolean;
  fields?: readonly WorkflowFieldManifest[];
  when?: WorkflowStepCondition;
};

export type WorkflowDocumentRequirement = {
  id: string;
  label: string;
  role: "primary" | "supporting" | "evidence" | "generated";
  required: boolean;
  acceptedKinds?: readonly string[];
  extractionSchema?: string;
};

export type WorkflowGateKind =
  | "document_ready"
  | "fact_confirmation"
  | "evidence_ready"
  | "human_review"
  | "approval"
  | "payment"
  | "mailing_authorization"
  | "custom";

export type WorkflowGateManifest = {
  id: string;
  kind: WorkflowGateKind;
  label: string;
  beforeCapability?: WorkflowCapability;
  required: boolean;
};

export type WorkflowOutputManifest = {
  id: string;
  kind: "draft" | "pdf" | "packet" | "receipt" | "tracking" | "proof" | "archive" | "other";
  required: boolean;
};

export type WorkflowAcceptanceScenario = {
  id: string;
  description: string;
  required: boolean;
};

export type WorkflowManifest = {
  id: string;
  vertical: string;
  title: string;
  route: string;
  pipeline: PipelineId;
  adapters: readonly AdapterId[];
  requiredCapabilities: readonly WorkflowCapability[];
  optionalCapabilities: readonly WorkflowCapability[];
  notApplicableCapabilities: readonly WorkflowCapability[];
  maturity: WorkflowMaturity;
  primaryInput: "document" | "case" | "event" | "request" | "claim";
  requiresHumanReview: boolean;
  allowsConsequentialAction: boolean;

  /** Optional v2 workflow-definition fields. Existing manifests remain valid. */
  version?: number;
  steps?: readonly WorkflowStepManifest[];
  documents?: readonly WorkflowDocumentRequirement[];
  gates?: readonly WorkflowGateManifest[];
  outputs?: readonly WorkflowOutputManifest[];
  acceptanceScenarios?: readonly WorkflowAcceptanceScenario[];
};

const CONDITION_PATH = /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/;
const FORBIDDEN_CONDITION_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function validateStepCondition(
  condition: WorkflowStepCondition,
  declared: ReadonlySet<WorkflowCapability>,
  priorCapabilities: ReadonlySet<WorkflowCapability>,
  label: string,
): string[] {
  const errors: string[] = [];

  if ("conditions" in condition) {
    if (condition.conditions.length === 0) {
      errors.push(`${label} condition group cannot be empty`);
    }
    for (const nested of condition.conditions) {
      errors.push(...validateStepCondition(nested, declared, priorCapabilities, label));
    }
    return errors;
  }

  if ("capability" in condition) {
    if (!declared.has(condition.capability)) {
      errors.push(`${label} condition references undeclared capability ${condition.capability}`);
    } else if (!priorCapabilities.has(condition.capability)) {
      errors.push(`${label} condition must reference a capability from an earlier step: ${condition.capability}`);
    }
    return errors;
  }

  if (!("path" in condition)) {
    errors.push(`${label} condition is invalid`);
    return errors;
  }

  const path = condition.path;
  if (
    !CONDITION_PATH.test(path) ||
    path
      .split(".")
      .some((segment: string) => FORBIDDEN_CONDITION_PATH_SEGMENTS.has(segment))
  ) {
    errors.push(`${label} condition has invalid input path ${path}`);
  }

  return errors;
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicate = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate];
}

export function validateManifestShape(manifest: WorkflowManifest): string[] {
  const errors: string[] = [];
  if (!manifest.id.trim()) errors.push("id is required");
  if (!manifest.vertical.trim()) errors.push("vertical is required");
  if (!manifest.title.trim()) errors.push("title is required");
  if (!manifest.route.startsWith("/")) errors.push("route must start with /");
  if (manifest.adapters.length === 0 && manifest.pipeline !== "P01_CORE_MAIL") errors.push("domain workflows require at least one adapter");
  if (!manifest.requiresHumanReview && manifest.allowsConsequentialAction) errors.push("consequential workflows must require human review");
  if (duplicates(manifest.requiredCapabilities).length) errors.push("requiredCapabilities contains duplicates");
  if (duplicates(manifest.optionalCapabilities).length) errors.push("optionalCapabilities contains duplicates");
  if (duplicates(manifest.notApplicableCapabilities).length) errors.push("notApplicableCapabilities contains duplicates");

  const required = new Set(manifest.requiredCapabilities);
  const optional = new Set(manifest.optionalCapabilities);
  for (const capability of manifest.notApplicableCapabilities) {
    if (required.has(capability)) errors.push(`capability ${capability} cannot be both required and not applicable`);
    if (optional.has(capability)) errors.push(`capability ${capability} cannot be both optional and not applicable`);
  }

  if (manifest.version !== undefined && (!Number.isInteger(manifest.version) || manifest.version < 1)) {
    errors.push("version must be a positive integer");
  }

  const stepIds = new Set<string>();
  const priorCapabilities = new Set<WorkflowCapability>();
  const declaredCapabilities = new Set<WorkflowCapability>([
    ...manifest.requiredCapabilities,
    ...manifest.optionalCapabilities,
  ]);
  for (const step of manifest.steps ?? []) {
    if (!step.id.trim() || !step.title.trim()) errors.push("workflow steps require id and title");
    if (stepIds.has(step.id)) errors.push(`duplicate workflow step: ${step.id}`);
    stepIds.add(step.id);
    if (step.uses.length === 0) errors.push(`workflow step ${step.id} must use at least one capability`);
    for (const fieldError of validateWorkflowFields(step.fields ?? [])) {
      errors.push(`workflow step ${step.id}: ${fieldError}`);
    }
    if (step.when) {
      errors.push(
        ...validateStepCondition(
          step.when,
          declaredCapabilities,
          priorCapabilities,
          `workflow step ${step.id}`,
        ),
      );
    }
    for (const used of step.uses) {
      if (!required.has(used) && !optional.has(used)) {
        errors.push(`workflow step ${step.id} uses undeclared capability ${used}`);
      }
      priorCapabilities.add(used);
    }
  }

  const gateIds = new Set<string>();
  for (const gate of manifest.gates ?? []) {
    if (!gate.id.trim() || !gate.label.trim()) errors.push("workflow gates require id and label");
    if (gateIds.has(gate.id)) errors.push(`duplicate workflow gate: ${gate.id}`);
    gateIds.add(gate.id);
    if (gate.beforeCapability && !required.has(gate.beforeCapability) && !optional.has(gate.beforeCapability)) {
      errors.push(`workflow gate ${gate.id} targets undeclared capability ${gate.beforeCapability}`);
    }
  }

  if (manifest.allowsConsequentialAction && manifest.gates) {
    const hasReviewGate = manifest.gates.some((gate) => gate.required && (gate.kind === "human_review" || gate.kind === "approval"));
    if (!hasReviewGate) errors.push("v2 consequential workflow must declare a required human-review or approval gate");
  }

  return errors;
}

export function isProductionMaturity(maturity: WorkflowMaturity): boolean {
  return maturity === "production-verified";
}
