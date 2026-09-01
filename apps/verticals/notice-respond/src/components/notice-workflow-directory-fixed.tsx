import { noticeRespondCatalog } from "../domain/workflow-catalog";
import type { MasterWorkflowDefinition } from "../domain/workflow-definition";

export type NoticeWorkflow = {
  slug: string;
  route: string;
  title: string;
  searchIntent: string;
  category: string;
  description: string;
  bestFor: string;
  steps: string[];
  documents: string[];
  lifecycle?: string;
  canonicalPath: string;
};

/**
 * The workflow catalog is the executable source of truth for the directory.
 * SEO aliases are intentionally excluded from internal navigation. They may
 * remain as public compatibility URLs, but the application must always link
 * to a dedicated workflow landing page first.
 */
function catalogToDirectoryEntry(def: MasterWorkflowDefinition): NoticeWorkflow | null {
  if (!def.directory) return null;

  return {
    slug: def.id,
    route: `/workflows/${def.id}/landing`,
    title: def.directory.seoTitle ?? def.title,
    searchIntent: def.searchIntent.primary,
    category: def.directory.category,
    description: def.directory.seoDescription ?? def.description,
    bestFor: def.directory.bestFor,
    steps: def.directory.steps,
    documents: def.directory.documents,
    lifecycle: def.lifecycle,
    canonicalPath: def.searchIntent.canonicalPath,
  };
}

function buildWorkflowList(): NoticeWorkflow[] {
  const entries: NoticeWorkflow[] = [];
  const seenIds = new Set<string>();
  const seenRoutes = new Set<string>();

  for (const def of noticeRespondCatalog) {
    const entry = catalogToDirectoryEntry(def);
    if (!entry) continue;

    // Never render duplicate workflow identities or duplicate landing routes.
    if (seenIds.has(entry.slug) || seenRoutes.has(entry.route)) continue;

    entries.push(entry);
    seenIds.add(entry.slug);
    seenRoutes.add(entry.route);
  }

  return entries;
}

export const NOTICE_WORKFLOWS: NoticeWorkflow[] = buildWorkflowList();

export function workflowCategories() {
  const groups = new Map<string, NoticeWorkflow[]>();

  for (const workflow of NOTICE_WORKFLOWS) {
    const current = groups.get(workflow.category) ?? [];
    current.push(workflow);
    groups.set(workflow.category, current);
  }

  return Array.from(groups.entries()).map(([category, workflows]) => ({ category, workflows }));
}
