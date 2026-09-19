export type WorkStatus = "draft" | "active" | "completed" | "archived";

export interface EcosystemWorkItem {
  id: string;
  title: string;
  verticalSlug: string;
  status: WorkStatus;
  updatedAt: string;
  documentCount: number;
}

export function sortWork(items: EcosystemWorkItem[]) {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
