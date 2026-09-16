import type { WorkflowManifest } from "./workflow-manifest.js";

export type WorkflowAuthoritySourceType =
  | "official_agency"
  | "regulation"
  | "statute"
  | "court_rule"
  | "form_instructions"
  | "official_manual"
  | "other_official";

export interface WorkflowAuthoritySource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: WorkflowAuthoritySourceType;
  reviewedAt: string;
  jurisdiction?: string;
}

export type WorkflowDomainRuleKind =
  | "requirement"
  | "deadline"
  | "eligibility"
  | "evidence"
  | "drafting"
  | "submission";

export interface WorkflowDomainRule {
  id: string;
  label: string;
  kind: WorkflowDomainRuleKind;
  description: string;
  severity: "blocking" | "warning" | "informational";
  authoritySourceIds: readonly string[];
}

export interface WorkflowEvidenceRequirement {
  id: string;
  label: string;
  description: string;
  required: boolean;
  acceptedDocumentKinds?: readonly string[];
  supportsRuleIds?: readonly string[];
}

export type WorkflowAiTaskKind =
  | "classify"
  | "extract"
  | "analyze"
  | "research"
  | "draft"
  | "validate";

export interface WorkflowAiTaskSpec {
  id: string;
  kind: WorkflowAiTaskKind;
  promptVersion: string;
  purpose: string;
  instruction: string;
  sourcePolicy: "document_only" | "matter_record" | "authority_grounded";
  outputSchemaId?: string;
  requiresHumanConfirmation?: boolean;
}

export interface WorkflowDraftingSpec {
  purpose: string;
  templateId: string;
  tone: string;
  requiresSourceBackedClaims: boolean;
  prohibitedClaims: readonly string[];
  requiredSections?: readonly string[];
}

export interface WorkflowDomainSpec {
  workflowId: string;
  version: number;
  authoritySources: readonly WorkflowAuthoritySource[];
  authorityMaxAgeDays: number;
  extractionSchemaIds: readonly string[];
  rules: readonly WorkflowDomainRule[];
  evidenceRequirements: readonly WorkflowEvidenceRequirement[];
  aiTasks: readonly WorkflowAiTaskSpec[];
  drafting?: WorkflowDraftingSpec;
}

export type WorkflowDomainCertificationIssue = {
  code:
    | "invalid_domain_spec"
    | "manifest_mismatch"
    | "missing_extraction_schema"
    | "missing_authority"
    | "stale_authority"
    | "missing_deadline_rule"
    | "missing_requirement_rule"
    | "missing_evidence_definition"
    | "missing_ai_task"
    | "missing_drafting_spec";
  message: string;
};

export type WorkflowDomainCertification = {
  workflowId: string;
  issues: readonly WorkflowDomainCertificationIssue[];
  authorityStaleSourceIds: readonly string[];
  ready: boolean;
};

const ID = /^[a-z0-9][a-z0-9._-]{1,127}$/;

function duplicateIds(values: readonly { id: string }[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) duplicates.add(value.id);
    seen.add(value.id);
  }
  return [...duplicates];
}

function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

export function validateWorkflowDomainSpec(
  spec: WorkflowDomainSpec,
): string[] {
  const errors: string[] = [];

  if (!ID.test(spec.workflowId)) errors.push("workflowId is invalid");
  if (!Number.isInteger(spec.version) || spec.version < 1) {
    errors.push("domain spec version must be a positive integer");
  }
  if (
    !Number.isInteger(spec.authorityMaxAgeDays) ||
    spec.authorityMaxAgeDays < 1 ||
    spec.authorityMaxAgeDays > 3650
  ) {
    errors.push("authorityMaxAgeDays must be between 1 and 3650");
  }

  for (const [label, values] of [
    ["authority source", spec.authoritySources],
    ["rule", spec.rules],
    ["evidence requirement", spec.evidenceRequirements],
    ["AI task", spec.aiTasks],
  ] as const) {
    for (const duplicate of duplicateIds(values)) {
      errors.push(`duplicate ${label}: ${duplicate}`);
    }
  }

  const sourceIds = new Set(spec.authoritySources.map((source) => source.id));
  const ruleIds = new Set(spec.rules.map((rule) => rule.id));
  const extractionSchemaIds = new Set(spec.extractionSchemaIds);

  for (const source of spec.authoritySources) {
    if (!ID.test(source.id)) errors.push(`authority source ${source.id} has invalid id`);
    if (!source.title.trim() || !source.publisher.trim()) {
      errors.push(`authority source ${source.id} requires title and publisher`);
    }
    try {
      const url = new URL(source.url);
      if (url.protocol !== "https:") {
        errors.push(`authority source ${source.id} must use HTTPS`);
      }
    } catch {
      errors.push(`authority source ${source.id} has invalid URL`);
    }
    if (!validCalendarDate(source.reviewedAt)) {
      errors.push(`authority source ${source.id} has invalid reviewedAt`);
    }
  }

  for (const schemaId of spec.extractionSchemaIds) {
    if (!ID.test(schemaId)) errors.push(`extraction schema id is invalid: ${schemaId}`);
  }
  if (extractionSchemaIds.size !== spec.extractionSchemaIds.length) {
    errors.push("extractionSchemaIds contains duplicates");
  }

  for (const rule of spec.rules) {
    if (!ID.test(rule.id) || !rule.label.trim() || !rule.description.trim()) {
      errors.push(`rule ${rule.id} is incomplete`);
    }
    for (const sourceId of rule.authoritySourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`rule ${rule.id} references unknown authority source ${sourceId}`);
      }
    }
  }

  for (const requirement of spec.evidenceRequirements) {
    if (!ID.test(requirement.id) || !requirement.label.trim() || !requirement.description.trim()) {
      errors.push(`evidence requirement ${requirement.id} is incomplete`);
    }
    for (const ruleId of requirement.supportsRuleIds ?? []) {
      if (!ruleIds.has(ruleId)) {
        errors.push(`evidence requirement ${requirement.id} references unknown rule ${ruleId}`);
      }
    }
  }

  for (const task of spec.aiTasks) {
    if (!ID.test(task.id) || !task.promptVersion.trim() || !task.purpose.trim() || !task.instruction.trim()) {
      errors.push(`AI task ${task.id} is incomplete`);
    }
    if (
      task.kind === "extract" &&
      task.outputSchemaId &&
      !extractionSchemaIds.has(task.outputSchemaId)
    ) {
      errors.push(`AI extraction task ${task.id} references unknown extraction schema ${task.outputSchemaId}`);
    }
    if (
      task.sourcePolicy === "authority_grounded" &&
      spec.authoritySources.length === 0
    ) {
      errors.push(`AI task ${task.id} requires authority sources`);
    }
  }

  if (spec.drafting) {
    if (
      !spec.drafting.purpose.trim() ||
      !spec.drafting.templateId.trim() ||
      !spec.drafting.tone.trim()
    ) {
      errors.push("drafting spec is incomplete");
    }
  }

  return errors;
}

export function staleAuthoritySourceIds(
  spec: WorkflowDomainSpec,
  now: string | Date = new Date(),
): string[] {
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid authority freshness reference date");
  const maxAgeMs = spec.authorityMaxAgeDays * 86_400_000;

  return spec.authoritySources
    .filter((source) => {
      const reviewed = Date.parse(`${source.reviewedAt}T00:00:00Z`);
      return !Number.isFinite(reviewed) || nowMs - reviewed > maxAgeMs;
    })
    .map((source) => source.id);
}

function hasCapability(manifest: WorkflowManifest, id: string): boolean {
  return manifest.requiredCapabilities.includes(id as never) ||
    manifest.optionalCapabilities.includes(id as never);
}

export function certifyWorkflowDomain(
  manifest: WorkflowManifest,
  spec: WorkflowDomainSpec,
  now: string | Date = new Date(),
): WorkflowDomainCertification {
  const issues: WorkflowDomainCertificationIssue[] =
    validateWorkflowDomainSpec(spec).map((message) => ({
      code: "invalid_domain_spec" as const,
      message,
    }));

  if (manifest.id !== spec.workflowId) {
    issues.push({
      code: "manifest_mismatch",
      message: `Domain spec ${spec.workflowId} does not match manifest ${manifest.id}`,
    });
  }

  const extractionSchemas = new Set(spec.extractionSchemaIds);
  for (const document of manifest.documents ?? []) {
    if (
      document.extractionSchema &&
      !extractionSchemas.has(document.extractionSchema)
    ) {
      issues.push({
        code: "missing_extraction_schema",
        message:
          `Document ${document.id} references unregistered extraction schema ${document.extractionSchema}`,
      });
    }
  }

  if (hasCapability(manifest, "research") && spec.authoritySources.length === 0) {
    issues.push({
      code: "missing_authority",
      message: "Research-enabled workflow must declare official authority sources",
    });
  }

  if (
    hasCapability(manifest, "deadlines") &&
    !spec.rules.some((rule) => rule.kind === "deadline")
  ) {
    issues.push({
      code: "missing_deadline_rule",
      message: "Deadline-enabled workflow must declare at least one deadline rule",
    });
  }

  if (
    hasCapability(manifest, "requirements") &&
    !spec.rules.some((rule) => rule.kind === "requirement")
  ) {
    issues.push({
      code: "missing_requirement_rule",
      message: "Requirements-enabled workflow must declare at least one requirement rule",
    });
  }

  if (
    hasCapability(manifest, "evidence") &&
    spec.evidenceRequirements.length === 0
  ) {
    issues.push({
      code: "missing_evidence_definition",
      message: "Evidence-enabled workflow must declare evidence requirements",
    });
  }

  const requiredAiKinds = new Set<WorkflowAiTaskKind>();
  if (hasCapability(manifest, "classification")) requiredAiKinds.add("classify");
  if (hasCapability(manifest, "extraction")) requiredAiKinds.add("extract");
  if (hasCapability(manifest, "research")) requiredAiKinds.add("research");
  if (hasCapability(manifest, "draft")) requiredAiKinds.add("draft");
  if (hasCapability(manifest, "validation")) requiredAiKinds.add("validate");

  for (const kind of requiredAiKinds) {
    if (!spec.aiTasks.some((task) => task.kind === kind)) {
      issues.push({
        code: "missing_ai_task",
        message: `Workflow capability requires a versioned ${kind} AI task`,
      });
    }
  }

  if (hasCapability(manifest, "draft") && !spec.drafting) {
    issues.push({
      code: "missing_drafting_spec",
      message: "Draft-enabled workflow must declare drafting constraints",
    });
  }

  const stale = staleAuthoritySourceIds(spec, now);
  if (
    stale.length > 0 &&
    (manifest.maturity === "gold" || manifest.maturity === "production-verified")
  ) {
    for (const sourceId of stale) {
      issues.push({
        code: "stale_authority",
        message: `Authority source ${sourceId} exceeds freshness policy`,
      });
    }
  }

  return {
    workflowId: manifest.id,
    issues,
    authorityStaleSourceIds: stale,
    ready: issues.length === 0,
  };
}

export function defineWorkflowDomainSpec(
  spec: WorkflowDomainSpec,
): Readonly<WorkflowDomainSpec> {
  const errors = validateWorkflowDomainSpec(spec);
  if (errors.length) throw new Error(errors.join("\n"));
  return Object.freeze({
    ...spec,
    authoritySources: Object.freeze([...spec.authoritySources]),
    extractionSchemaIds: Object.freeze([...spec.extractionSchemaIds]),
    rules: Object.freeze([...spec.rules]),
    evidenceRequirements: Object.freeze([...spec.evidenceRequirements]),
    aiTasks: Object.freeze([...spec.aiTasks]),
  });
}
