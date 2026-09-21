export type StudioMode = "design" | "simulation" | "code";
export type StudioRisk = "low" | "moderate" | "high" | "critical";
export const studioNodeKinds = [
  "input",
  "research",
  "analysis",
  "authority",
  "gate",
  "review",
  "action",
  "output",
] as const;

export type StudioNodeKind = (typeof studioNodeKinds)[number];

export const studioExecutionModes = [
  "deterministic",
  "ai_advisory",
  "official_source",
  "human",
  "external_service",
] as const;

export type StudioExecutionMode = (typeof studioExecutionModes)[number];

export type StudioCapability = {
  capabilityId: string;
  configuration: Record<string, unknown>;
  required: boolean;
  executionMode: StudioExecutionMode;
  missingImplementation?: boolean;
};

export type StudioGate = { type: "evidence" | "authority" | "human-review" | "professional-review" | "consequential-action" | "custom"; label: string; required: boolean };

export type StudioPhase = {
  id: string;
  title: string;
  objective: string;
  kind: StudioNodeKind;
  position: { x: number; y: number };
  dependencies: string[];
  capabilities: StudioCapability[];
  gates: StudioGate[];
  riskLevel: StudioRisk;
  /** Owner-adjustable values exposed to this phase's user-facing preview. */
  variables?: StudioVariable[];
};

export type StudioLandingPage = {
  headline: string;
  description: string;
  primaryAction: string;
};

export type StudioWorkflowTarget = {
  verticalId: string;
  verticalTitle: string;
  workflowId: string;
  publicPath: string;
  connection: "connected" | "adapter-required";
};

export type StudioVariable = {
  id: string;
  label: string;
  value: string;
  description?: string;
};

export type StudioWorkflow = {
  id: string;
  title: string;
  description: string;
  objective: string;
  classification: "prototype" | "experimental" | "personal" | "research_only" | "high_risk" | "stable";
  riskLevel: StudioRisk;
  version: number;
  phases: StudioPhase[];
  edges: Array<{ from: string; to: string; condition?: string }>;
  provenancePolicy: { requireSourceForFacts: boolean; allowAIInference: boolean; requireHumanVerificationFor: string[] };
  mode: StudioMode;
  updatedAt: string;
  /** Copy shown on the workflow's public landing page. */
  landingPage?: StudioLandingPage;
  /** Existing Private Office workflow this draft extends, when applicable. */
  sourceWorkflowId?: string;
  /** The product workflow that receives a Studio publication. */
  target?: StudioWorkflowTarget;
};

export type StudioFinding = {
  severity: "critical" | "high" | "medium" | "low";
  code: string;
  message: string;
  phaseId?: string;
};

export function validateStudioWorkflow(workflow: StudioWorkflow): StudioFinding[] {
  const findings: StudioFinding[] = [];
  if (workflow.phases.length === 0) {
    findings.push({
      severity: "critical",
      code: "EMPTY_WORKFLOW",
      message: "A workflow needs at least one phase.",
    });
    return findings;
  }

  const ids = new Set(workflow.phases.map((phase) => phase.id));
  if (ids.size !== workflow.phases.length) {
    findings.push({
      severity: "critical",
      code: "DUPLICATE_PHASE_ID",
      message: "Each phase needs a unique identifier.",
    });
  }

  for (const edge of workflow.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      findings.push({
        severity: "high",
        code: "ORPHAN_EDGE",
        message: "A connection points to a missing phase.",
      });
    }
    if (edge.from === edge.to) {
      findings.push({
        severity: "high",
        code: "SELF_REFERENTIAL_EDGE",
        message: "A phase cannot connect to itself.",
      });
    }
  }
  const incoming = new Set(workflow.edges.map((edge) => edge.to));
  for (const phase of workflow.phases) {
    if (!phase.title.trim() || !phase.objective.trim()) {
      findings.push({
        severity: "high",
        code: "INCOMPLETE_PHASE",
        message: "Every phase needs a title and objective.",
        phaseId: phase.id,
      });
    }
    if (phase.id !== workflow.phases[0]?.id && !incoming.has(phase.id)) {
      findings.push({
        severity: "low",
        code: "UNREACHABLE_PHASE",
        message: `${phase.title} is unreachable from workflow entry.`,
        phaseId: phase.id,
      });
    }
    if (phase.capabilities.some((capability) => capability.missingImplementation)) {
      findings.push({
        severity: "high",
        code: "MISSING_CAPABILITY",
        message: `${phase.title} requires an unavailable capability.`,
        phaseId: phase.id,
      });
    }
    const needsApproval =
      phase.kind === "action" ||
      phase.capabilities.some(
        (capability) => capability.executionMode === "external_service",
      );
    if (
      needsApproval &&
      !phase.gates.some(
        (gate) =>
          gate.type === "consequential-action" ||
          gate.type === "human-review" ||
          gate.type === "professional-review",
      )
    ) {
      findings.push({
        severity: "critical",
        code: "UNGUARDED_ACTION",
        message: `${phase.title} has no approval gate for consequential action.`,
        phaseId: phase.id,
      });
    }
  }
  if (
    workflow.provenancePolicy.requireSourceForFacts &&
    !workflow.provenancePolicy.allowAIInference
  ) {
    findings.push({
      severity: "medium",
      code: "AI_INFERENCE_DISABLED",
      message:
        "AI inference is disabled; analysis phases must provide deterministic outputs.",
    });
  }
  return findings;
}
