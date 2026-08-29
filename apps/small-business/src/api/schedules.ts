import { z } from "zod";
import { nextOccurrence, scheduledMailSchema } from "../services/scheduleEngine";
import type { ScheduleStore } from "../services/scheduleStore";
import type { EventLog } from "../services/eventLog";

const createSchema = scheduledMailSchema.extend({ status: z.enum(["active", "paused"]).default("active") });

export function createScheduleHandler(deps: { store: ScheduleStore; events: EventLog }) {
  return async (body: unknown, actorId?: string) => {
    const input = createSchema.parse(body);
    const next = nextOccurrence(input);
    const saved = await deps.store.create({
      businessId: input.businessId, mailJobId: input.mailJobId, timezone: input.timezone,
      rule: input.rule, requiresApproval: input.requiresApproval, status: input.status,
      nextRunAt: next?.toISOString() ?? null,
    });
    await deps.events.append({ businessId: saved.businessId, type: "schedule.created", actorId, entityId: saved.id, metadata: { nextRunAt: saved.nextRunAt } });
    return saved;
  };
}
