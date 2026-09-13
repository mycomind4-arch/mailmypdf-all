export type AgentProviderName = "claude" | "codex";
export type AgentMode = "chat" | "work";

/** A named, bounded responsibility the planner may assign to a run. */
export const agentRoles = ["builder", "tester", "reviewer", "seo", "workflow_evaluator", "visual_qa", "safety_reviewer", "release_manager", "documentation", "design_system"] as const;
export type AgentRole = (typeof agentRoles)[number];

export type AgentRunBudget = {
  /** Concurrent CLI processes permitted for this run. */
  maxConcurrentAgents: number;
  /** Maximum work attempts before requiring an owner. */
  maxAttempts: number;
  /** Per-agent wall-clock limit. */
  timeoutMs: number;
};

export type RoleName = "builder" | "tester" | "reviewer" | "seo";

export type RunEvent = {
  at: string;
  role: RoleName | "orchestrator";
  type: string;
  detail?: string;
  data?: Record<string, unknown>;
};

export type RoleStatus = "pending" | "running" | "pass" | "fail" | "approved" | "changes_requested" | "skipped";

export type RunState = {
  runId: string;
  verticalId: string;
  workflowId: string;
  instructions: string;
  branch: string;
  worktreeDir: string;
  status: "running" | "merged" | "needs_human" | "failed" | "cancelled";
  roles: Partial<Record<RoleName, { status: RoleStatus; attempts: number; detail?: string }>>;
  startedAt: string;
  updatedAt: string;
  mergedInto?: string;
};

export type LaunchRequest = {
  verticalId: string;
  workflowId: string;
  instructions: string;
  publicPath?: string;
  builderProvider?: AgentProviderName;
  reviewerProvider?: AgentProviderName;
  /** Optional provider-native model ids. The CLI performs final availability checks. */
  builderModel?: string;
  reviewerModel?: string;
  requestedRoles?: AgentRole[];
  budget?: AgentRunBudget;
};
