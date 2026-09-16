import type { AdapterId } from "./adapter-registry.js";
import {
  capabilityDependencies,
  capabilityIds,
  type CapabilityId,
} from "./capability-registry.js";
import { defineWorkflow, type DefinedWorkflow } from "./define-workflow.js";
import { PIPELINE_STAGE_TO_CAPABILITY } from "./workflow-factory.js";
import {
  getPipeline,
  type PipelineId,
} from "./pipeline-registry.js";
import type {
  WorkflowAcceptanceScenario,
  WorkflowDocumentRequirement,
  WorkflowGateManifest,
  WorkflowManifest,
  WorkflowMaturity,
  WorkflowOutputManifest,
  WorkflowStepManifest,
} from "./workflow-manifest.js";

export type WorkflowArchetype =
  | "simple-mail"
  | "official-response"
  | "appeal"
  | "court-response"
  | "immigration-response"
  | "dispute"
  | "business-correspondence"
  | "records-request"
  | "regulatory-response"
  | "claim-proof";

export type WorkflowCommerceMode = "paid" | "free" | "none";

export interface WorkflowBlueprintDefinition {
  id: WorkflowArchetype;
  pipeline: PipelineId;
  primaryInput: WorkflowManifest["primaryInput"];
  description: string;
}

export const WORKFLOW_BLUEPRINTS: Readonly<
  Record<WorkflowArchetype, WorkflowBlueprintDefinition>
> = {
  "simple-mail": {
    id: "simple-mail",
    pipeline: "P01_CORE_MAIL",
    primaryInput: "document",
    description: "Simple document/letter preparation and mailing.",
  },
  "official-response": {
    id: "official-response",
    pipeline: "P02_OFFICIAL_RESPONSE",
    primaryInput: "document",
    description: "Official notice or agency response driven by a source document.",
  },
  appeal: {
    id: "appeal",
    pipeline: "P03_APPEAL",
    primaryInput: "document",
    description: "Adverse decision appeal or reconsideration.",
  },
  "court-response": {
    id: "court-response",
    pipeline: "P04_COURT",
    primaryInput: "document",
    description: "Procedure-sensitive court or formal proceeding response.",
  },
  "immigration-response": {
    id: "immigration-response",
    pipeline: "P05_IMMIGRATION",
    primaryInput: "document",
    description: "Immigration notice/evidence response.",
  },
  dispute: {
    id: "dispute",
    pipeline: "P06_DISPUTE",
    primaryInput: "document",
    description: "Evidence-heavy dispute/investigation correspondence.",
  },
  "business-correspondence": {
    id: "business-correspondence",
    pipeline: "P07_BUSINESS_AUTOMATION",
    primaryInput: "event",
    description: "Trigger-driven business correspondence.",
  },
  "records-request": {
    id: "records-request",
    pipeline: "P08_RECORDS",
    primaryInput: "request",
    description: "Records/information request with authority and proof.",
  },
  "regulatory-response": {
    id: "regulatory-response",
    pipeline: "P09_REGULATORY",
    primaryInput: "document",
    description: "Permit, licensing, compliance, housing, or regulatory response.",
  },
  "claim-proof": {
    id: "claim-proof",
    pipeline: "P10_CLAIM_PROOF",
    primaryInput: "claim",
    description: "Evidence/proof package with a defensible record.",
  },
};

export interface BuildWorkflowFromBlueprintInput {
  id: string;
  vertical: string;
  title: string;
  route: string;
  archetype: WorkflowArchetype;
  adapters: readonly AdapterId[];
  maturity?: WorkflowMaturity;
  commerce?: WorkflowCommerceMode;
  primaryInput?: WorkflowManifest["primaryInput"];
  additionalRequiredCapabilities?: readonly CapabilityId[];
  additionalOptionalCapabilities?: readonly CapabilityId[];
  documents?: readonly WorkflowDocumentRequirement[];
  acceptanceScenarios?: readonly WorkflowAcceptanceScenario[];
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function capabilitiesForStages(stages: readonly string[]): CapabilityId[] {
  return unique(
    stages
      .map((stage) => PIPELINE_STAGE_TO_CAPABILITY[stage])
      .filter((value): value is CapabilityId => Boolean(value)),
  );
}

function has(
  capabilities: ReadonlySet<CapabilityId>,
  id: CapabilityId,
): boolean {
  return capabilities.has(id);
}

function addDependencyClosure(capabilities: Set<CapabilityId>): void {
  const queue = [...capabilities];
  while (queue.length) {
    const current = queue.shift()!;
    for (const dependency of capabilityDependencies(current)) {
      if (capabilities.has(dependency)) continue;
      capabilities.add(dependency);
      queue.push(dependency);
    }
  }
}

function buildSteps(capabilities: ReadonlySet<CapabilityId>): WorkflowStepManifest[] {
  const steps: WorkflowStepManifest[] = [];

  const add = (
    id: string,
    title: string,
    uses: readonly CapabilityId[],
    description?: string,
  ) => {
    const selected = unique(uses.filter((capability) => capabilities.has(capability)));
    if (!selected.length) return;
    steps.push({ id, title, description, uses: selected });
  };

  add(
    "intake",
    "Matter intake",
    ["identity", "matterState", "security"],
    "Open the matter and establish the authorized workspace.",
  );

  add(
    "documents",
    "Documents",
    [
      "secureUpload",
      "documentStorage",
      "documentScanning",
      "classification",
      "extraction",
      "visionAnalysis",
      "understand",
    ],
    "Securely collect, scan, classify, extract, and understand source documents.",
  );

  add(
    "analysis",
    "Analysis",
    [
      "facts",
      "provenance",
      "timeline",
      "deadlines",
      "findings",
      "contradictions",
      "discrepancies",
      "requirements",
      "research",
      "risk",
    ],
    "Build the source-backed matter record and identify unresolved issues.",
  );

  add(
    "evidence",
    "Evidence",
    ["evidence"],
    "Organize supporting records and identify gaps.",
  );

  add(
    "strategy",
    "Strategy",
    ["strategy"],
    "Translate verified matter state into the next response strategy.",
  );

  add(
    "draft",
    "Draft",
    ["draft", "draftProvenance"],
    "Generate a draft constrained by verified facts and source provenance.",
  );

  add(
    "review",
    "Review",
    ["validation", "blockingGate", "humanReview", "approval"],
    "Resolve warnings, review the exact output, and explicitly approve it.",
  );

  add(
    "checkout",
    "Checkout",
    ["pricing", "payment"],
    "Calculate the server-authoritative quote and complete payment.",
  );

  add(
    "mail",
    "Mail & proof",
    [
      "pdfGeneration",
      "packetAssembly",
      "addressVerification",
      "mailing",
      "tracking",
      "proofAudit",
      "archive",
      "notifications",
    ],
    "Create the approved packet, mail it once, and preserve tracking and proof.",
  );

  return steps;
}

function buildGates(
  capabilities: ReadonlySet<CapabilityId>,
): WorkflowGateManifest[] {
  const gates: WorkflowGateManifest[] = [];

  if (has(capabilities, "approval")) {
    gates.push({
      id: "review-approved",
      kind: "human_review",
      label: "Owner reviewed and approved the final matter output",
      beforeCapability: "approval",
      required: true,
    });
  }

  if (has(capabilities, "payment")) {
    gates.push({
      id: "payment-authorized",
      kind: "payment",
      label: "Owner explicitly authorized checkout/payment",
      beforeCapability: "payment",
      required: true,
    });
  }

  if (has(capabilities, "mailing")) {
    gates.push({
      id: "mail-authorized",
      kind: "mailing_authorization",
      label: "Owner explicitly authorized the exact final packet for mailing",
      beforeCapability: "mailing",
      required: true,
    });
  }

  return gates;
}

function buildOutputs(
  capabilities: ReadonlySet<CapabilityId>,
): WorkflowOutputManifest[] {
  const outputs: WorkflowOutputManifest[] = [];

  if (has(capabilities, "draft")) {
    outputs.push({ id: "approved-draft", kind: "draft", required: true });
  }
  if (has(capabilities, "pdfGeneration")) {
    outputs.push({ id: "response-pdf", kind: "pdf", required: true });
  }
  if (has(capabilities, "packetAssembly")) {
    outputs.push({ id: "final-packet", kind: "packet", required: true });
  }
  if (has(capabilities, "payment")) {
    outputs.push({ id: "payment-receipt", kind: "receipt", required: true });
  }
  if (has(capabilities, "tracking")) {
    outputs.push({ id: "tracking-record", kind: "tracking", required: true });
  }
  if (has(capabilities, "proofAudit")) {
    outputs.push({ id: "proof-bundle", kind: "proof", required: true });
  }
  if (has(capabilities, "archive")) {
    outputs.push({ id: "matter-archive", kind: "archive", required: true });
  }

  return outputs;
}

const DEFAULT_ACCEPTANCE_SCENARIOS: readonly WorkflowAcceptanceScenario[] = [
  {
    id: "happy-path",
    description: "Complete the workflow from intake through final output.",
    required: true,
  },
  {
    id: "missing-required-document",
    description: "A required source document is missing and the workflow must block safely.",
    required: true,
  },
  {
    id: "low-confidence-extraction",
    description: "Low-confidence or inferred document values require explicit review.",
    required: true,
  },
  {
    id: "idempotent-fulfillment",
    description: "Repeated payment/webhook/fulfillment events must not create a duplicate mailing.",
    required: true,
  },
];

export function buildWorkflowManifest(
  input: BuildWorkflowFromBlueprintInput,
): WorkflowManifest {
  const blueprint = WORKFLOW_BLUEPRINTS[input.archetype];
  const pipeline = getPipeline(blueprint.pipeline);

  const required = new Set<CapabilityId>([
    ...capabilitiesForStages(pipeline.requiredStages),
    "identity",
    "matterState",
    "security",
    "resilience",
    "observability",
    "acceptanceTesting",
  ]);

  const primaryInput = input.primaryInput ?? blueprint.primaryInput;

  if (primaryInput === "document") {
    for (const id of [
      "secureUpload",
      "documentStorage",
      "documentScanning",
      "retention",
      "visionAnalysis",
      "understand",
      "facts",
      "provenance",
    ] as const) required.add(id);
  }

  // AI execution is a platform dependency for the intelligence/drafting stages.
  if (
    [
      "classification",
      "extraction",
      "visionAnalysis",
      "research",
      "strategy",
      "draft",
    ].some((id) => required.has(id as CapabilityId))
  ) {
    required.add("aiExecution");
  }

  if (required.has("deadlines")) required.add("notifications");

  if (required.has("mailing")) {
    for (const id of [
      "humanReview",
      "approval",
      "pdfGeneration",
      "packetAssembly",
      "addressVerification",
      "tracking",
      "proofAudit",
      "archive",
    ] as const) required.add(id);
  }

  const commerce = input.commerce ?? "paid";
  if (commerce === "paid") {
    required.add("pricing");
    required.add("payment");
    required.add("approval");
  }

  for (const id of input.additionalRequiredCapabilities ?? []) required.add(id);

  // Capabilities declare their own prerequisites. Resolve them transitively so
  // workflow authors never have to know infrastructure dependency trivia.
  addDependencyClosure(required);

  const optional = new Set<CapabilityId>([
    ...capabilitiesForStages(pipeline.optionalStages),
    ...(input.additionalOptionalCapabilities ?? []),
  ]);

  // Optional features must also have their prerequisites available if enabled.
  const optionalDependencyClosure = new Set(optional);
  addDependencyClosure(optionalDependencyClosure);
  for (const dependency of optionalDependencyClosure) {
    if (!optional.has(dependency)) required.add(dependency);
  }
  addDependencyClosure(required);

  // Never declare a capability both required and optional.
  for (const id of required) optional.delete(id);

  const capabilitySet = new Set<CapabilityId>([...required, ...optional]);

  const manifest: WorkflowManifest = {
    id: input.id,
    vertical: input.vertical,
    title: input.title,
    route: input.route,
    pipeline: blueprint.pipeline,
    adapters: [...input.adapters],
    requiredCapabilities: [...required],
    optionalCapabilities: [...optional],
    notApplicableCapabilities: [],
    maturity: input.maturity ?? "wired",
    primaryInput,
    requiresHumanReview: required.has("humanReview"),
    allowsConsequentialAction:
      required.has("payment") || required.has("mailing") || required.has("approval"),
    version: 2,
    steps: buildSteps(capabilitySet),
    documents: [...(input.documents ?? [])],
    gates: buildGates(capabilitySet),
    outputs: buildOutputs(capabilitySet),
    acceptanceScenarios: [
      ...(input.acceptanceScenarios ?? DEFAULT_ACCEPTANCE_SCENARIOS),
    ],
  };

  // Guard future registry drift: all emitted values must still be canonical IDs.
  for (const id of [...manifest.requiredCapabilities, ...manifest.optionalCapabilities]) {
    if (!capabilityIds.includes(id)) throw new Error(`Unknown generated capability: ${id}`);
  }

  return manifest;
}

export function defineWorkflowFromBlueprint(
  input: BuildWorkflowFromBlueprintInput,
): DefinedWorkflow {
  return defineWorkflow(buildWorkflowManifest(input));
}
