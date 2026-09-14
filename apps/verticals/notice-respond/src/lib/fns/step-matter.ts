import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { accountAuthMiddleware } from "@/lib/server-function-auth";
import { stepWorkflows } from "@/domain/step-workflows";

const workflowIdSchema = z
  .string()
  .refine((value) => Object.prototype.hasOwnProperty.call(stepWorkflows, value), {
    message: "Unknown step workflow.",
  });

const matterMutationSchema = z.object({
  matterId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

async function service() {
  const { StepWorkflowService } = await import("@mailmypdf/step-workflow");
  const { supabaseStepMatterRepository } = await import("@/services/supabase-step-matter-repository");
  return new StepWorkflowService(supabaseStepMatterRepository, stepWorkflows);
}

export const createStepMatter = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(z.object({ workflowId: workflowIdSchema }))
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.create(context.user.id, data.workflowId, context.user.id);
    return { matter };
  });

export const listStepMatters = createServerFn({ method: "GET" })
  .middleware([accountAuthMiddleware])
  .validator(z.object({ workflowId: workflowIdSchema.optional() }).optional())
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matters = await workflowService.list(context.user.id, data?.workflowId);
    return { matters };
  });

export const getStepMatter = createServerFn({ method: "GET" })
  .middleware([accountAuthMiddleware])
  .validator(z.object({ matterId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.get(context.user.id, data.matterId);
    if (!matter) throw new Error("Matter is not accessible for this owner.");
    return { matter };
  });

export const updateStepMatterData = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(
    matterMutationSchema.extend({
      stepId: z.string().min(1),
      patch: z.record(z.string(), z.unknown()),
    }),
  )
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.updateStepData({
      ownerId: context.user.id,
      matterId: data.matterId,
      expectedVersion: data.expectedVersion,
      stepId: data.stepId,
      patch: data.patch,
      actorId: context.user.id,
    });
    return { matter };
  });

export const setStepMatterChecklistItem = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(
    matterMutationSchema.extend({
      stepId: z.string().min(1),
      item: z.object({ id: z.string().min(1), label: z.string().min(1), done: z.boolean() }),
    }),
  )
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.setChecklistItem({
      ownerId: context.user.id,
      matterId: data.matterId,
      expectedVersion: data.expectedVersion,
      stepId: data.stepId,
      item: data.item,
      actorId: context.user.id,
    });
    return { matter };
  });

export const completeStepMatterStep = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(matterMutationSchema.extend({ stepId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.completeStep({
      ownerId: context.user.id,
      matterId: data.matterId,
      expectedVersion: data.expectedVersion,
      stepId: data.stepId,
      actorId: context.user.id,
    });
    return { matter };
  });

export const approveStepMatter = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .validator(matterMutationSchema)
  .handler(async ({ data, context }) => {
    const workflowService = await service();
    const matter = await workflowService.approve({
      ownerId: context.user.id,
      matterId: data.matterId,
      expectedVersion: data.expectedVersion,
      actorId: context.user.id,
    });
    return { matter };
  });
