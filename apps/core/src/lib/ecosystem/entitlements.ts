export type PlatformPlan = "free" | "plus" | "pro";

export interface PlatformEntitlement {
  plan: PlatformPlan;
  workflowLimit: number;
  aiLimit: number;
  voiceMinutes: number;
  researchLimit: number;
  storageMb: number;
}

export const DEFAULT_ENTITLEMENTS: Record<PlatformPlan, PlatformEntitlement> = {
  free: { plan: "free", workflowLimit: 10, aiLimit: 20, voiceMinutes: 10, researchLimit: 5, storageMb: 250 },
  plus: { plan: "plus", workflowLimit: 100, aiLimit: 250, voiceMinutes: 120, researchLimit: 50, storageMb: 5000 },
  pro: { plan: "pro", workflowLimit: 1000, aiLimit: 2500, voiceMinutes: 1000, researchLimit: 500, storageMb: 25000 },
};

export interface UsageSnapshot {
  workflows: number;
  ai: number;
  voiceMinutes: number;
  research: number;
  storageMb: number;
}

export function getEntitlement(plan: PlatformPlan = "free") {
  return DEFAULT_ENTITLEMENTS[plan];
}

export function remainingUsage(plan: PlatformPlan, usage: UsageSnapshot) {
  const limits = getEntitlement(plan);
  return {
    workflows: Math.max(0, limits.workflowLimit - usage.workflows),
    ai: Math.max(0, limits.aiLimit - usage.ai),
    voiceMinutes: Math.max(0, limits.voiceMinutes - usage.voiceMinutes),
    research: Math.max(0, limits.researchLimit - usage.research),
    storageMb: Math.max(0, limits.storageMb - usage.storageMb),
  };
}
