export type AgentPolicy = {
  allowAutonomousSend: boolean;
  requireApprovalForMailClass: Array<"standard" | "certified" | "registered">;
  allowedPermissions: string[];
  maxJobsPerRun: number;
};

export const conservativeBusinessPolicy: AgentPolicy = {
  allowAutonomousSend: false,
  requireApprovalForMailClass: ["certified", "registered"],
  allowedPermissions: ["documents:read", "documents:write", "mail:read", "mail:write", "mail:schedule", "mail:approve"],
  maxJobsPerRun: 100,
};

export function authorizeAgentAction(policy: AgentPolicy, permissions: string[], action: { type: "send" | "schedule" | "draft"; mailClass?: "standard" | "certified" | "registered" }): void {
  if (!permissions.every((permission) => policy.allowedPermissions.includes(permission))) throw new Error("Agent requested an unauthorized permission");
  if (action.type === "send" && !policy.allowAutonomousSend) throw new Error("Autonomous sending is disabled by business policy");
  if (action.type === "send" && action.mailClass && policy.requireApprovalForMailClass.includes(action.mailClass)) throw new Error(`Approval required for ${action.mailClass} mail`);
}
