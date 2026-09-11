import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { accountAuthMiddleware } from "@/lib/server-function-auth";
import { compoundWorkflows } from "@/domain/compound-workflows";

const compoundWorkflowIdSchema = z
  .string()
  .refine((value) => Object.prototype.hasOwnProperty.call(compoundWorkflows, value), {
    message: "Unknown compound workflow.",
  });

const createInputSchema = z.object({
  workflowId: compoundWorkflowIdSchema,
});

const matterMutationSchema = z.object({
  matterId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  phaseId: z.string().min(1),
});

const userGateSchema = matterMutationSchema.extend({
  gate: z.enum(["human-review", "consequential-action"]),
  approved: z.boolean(),
  detail: z.string().max(2000).nullable().optional(),
});

const provenanceLevelSchema = z.enum([
  "user_provided",
  "document_extracted",
  "external_source",
  "rule_derived",
  "ai_inferred",
  "human_verified",
]);

const capabilityExecutionSchema = matterMutationSchema.extend({
  capabilityLabel: z.string().min(1).max(200),
  context: z.string().max(12000).optional(),
  jurisdiction: z.string().max(300).optional(),
  currentDate: z.string().max(30).optional(),
  facts: z.array(z.object({
    subject: z.string().min(1).max(200),
    predicate: z.string().min(1).max(100),
    value: z.string().min(1).max(2000),
    provenanceLevel: provenanceLevelSchema.optional(),
    confidence: z.number().min(0).max(1).optional(),
  })).max(500).optional(),
  timelineEvents: z.array(z.object({
    eventType: z.string().min(1).max(100),
    date: z.string().max(30).optional(),
    dateEnd: z.string().max(30).optional(),
    description: z.string().max(2000).optional(),
    provenanceLevel: provenanceLevelSchema.optional(),
    confidence: z.number().min(0).max(1).optional(),
  })).max(500).optional(),
  deadlineRules: z.array(z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    triggerEventType: z.string().min(1).max(100),
    days: z.number().int().min(1).max(3650),
    calendarType: z.enum(["calendar", "business"]),
    deadlineEventType: z.string().min(1).max(100),
    authority: z.string().min(1).max(200),
    version: z.string().min(1).max(20).optional(),
    provenanceLevel: provenanceLevelSchema,
    confidence: z.number().min(0).max(1).optional(),
  })).max(100).optional(),
  evidence: z.array(z.object({
    claimId: z.string().min(1).max(200),
    relation: z.enum(["supports", "contradicts", "qualifies", "missing"]),
    evidenceType: z.enum(["document", "fact", "entity", "external"]),
    evidenceId: z.string().min(1).max(200),
    explanation: z.string().max(2000).optional(),
    provenanceLevel: provenanceLevelSchema.optional(),
    confidence: z.number().min(0).max(1).optional(),
  })).max(500).optional(),
});

async function service() {
  const { CompoundWorkflowService } = await import(
    "@/services/compound-workflow-service"
  );
  const { supabaseCompoundMatterRepository } = await import(
    "@/services/supabase-compound-matter-repository"
  );
  return new CompoundWorkflowService(supabaseCompoundMatterRepository);
}

export const createCompoundMatter = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(createInputSchema)
  .handler(async ({ data, context }) => {
    const workflowId = data.workflowId as keyof typeof compoundWorkflows;
    const workflowService = await service();
    const matter = await workflowService.create(
      context.user.id,
      workflowId,
      context.user.id,
    );
    return { matter };
  });

export const listCompoundMatters = createServerFn({ method: "GET" })
  .middleware([accountAuthMiddleware])
  .handler(async ({ context }) => {
    const workflowService = await service();
    const matters = await workflowService.list(context.user.id);
    return { matters };
  });

export const getCompoundMatter = createServerFn({ method: "GET" })
  .middleware([accountAuthMiddleware])
  .validator(z.object({ matterId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.get(context.user.id, data.matterId);
    if (!matter) throw new Error("Compound matter is not accessible for this owner.");
    return { matter };
  });

export const startCompoundMatterPhase = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(matterMutationSchema)
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.startPhase({
      ownerId: context.user.id,
      matterId: data.matterId,
      expectedVersion: data.expectedVersion,
      phaseId: data.phaseId,
      actorId: context.user.id,
    });
    return { matter };
  });

export const runCompoundCapability = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(capabilityExecutionSchema)
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const {
      matterId,
      expectedVersion,
      phaseId,
      capabilityLabel,
      ...execution
    } = data;
    const matter = await workflowService.executeCapability({
      ownerId: context.user.id,
      matterId,
      expectedVersion,
      phaseId,
      capabilityLabel,
      actorId: context.user.id,
      execution,
    });
    return {
      matter,
      run: matter.capabilityRuns.at(-1) ?? null,
    };
  });

export const recordCompoundUserGate = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(userGateSchema)
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.recordUserApprovalGate({
      ownerId: context.user.id,
      matterId: data.matterId,
      expectedVersion: data.expectedVersion,
      phaseId: data.phaseId,
      gate: data.gate,
      approved: data.approved,
      detail: data.detail,
      actorId: context.user.id,
    });
    return { matter };
  });

export const completeCompoundMatterPhase = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(matterMutationSchema)
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.completePhase({
      ownerId: context.user.id,
      matterId: data.matterId,
      expectedVersion: data.expectedVersion,
      phaseId: data.phaseId,
      actorId: context.user.id,
    });
    return { matter };
  });
