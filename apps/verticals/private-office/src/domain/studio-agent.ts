import { z } from "zod";

const agentIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens.");

export const studioAgentRoles = [
  "research",
  "workflow-design",
  "commercial-review",
  "integration",
  "quality-review",
] as const;

export const studioSubagentSchema = z.object({
  id: agentIdSchema,
  name: z.string().trim().min(2).max(80),
  role: z.enum(studioAgentRoles),
  objective: z.string().trim().min(8).max(700),
  targetWorkflowIds: z.array(agentIdSchema).max(40).default([]),
});

export const studioAgentPlanSchema = z.object({
  summary: z.string().trim().min(4).max(500),
  subagents: z
    .array(studioSubagentSchema)
    .min(1)
    .max(20),
});

export const studioAgentResultSchema = z.object({
  summary: z.string().trim().min(4).max(900),
  findings: z.array(z.string().trim().min(2).max(500)).max(12).default([]),
  recommendations: z.array(z.string().trim().min(2).max(500)).max(12).default([]),
});

export type StudioAgentPlan = z.infer<typeof studioAgentPlanSchema>;
export type StudioAgentResult = z.infer<typeof studioAgentResultSchema>;
