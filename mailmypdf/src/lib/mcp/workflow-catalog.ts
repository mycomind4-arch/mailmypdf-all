import {
  WORKFLOW_NAV_SECTIONS,
  type WorkflowNavigationItem,
  type WorkflowNavigationSection,
} from "@/lib/workflow-navigation";

export type McpWorkflowDescriptor = {
  workflowId: string;
  label: string;
  sectionId: string;
  sectionLabel: string;
  publicHref: string;
  workspaceHref: string;
};

function descriptor(
  section: WorkflowNavigationSection,
  workflow: WorkflowNavigationItem,
): McpWorkflowDescriptor {
  return {
    workflowId: workflow.slug,
    label: workflow.label,
    sectionId: section.id,
    sectionLabel: section.label,
    publicHref: workflow.publicHref,
    workspaceHref: workflow.workspaceHref,
  };
}

export function getWorkflowDescriptor(workflowId: string): McpWorkflowDescriptor | null {
  const normalized = workflowId.trim().toLowerCase();
  if (!normalized) return null;

  for (const section of WORKFLOW_NAV_SECTIONS) {
    const workflow = section.workflows.find((item) => item.slug.toLowerCase() === normalized);
    if (workflow) return descriptor(section, workflow);
  }
  return null;
}

function scoreMatch(
  queryTokens: readonly string[],
  section: WorkflowNavigationSection,
  workflow: WorkflowNavigationItem,
): number {
  const slug = workflow.slug.toLowerCase();
  const label = workflow.label.toLowerCase();
  const sectionLabel = section.label.toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (slug === token || label === token) score += 100;
    if (slug.includes(token)) score += 12;
    if (label.includes(token)) score += 10;
    if (sectionLabel.includes(token)) score += 4;
  }

  const wholeQuery = queryTokens.join(" ");
  if (wholeQuery && label.includes(wholeQuery)) score += 40;
  if (wholeQuery && slug.includes(wholeQuery.replaceAll(" ", "-"))) score += 40;
  return score;
}

export function findWorkflowMatches(query: string, limit = 8): McpWorkflowDescriptor[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);

  if (!tokens.length) return [];

  return WORKFLOW_NAV_SECTIONS
    .flatMap((section) =>
      section.workflows.map((workflow) => ({
        score: scoreMatch(tokens, section, workflow),
        item: descriptor(section, workflow),
      })),
    )
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .slice(0, Math.max(1, Math.min(20, Math.trunc(limit) || 8)))
    .map((entry) => entry.item);
}
