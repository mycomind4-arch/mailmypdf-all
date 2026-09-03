import type { UserCapabilityState } from "@/domain/state-engine";
import { createInitialState, startCapability } from "@/domain/state-engine";
import { capabilityGraph } from "@/domain/capability-graph";
import { businessWorkflowGroups } from "@/domain/workflow-groups";
import {
  applyCapabilityCompletion,
  CapabilityTransitionError,
} from "@/domain/capability-lifecycle";
import { findCapabilityForWorkflow } from "@/domain/workflow-capability";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase capability state persistence is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  }
  const base = url.replace(/\/$/, "");
  return {
    stateBase: `${base}/rest/v1/user_capability_state`,
    eventsBase: `${base}/rest/v1/user_capability_events`,
    key,
  };
}

function headers(key: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra,
  };
}

interface CapabilityStateRow {
  id: string;
  owner_id: string;
  completed_capabilities: string[];
  in_progress_capabilities: string[];
  reached_milestones: string[];
  created_at: string;
  updated_at: string;
}

function fromRow(row: CapabilityStateRow): UserCapabilityState {
  return {
    userId: row.owner_id,
    completed: row.completed_capabilities ?? [],
    inProgress: row.in_progress_capabilities ?? [],
    reachedMilestones: row.reached_milestones ?? [],
    updatedAt: row.updated_at,
  };
}

function rowFromState(state: UserCapabilityState) {
  return {
    owner_id: state.userId,
    completed_capabilities: state.completed,
    in_progress_capabilities: state.inProgress,
    reached_milestones: state.reachedMilestones,
    updated_at: new Date().toISOString(),
  };
}

async function insertEvent(
  eventsBase: string,
  key: string,
  ownerId: string,
  eventType: string,
  payload: Record<string, unknown>,
  matterId?: string,
): Promise<void> {
  const response = await fetch(eventsBase, {
    method: "POST",
    headers: headers(key, { Prefer: "return=minimal" }),
    body: JSON.stringify({
      id: crypto.randomUUID(),
      owner_id: ownerId,
      event_type: eventType,
      capability_id:
        typeof payload.capabilityId === "string" ? payload.capabilityId : null,
      milestone_id:
        typeof payload.milestoneId === "string" ? payload.milestoneId : null,
      workflow_group_id:
        typeof payload.groupId === "string" ? payload.groupId : null,
      matter_id: matterId ?? null,
      metadata: payload,
      created_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    throw new Error(`Supabase capability event insert failed: ${response.status}`);
  }
}

async function completeCapabilityForMatter(
  userId: string,
  matterId: string,
  capabilityId: string,
): Promise<UserCapabilityState> {
  const { eventsBase, key } = config();
  const currentState = await repository.load(userId);
  const result = applyCapabilityCompletion(
    capabilityGraph,
    businessWorkflowGroups,
    currentState,
    {
      matterId,
      ownerId: userId,
      capabilityId,
    },
  );

  await repository.save(result.state);
  for (const event of result.events) {
    await insertEvent(eventsBase, key, userId, event.eventType, event.metadata, matterId);
  }
  return result.state;
}

const repository = {
  async load(userId: string): Promise<UserCapabilityState> {
    const { stateBase, key } = config();
    const response = await fetch(
      `${stateBase}?owner_id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: headers(key) },
    );
    if (!response.ok) {
      throw new Error(`Supabase capability state load failed: ${response.status}`);
    }
    const rows = (await response.json()) as CapabilityStateRow[];
    return rows[0] ? fromRow(rows[0]) : createInitialState(userId);
  },

  async save(state: UserCapabilityState): Promise<void> {
    const { stateBase, key } = config();
    const response = await fetch(stateBase, {
      method: "POST",
      headers: headers(key, {
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(rowFromState(state)),
    });
    if (!response.ok) {
      throw new Error(`Supabase capability state save failed: ${response.status}`);
    }
  },

  async completeCapability(
    userId: string,
    capabilityId: string,
  ): Promise<{
    state: UserCapabilityState;
    completedCapabilityId: string;
    newlyReachedMilestones: { id: string; title: string; description: string }[];
    newlyUnlockedCapabilities: { id: string; title: string }[];
    newlyUnlockedGroups: { id: string; title: string }[];
  }> {
    const { eventsBase, key } = config();
    const currentState = await this.load(userId);

    const result = applyCapabilityCompletion(
      capabilityGraph,
      businessWorkflowGroups,
      currentState,
      {
        matterId: `capability:${capabilityId}`,
        ownerId: userId,
        capabilityId,
      },
    );

    await this.save(result.state);

    for (const event of result.events) {
      await insertEvent(eventsBase, key, userId, event.eventType, event.metadata);
    }

    return {
      state: result.state,
      completedCapabilityId: result.completion.completedCapabilityId,
      newlyReachedMilestones: result.completion.newlyReachedMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
      })),
      newlyUnlockedCapabilities: result.completion.newlyUnlockedCapabilities.map((c) => ({
        id: c.id,
        title: c.title,
      })),
      newlyUnlockedGroups: result.newlyUnlockedGroups.map((g) => ({
        id: g.id,
        title: g.title,
      })),
    };
  },

  async completeWorkflowForMatter(
    userId: string,
    matterId: string,
    workflowId: string,
  ): Promise<UserCapabilityState> {
    const match = findCapabilityForWorkflow(capabilityGraph, workflowId);
    if (!match) return this.load(userId);
    return completeCapabilityForMatter(userId, matterId, match.capabilityId);
  },

  async startCapability(
    userId: string,
    capabilityId: string,
  ): Promise<UserCapabilityState> {
    const { eventsBase, key } = config();
    const currentState = await this.load(userId);
    const capability = capabilityGraph.capabilities[capabilityId];

    if (!capability) {
      throw new CapabilityTransitionError(`Unknown capability: ${capabilityId}`);
    }
    if (currentState.completed.includes(capabilityId)) return currentState;
    if (currentState.inProgress.includes(capabilityId)) return currentState;

    const missing = capability.prerequisites.filter(
      (prerequisite) => !currentState.completed.includes(prerequisite),
    );
    if (missing.length > 0) {
      throw new CapabilityTransitionError(
        `Capability ${capabilityId} is blocked by: ${missing.join(", ")}`,
      );
    }

    const newState = startCapability(currentState, capabilityId);
    await this.save(newState);
    await insertEvent(eventsBase, key, userId, "capability_started", {
      capabilityId,
    });
    return newState;
  },

  async syncFromMatters(
    userId: string,
    completedWorkflowIds: string[],
  ): Promise<UserCapabilityState> {
    let state = await this.load(userId);

    for (const workflowId of completedWorkflowIds) {
      const match = findCapabilityForWorkflow(capabilityGraph, workflowId);
      if (!match) continue;
      if (state.completed.includes(match.capabilityId)) continue;

      const result = applyCapabilityCompletion(
        capabilityGraph,
        businessWorkflowGroups,
        state,
        {
          matterId: `workflow:${workflowId}`,
          ownerId: userId,
          capabilityId: match.capabilityId,
        },
      );
      state = result.state;

      for (const event of result.events) {
        const { eventsBase, key } = config();
        await insertEvent(
          eventsBase,
          key,
          userId,
          event.eventType,
          event.metadata,
          `workflow:${workflowId}`,
        );
      }
    }

    await this.save(state);
    return state;
  },
};

export const supabaseCapabilityStateRepository = repository;
