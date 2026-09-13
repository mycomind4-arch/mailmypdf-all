export type AgentProviderName = "claude" | "codex";
export type AgentMode = "chat" | "work";

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
};
