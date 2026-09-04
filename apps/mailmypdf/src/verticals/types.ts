/**
 * Canonical Vertical Type Definitions
 *
 * These types define the contract every MailMyPDF vertical must conform to.
 * The vertical registry (registry.ts) provides concrete instances of these types.
 *
 * Design principles:
 * - Static configuration for product metadata (no DB table needed)
 * - Verticals provide metadata + configuration; shared infrastructure handles execution
 * - The registry is the single source of truth for navigation, SEO, and routing
 */

// ── Vertical Lifecycle Status ────────────────────────────────────────────────

/**
 * The lifecycle of a vertical from concept to production.
 *
 * PLANNED  — Not started, no route exists
 * SOON     — In development, route may exist but is not functional
 * BETA     — Functional but not publicly announced
 * LIVE     — Production-ready: route works, landing page works, primary workflow
 *            works, checkout works, mailing works, tracking works, proof works
 * DISABLED — Temporarily taken offline (route may 503 or redirect)
 *
 * Only LIVE verticals appear as functional in navigation.
 * SOON/BETA verticals may appear with a "Coming soon" indicator.
 * PLANNED verticals are invisible to users.
 */
export type VerticalStatus = "planned" | "soon" | "beta" | "live" | "disabled";

/**
 * Independent execution certification used by Gold Standard governance.
 * This is intentionally separate from product lifecycle/navigation status.
 */
export type VerticalExecutionState = "catalog" | "domain-ready" | "executable" | "gold";

/**
 * What "LIVE" means — a vertical must satisfy ALL of these:
 * - route works (no 404)
 * - landing page renders with real content
 * - primary workflow (intake to draft to review to finalize) works end-to-end
 * - canonical checkout works (Stripe payment succeeds)
 * - mailing works (Lob submission succeeds)
 * - tracking works (webhook events flow through)
 * - proof works (proof bundle generates correctly)
 * - E2E test passes
 */
export interface LiveCriteria {
  routeWorks: boolean;
  landingPageWorks: boolean;
  primaryWorkflowWorks: boolean;
  checkoutWorks: boolean;
  mailingWorks: boolean;
  trackingWorks: boolean;
  proofWorks: boolean;
  e2eTestPasses: boolean;
}

// ── Vertical Category ────────────────────────────────────────────────────────

/**
 * Navigation categories for grouping verticals in the Products menu.
 * Categories are intentionally meaningful, not arbitrary.
 */
export type VerticalCategory =
  | "government" // Government & Official
  | "appeals" // Appeals & Claims
  | "disputes" // Disputes
  | "housing" // Housing
  | "professional" // Professional Correspondence
  | "business"; // Business

export const CATEGORY_LABELS: Record<VerticalCategory, string> = {
  government: "Government & Official",
  appeals: "Appeals & Claims",
  disputes: "Disputes",
  housing: "Housing",
  professional: "Professional Correspondence",
  business: "Business",
};

// ── Vertical Feature Flags ────────────────────────────────────────────────────

/**
 * Capabilities a vertical may support. Not every vertical needs every feature.
 * The architecture is composable — verticals opt into what they need.
 */
export interface VerticalCapabilities {
  requiresAI: boolean;
  requiresDocuments: boolean;
  supportsDrafting: boolean;
  supportsEvidence: boolean;
  supportsMailing: boolean;
}

// ── Vertical SEO Metadata ────────────────────────────────────────────────────

export interface VerticalSeo {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  /** "index,follow" for live, "noindex,nofollow" for non-live */
  robots?: string;
}

// ── Vertical Definition ───────────────────────────────────────────────────────

/**
 * The canonical definition of a MailMyPDF vertical.
 *
 * This is static configuration — NOT a database table. Product metadata
 * does not need user-specific state. The registry is imported directly
 * by navigation, routing, SEO, and analytics.
 */
export interface VerticalDefinition {
  /** Unique identifier (kebab-case, e.g., "notice-response") */
  id: string;
  /** URL slug (e.g., "notice-response") */
  slug: string;
  /** Full display name (e.g., "NoticeResponse") */
  name: string;
  /** Short name for compact UI (e.g., "NoticeResponse") */
  shortName: string;
  /** One-line tagline for navigation */
  tagline: string;
  /** Longer description for the solutions page */
  description: string;
  /** Navigation category */
  category: VerticalCategory;
  /** Lifecycle status */
  status: VerticalStatus;
  /** Gold Standard execution certification, independent from navigation status */
  executionState: VerticalExecutionState;
  /** Root-level route path (e.g., "/notice-response") */
  route: string;
  /** Lucide icon name for navigation (string, resolved in component) */
  icon: string;
  /** SEO metadata */
  seo: VerticalSeo;
  /** Primary CTA label (e.g., "Start a Response") */
  primaryCTA: string;
  /** Whether this vertical is enabled (combines status + feature flags) */
  enabled: boolean;
  /** Feature capabilities */
  capabilities: VerticalCapabilities;
}

// ── Vertical Workflow State ───────────────────────────────────────────────────

/**
 * The standard vertical workflow state model.
 *
 * Not every vertical needs every state. The shared infrastructure
 * handles transitions; verticals declare which states they use.
 *
 * START -> INTAKE -> ANALYZE -> REVIEW_FACTS -> DRAFT -> EDIT -> FINALIZE
 *       -> MAIL_OPTIONS -> CHECKOUT -> PAID -> FULFILLING -> MAILED
 *       -> TRACKING -> DELIVERED -> PROOF
 */
export type VerticalWorkflowState =
  | "start"
  | "intake"
  | "analyze"
  | "review_facts"
  | "draft"
  | "edit"
  | "finalize"
  | "mail_options"
  | "checkout"
  | "paid"
  | "fulfilling"
  | "mailed"
  | "tracking"
  | "delivered"
  | "proof";

export const VERTICAL_WORKFLOW_STATES: VerticalWorkflowState[] = [
  "start",
  "intake",
  "analyze",
  "review_facts",
  "draft",
  "edit",
  "finalize",
  "mail_options",
  "checkout",
  "paid",
  "fulfilling",
  "mailed",
  "tracking",
  "delivered",
  "proof",
];

export const VERTICAL_WORKFLOW_LABELS: Record<VerticalWorkflowState, string> = {
  start: "Start",
  intake: "Intake",
  analyze: "Analyze",
  review_facts: "Review Facts",
  draft: "Draft",
  edit: "Edit",
  finalize: "Finalize",
  mail_options: "Mail Options",
  checkout: "Checkout",
  paid: "Paid",
  fulfilling: "Fulfilling",
  mailed: "Mailed",
  tracking: "Tracking",
  delivered: "Delivered",
  proof: "Proof",
};

// ── Vertical Order Metadata ───────────────────────────────────────────────────

/**
 * Metadata every vertical order carries to identify its origin.
 * One canonical order system — no separate tables per vertical.
 */
export interface VerticalOrderMetadata {
  /** The vertical slug (e.g., "dispute-mail") */
  vertical_slug: string;
  /** The workflow type (e.g., "dispute") */
  workflow: string;
  /** Additional vertical-specific context */
  context?: Record<string, unknown>;
}

// ── AI Workflow Interface ─────────────────────────────────────────────────────

export interface AIWorkflowInput {
  documents?: Array<{ id: string; content: string }>;
  context?: Record<string, unknown>;
}

export interface AIAnalysisResult {
  summary: string;
  keyFacts: Record<string, unknown>;
  confidence: number;
  warnings: string[];
}

export interface AIExtractedFacts {
  facts: Record<string, unknown>;
  sources: Array<{ documentId?: string; text?: string }>;
}

export interface AIDraftInput {
  facts: Record<string, unknown>;
  templateId?: string;
  userInstructions?: string;
}

export interface AIDraftResult {
  content: string;
  pageCount: number;
  metadata?: Record<string, unknown>;
}

export interface AIValidationInput {
  draft: string;
  requirements?: string[];
}

export interface AIValidationResult {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

export interface AIReviseInput {
  draft: string;
  feedback: string;
  facts?: Record<string, unknown>;
}

/**
 * AI Workflow Interface — the contract every vertical's AI engine must implement.
 *
 * Verticals provide prompts and configuration; this interface defines the
 * operations the shared infrastructure exposes back to them.
 *
 * AI output must NEVER bypass human review for mailed documents.
 */
export interface AIWorkflow {
  /** Analyze documents and context to produce a summary and key facts. */
  analyze(input: AIWorkflowInput): Promise<AIAnalysisResult>;
  /** Extract structured facts and their sources from the input. */
  extractFacts(input: AIWorkflowInput): Promise<AIExtractedFacts>;
  /** Generate a draft document from facts and instructions. */
  generateDraft(input: AIDraftInput): Promise<AIDraftResult>;
  /** Validate a draft against requirements and return issues. */
  validate(input: AIValidationInput): Promise<AIValidationResult>;
  /** Revise a draft based on feedback. */
  revise(input: AIReviseInput): Promise<AIDraftResult>;
}
