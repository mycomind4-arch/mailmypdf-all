import type { WorkflowSeoAuthorityContent } from "../workflow-seo-catalog";

import appealSsdiDenial from "./appeal-ssdi-denial";
import legalDefenseWrongfulStolenVehicleArrest from "./legal-defense-wrongful-stolen-vehicle-arrest";
import noticeIrsNotice from "./notice-irs-notice";

/**
 * One authored authority record. `id` must match a canonical workflow id in
 * WORKFLOW_INVENTORY.json — the catalog merges by id and never invents routes.
 *
 * Authoring a record here is what promotes a workflow out of DRAFT/noindex.
 * It does not bypass review: the Authority Gate still scores the content and
 * blocks indexing (and fails `pnpm seo:authority:validate`) if it is thin,
 * duplicated, generically worded, or missing authoritative sources.
 */
export type AuthoredWorkflowSeoEntry = {
  id: string;
  content: WorkflowSeoAuthorityContent;
  /**
   * Set only when the authenticated execution entry point has actually been
   * exercised. `verified: true` is what allows an EXECUTABLE CTA to render, so
   * it is a claim about a real, working route — not about the content.
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
];
