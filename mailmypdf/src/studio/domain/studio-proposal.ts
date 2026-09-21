import { z } from "zod";
import {
  studioExecutionModes,
  studioNodeKinds,
  type StudioCapability,
  type StudioGate,
  type StudioPhase,
  type StudioVariable,
} from "./studio-workflow";

const phaseIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens.");

const capabilitySchema = z.object({
  capabilityId: z.string().trim().min(2).max(100),
  executionMode: z.enum(studioExecutionModes),
  required: z.boolean().optional().default(true),
});

const gateSchema = z.object({
  type: z.enum([
    "evidence",
    "authority",
    "human-review",
    "professional-review",
    "consequential-action",
    "custom",
  ]),
  label: z.string().trim().min(2).max(120),
  required: z.boolean().optional().default(true),
});

const variableSchema = z.object({
  id: phaseIdSchema,
  label: z.string().trim().min(2).max(80),
  value: z.string().trim().max(500),
  description: z.string().trim().max(180).optional(),
});

export const studioProposalSchema = z.object({
  title: z.string().trim().min(2).max(120),
  explanation: z.string().trim().min(2).max(900),
  landingPage: z
    .object({
      headline: z.string().trim().min(8).max(220),
      description: z.string().trim().min(20).max(900),
      primaryAction: z.string().trim().min(2).max(60),
    })
    .optional(),
  phases: z
    .array(
      z.object({
        id: phaseIdSchema,
        title: z.string().trim().min(2).max(120),
        objective: z.string().trim().min(4).max(700),
        kind: z.enum(studioNodeKinds),
        capabilities: z.array(capabilitySchema).max(8).optional().default([]),
        gates: z.array(gateSchema).max(5).optional().default([]),
        variables: z.array(variableSchema).max(8).optional().default([]),
      }),
    )
    .min(3)
    .max(10),
});

export type StudioProposal = z.infer<typeof studioProposalSchema>;

export function createStudioPhases(proposal: StudioProposal): StudioPhase[] {
  return proposal.phases.map((phase, index) => ({
    id: phase.id,
    title: phase.title,
    objective: phase.objective,
    kind: phase.kind,
    position: { x: 80, y: 80 + index * 180 },
    dependencies: index ? [proposal.phases[index - 1].id] : [],
    capabilities: phase.capabilities.map<StudioCapability>((capability) => ({
      capabilityId: capability.capabilityId,
      executionMode: capability.executionMode,
      required: capability.required,
      configuration: {},
    })),
    gates: phase.gates.map<StudioGate>((gate) => ({
      type: gate.type,
      label: gate.label,
      required: gate.required,
    })),
    variables: phase.variables.map<StudioVariable>((variable) => ({
      id: variable.id,
      label: variable.label,
      value: variable.value,
      description: variable.description,
    })),
    riskLevel:
      phase.kind === "action" || phase.kind === "review" ? "high" : "moderate",
  }));
}
