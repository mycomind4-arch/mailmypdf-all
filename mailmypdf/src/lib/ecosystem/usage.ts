import { getEntitlement, type PlatformPlan, type UsageSnapshot } from "./entitlements";

export interface UsageEvent {
  userId: string;
  kind: "workflow" | "ai" | "voice" | "research" | "storage";
  amount: number;
  createdAt: string;
}

export function canConsume(plan: PlatformPlan, usage: UsageSnapshot, kind: UsageEvent["kind"], amount = 1) {
  const limits = getEntitlement(plan);
  const current = usage[kind === "workflow" ? "workflows" : kind === "voice" ? "voiceMinutes" : kind === "research" ? "research" : kind === "ai" ? "ai" : "storageMb"];
  const limit = limits[kind === "workflow" ? "workflowLimit" : kind === "voice" ? "voiceMinutes" : kind === "research" ? "researchLimit" : kind === "ai" ? "aiLimit" : "storageMb"];
  return current + amount <= limit;
}

export function assertCanConsume(plan: PlatformPlan, usage: UsageSnapshot, kind: UsageEvent["kind"], amount = 1) {
  if (!canConsume(plan, usage, kind, amount)) {
    throw new Error(`PLATFORM_USAGE_LIMIT:${kind}`);
  }
}
