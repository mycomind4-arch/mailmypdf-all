import type { WorkflowSeoCatalogEntry } from "./workflow-seo-catalog";

export type WorkflowCatalogTopologyIssue = {
  code: "DUPLICATE_ID" | "DUPLICATE_ROUTE" | "ROUTE_COLLISION" | "INVALID_ID" | "INVALID_ROUTE";
  message: string;
  workflowIds: string[];
};

export type ModeledWorkflowReference = {
  id: string;
  route: string;
};

function normalizeRoute(route: string): string {
  const value = route.trim();
  if (!value) return "";
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

export function validateWorkflowSeoTopology(
  entries: readonly WorkflowSeoCatalogEntry[],
  modeled: readonly ModeledWorkflowReference[] = [],
): WorkflowCatalogTopologyIssue[] {
  const issues: WorkflowCatalogTopologyIssue[] = [];
  const ids = new Map<string, string[]>();
  const routes = new Map<string, string[]>();

  for (const entry of entries) {
    const id = entry.id.trim();
    const route = normalizeRoute(entry.route);

    if (!/^[a-z0-9][a-z0-9._/-]*$/.test(id) || id.includes("//") || id.endsWith("/")) {
      issues.push({
        code: "INVALID_ID",
        message: `Workflow id '${entry.id}' is not a stable canonical lowercase workflow id.`,
        workflowIds: [entry.id],
      });
    }

    if (!route || route === "/" || !/^\/[a-z0-9][a-z0-9._/-]*$/.test(route) || route.includes("//")) {
      issues.push({
        code: "INVALID_ROUTE",
        message: `Workflow route '${entry.route}' is not a stable canonical public route.`,
        workflowIds: [entry.id],
      });
    }

    ids.set(id, [...(ids.get(id) ?? []), entry.id]);
    routes.set(route, [...(routes.get(route) ?? []), entry.id]);
  }

  for (const [id, workflowIds] of ids) {
    if (workflowIds.length > 1) {
      issues.push({
        code: "DUPLICATE_ID",
        message: `SEO catalog contains duplicate canonical workflow id '${id}'.`,
        workflowIds,
      });
    }
  }

  for (const [route, workflowIds] of routes) {
    if (workflowIds.length > 1) {
      issues.push({
        code: "DUPLICATE_ROUTE",
        message: `SEO catalog contains duplicate canonical route '${route}'.`,
        workflowIds,
      });
    }
  }

  const seoById = new Map(entries.map((entry) => [entry.id, entry] as const));
  const modeledByRoute = new Map<string, ModeledWorkflowReference[]>();
  for (const workflow of modeled) {
    const route = normalizeRoute(workflow.route);
    modeledByRoute.set(route, [...(modeledByRoute.get(route) ?? []), workflow]);
  }

  for (const entry of entries) {
    const route = normalizeRoute(entry.route);
    const collisions = (modeledByRoute.get(route) ?? []).filter((workflow) => workflow.id !== entry.id);
    for (const collision of collisions) {
      issues.push({
        code: "ROUTE_COLLISION",
        message: `SEO workflow '${entry.id}' claims '${route}', which is already modeled by '${collision.id}'. Normalize or migrate the canonical route instead of creating two owners.`,
        workflowIds: [entry.id, collision.id],
      });
    }

    const modeledSameId = modeled.find((workflow) => workflow.id === entry.id);
    if (modeledSameId && normalizeRoute(modeledSameId.route) !== route) {
      // A catalog entry may intentionally supersede a legacy route, but that migration
      // must be explicit in routing/redirect work before the new public route can ship.
      issues.push({
        code: "ROUTE_COLLISION",
        message: `SEO workflow '${entry.id}' changes its modeled route from '${normalizeRoute(modeledSameId.route)}' to '${route}'. Add an explicit canonical migration/redirect before publishing the new route.`,
        workflowIds: [entry.id],
      });
    }
  }

  // Keep the map construction above intentional: it guarantees future additions use
  // exact canonical ids and makes accidental whitespace/case duplicates visible.
  void seoById;

  return issues;
}
