import type { WorkflowSeoAuthorityContent } from "../workflow-seo-catalog";

import appealSsdiDenial from "./appeal-ssdi-denial";
import legalDefenseWrongfulStolenVehicleArrest from "./legal-defense-wrongful-stolen-vehicle-arrest";
import noticeCp2000Response from "./notice-cp2000-response";
import noticeIrsNotice from "./notice-irs-notice";

/**
 * One authored authority record. `id` must match a canonical workflow id in
 * WORKFLOW_REGISTRY — the catalog merges by id and never invents routes.
 *
 * Register the module and review date in canonical-workflows.json to promote
 * a workflow out of DRAFT/noindex. Authored content alone cannot promote it.
 * It does not bypass review: the Authority Gate still scores the content and
 * blocks indexing (and fails `pnpm seo:authority:validate`) if it is thin,
 * duplicated, generically worded, or missing authoritative sources.
 */
export type AuthoredWorkflowSeoEntry = {
  id: string;
  content: WorkflowSeoAuthorityContent;
  /**
   * @deprecated Compatibility only. Execution href and verification now belong
   * to the canonical registry. The catalog rejects disagreement with it.
   */
  execution?: { href: string; verified: boolean };
};

/**
 * Authored authority content, one module per workflow.
 *
 * One file per workflow is deliberate: Studio agent runs author these in
 * parallel on separate branches, and a per-workflow file keeps those runs from
 * colliding in a shared registry file.
 */
export const AUTHORED_SEO_ENTRIES: readonly AuthoredWorkflowSeoEntry[] = [
  legalDefenseWrongfulStolenVehicleArrest,
  appealSsdiDenial,
  noticeIrsNotice,
  noticeCp2000Response,
];
