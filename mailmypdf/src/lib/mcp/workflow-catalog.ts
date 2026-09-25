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

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

const WORKFLOW_TOKEN_FREQUENCY = (() => {
  const frequency = new Map<string, number>();

  for (const section of WORKFLOW_NAV_SECTIONS) {
    for (const workflow of section.workflows) {
      const tokens = new Set([
        ...tokenize(workflow.slug),
        ...tokenize(workflow.label),
      ]);
      for (const token of tokens) {
        frequency.set(token, (frequency.get(token) ?? 0) + 1);
      }
    }
  }

  return frequency;
})();

function exactTokenWeight(token: string): number {
  const frequency = Math.max(1, WORKFLOW_TOKEN_FREQUENCY.get(token) ?? 1);
  return 80 + Math.round(160 / frequency);
}

function scoreMatch(
  queryTokens: readonly string[],
  section: WorkflowNavigationSection,
  workflow: WorkflowNavigationItem,
): number {
  const slug = workflow.slug.toLowerCase();
  const label = workflow.label.toLowerCase();
  const sectionLabel = section.label.toLowerCase();
  const slugTokens = new Set(tokenize(slug));
  const labelTokens = new Set(tokenize(label));
  const sectionTokens = new Set(tokenize(sectionLabel));
  let score = 0;
  let exactWorkflowTokenMatches = 0;

  for (const token of queryTokens) {
    if (slug === token || label === token) score += 300;

    if (slugTokens.has(token) || labelTokens.has(token)) {
      score += exactTokenWeight(token);
      exactWorkflowTokenMatches += 1;
    } else {
      if (slug.includes(token)) score += 12;
      if (label.includes(token)) score += 10;
    }

    if (sectionTokens.has(token)) score += 8;
    else if (sectionLabel.includes(token)) score += 4;
  }

  // Reward workflows that explain more of the user's query without allowing
  // broad catalog terms to drown out a distinctive notice/form identifier.
  score += exactWorkflowTokenMatches * exactWorkflowTokenMatches * 12;

  const wholeQuery = queryTokens.join(" ");
  if (wholeQuery && label.includes(wholeQuery)) score += 120;
  if (wholeQuery && slug.includes(wholeQuery.replaceAll(" ", "-"))) score += 120;
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
