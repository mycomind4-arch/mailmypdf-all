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
