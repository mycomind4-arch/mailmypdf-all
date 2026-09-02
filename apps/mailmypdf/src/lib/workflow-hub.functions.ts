/**
 * Workflow Hub Server Functions
 *
 * Canonical aggregation layer for workflow discovery, categorization, and user state.
 * Single source of truth for all workflow metadata across MailMyPDF ecosystem.
 */

import { createServerFn } from "@tanstack/start";
import { getRequest } from "vinxi/http";
import type { WorkflowManifest } from "@mailmypdf/workflows";
import { workflowRegistry } from "@mailmypdf/workflows";
import { verticals, type VerticalDefinition, type VerticalCategory } from "@/verticals/registry";
import { withAdmin } from "@/lib/supabase-admin.server";

/* ─────────────────────────────────────────────────────────────────────────── */
/* TYPES                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export type WorkflowCategory =
  | "government"
  | "appeals"
  | "disputes"
  | "housing"
  | "professional"
  | "business"
  | "personal"
  | "legal"
  | "financial"
  | "taxes"
  | "immigration"
  | "records"
  | "code-enforcement"
  | "mail";

export interface WorkflowCatalogEntry {
  // Identity
  id: string;
  slug: string;
  title: string;
  description: string;
  tagline: string;

  // Vertical association
  verticalId: string;
  verticalName: string;
  verticalRoute: string;

  // Categorization
  categories: WorkflowCategory[];
  icon: string;
  primaryCTA: string;

  // State
  status: "draft" | "in_progress" | "submitted" | "waiting_approval" | "complete" | "archived";
  maturity: "catalog" | "placeholder" | "wired" | "executable" | "gold" | "production-verified";

  // Routing
  route: string;
  isLive: boolean;

  // Metadata
  requiresHumanReview: boolean;
  allowsConsequentialAction: boolean;
  popularity: number; // 0-100 based on usage
  tags: string[];
  aliases: string[];

  // Entitlements
  requiresAuth: boolean;
  isPremium: boolean;
  isIncluded: boolean; // In user's current plan

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface UserWorkflowState {
  workflowId: string;
  status: "in_progress" | "completed" | "archived";
  matterId: string;
  runId: string;
  createdAt: string;
  updatedAt: string;
  progressPercent: number;
}

export interface WorkflowHubData {
  workflows: WorkflowCatalogEntry[];
  categorizedWorkflows: Map<WorkflowCategory, WorkflowCatalogEntry[]>;
  popularWorkflows: WorkflowCatalogEntry[];
  userInProgressWorkflows: UserWorkflowState[];
  userFavorites: string[]; // workflow IDs
  userCompletedCount: number;
  availableWorkflowsCount: number;
  premiumWorkflowsCount: number;
}

export interface WorkflowCategoryMetadata {
  category: WorkflowCategory;
  label: string;
  description: string;
  icon: string;
  count: number;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* CATEGORY TAXONOMY                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

const WORKFLOW_CATEGORIES: Record<WorkflowCategory, WorkflowCategoryMetadata> = {
  government: {
    category: "government",
    label: "Government & Public",
    description: "Respond to government notices, permits, and public requests",
    icon: "Landmark",
    count: 0,
  },
  appeals: {
    category: "appeals",
    label: "Appeals & Disputes",
    description: "Appeal benefits denials, insurance claims, and decisions",
    icon: "Scale",
    count: 0,
  },
  disputes: {
    category: "disputes",
    label: "Disputes & Collections",
    description: "Respond to debt collection and dispute anything by mail",
    icon: "ShieldAlert",
    count: 0,
  },
  housing: {
    category: "housing",
    label: "Housing & Landlord",
    description: "Tenant communications and housing-related correspondence",
    icon: "Home",
    count: 0,
  },
  professional: {
    category: "professional",
    label: "Professional Matters",
    description: "High-stakes business and legal correspondence",
    icon: "Briefcase",
    count: 0,
  },
  business: {
    category: "business",
    label: "Small Business",
    description: "Business correspondence, templates, and team workflows",
    icon: "Building2",
    count: 0,
  },
  personal: {
    category: "personal",
    label: "Personal Documents",
    description: "Personal correspondence and document management",
    icon: "FileText",
    count: 0,
  },
  legal: {
    category: "legal",
    label: "Legal Documents",
    description: "Legal correspondence and formal documentation",
    icon: "Scale",
    count: 0,
  },
  financial: {
    category: "financial",
    label: "Financial Matters",
    description: "Financial disputes, claims, and correspondence",
    icon: "DollarSign",
    count: 0,
  },
  taxes: {
    category: "taxes",
    label: "Tax Matters",
    description: "Tax-related correspondence and documentation",
    icon: "Calculator",
    count: 0,
  },
  immigration: {
    category: "immigration",
    label: "Immigration",
    description: "Immigration-related correspondence and documentation",
    icon: "Globe",
    count: 0,
  },
  records: {
    category: "records",
    label: "Records Requests",
    description: "FOIA and public records requests",
    icon: "FolderOpen",
    count: 0,
  },
  "code-enforcement": {
    category: "code-enforcement",
    label: "Code Enforcement",
    description: "Respond to code violations and enforcement notices",
    icon: "AlertCircle",
    count: 0,
  },
  mail: {
    category: "mail",
    label: "Mail Management",
    description: "Send important documents with proof of delivery",
    icon: "Mail",
    count: 0,
  },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* VERTICAL TO CATEGORY MAPPING                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

function getVerticalCategories(vertical: VerticalDefinition): WorkflowCategory[] {
  const categoryMap: Record<VerticalCategory, WorkflowCategory[]> = {
    government: ["government", "mail", "records"],
    appeals: ["appeals", "disputes", "mail"],
    disputes: ["disputes", "mail"],
    housing: ["housing", "mail"],
    professional: ["professional", "mail", "legal"],
    business: ["business", "mail", "personal"],
  };

  return categoryMap[vertical.category as VerticalCategory] || ["mail"];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW CATALOG AGGREGATION                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Build complete workflow catalog aggregating workflows from registry and verticals
 */
function buildWorkflowCatalog(): WorkflowCatalogEntry[] {
  const catalog: WorkflowCatalogEntry[] = [];

  // Get all live workflows from registry
  const registryWorkflows = workflowRegistry.executable();

  for (const workflow of registryWorkflows) {
    // Find matching vertical
    const vertical = verticals.find((v) => v.id === workflow.vertical);
    if (!vertical) continue; // Skip orphaned workflows

    const entry: WorkflowCatalogEntry = {
      // Identity
      id: workflow.id,
      slug: workflow.id.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: workflow.title,
      description: vertical.description,
      tagline: vertical.tagline,

      // Vertical association
      verticalId: vertical.id,
      verticalName: vertical.name,
      verticalRoute: vertical.route,

      // Categorization
      categories: getVerticalCategories(vertical),
      icon: vertical.icon,
      primaryCTA: vertical.primaryCTA,

      // State
      status: "draft",
      maturity: workflow.maturity,

      // Routing
      route: workflow.route,
      isLive: vertical.status === "live",

      // Metadata
      requiresHumanReview: workflow.requiresHumanReview,
      allowsConsequentialAction: workflow.allowsConsequentialAction,
      popularity: calculatePopularity(workflow.id),
      tags: extractTags(workflow),
      aliases: [vertical.slug, vertical.shortName.toLowerCase()],

      // Entitlements (will be populated per-user)
      requiresAuth: true,
      isPremium: workflow.maturity !== "catalog",
      isIncluded: false, // Updated per-user

      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    catalog.push(entry);
  }

  return catalog;
}

/**
 * Calculate workflow popularity (0-100) based on internal heuristics
 * For now, returns based on maturity level
 */
function calculatePopularity(workflowId: string): number {
  // TODO: Integrate with analytics to track actual usage
  // For MVP, use maturity level as proxy
  const maturity = workflowRegistry.get(workflowId)?.maturity;
  const scores: Record<string, number> = {
    "production-verified": 95,
    gold: 85,
    executable: 70,
    wired: 50,
    placeholder: 20,
    catalog: 10,
  };
  return scores[maturity || "catalog"] || 10;
}

/**
 * Extract searchable tags from workflow
 */
function extractTags(workflow: WorkflowManifest): string[] {
  const tags = [];

  // Add capability-based tags
  for (const capability of workflow.requiredCapabilities) {
    tags.push(capability);
  }

  // Add metadata from vertical
  const vertical = verticals.find((v) => v.id === workflow.vertical);
  if (vertical) {
    if (vertical.capabilities?.requiresAI) tags.push("ai-powered");
    if (vertical.capabilities?.requiresDocuments) tags.push("document-required");
    if (vertical.capabilities?.supportsMailing) tags.push("mailing");
  }

  return tags;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SERVER FUNCTIONS                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Fetch workflow catalog for discovery
 */
export const getWorkflowCatalog = createServerFn(
  { method: "GET" },
  async () => {
    return buildWorkflowCatalog();
  }
);

/**
 * Fetch complete workflow hub data for authenticated user
 */
export const getWorkflowHubData = createServerFn(
  { method: "GET" },
  async () => {
    const request = getRequest();
    const userId = request?.headers.get("x-user-id");

    if (!userId) {
      throw new Error("Authentication required");
    }

    // 1. Get workflow catalog
    const workflows = buildWorkflowCatalog();

    // 2. Get user's entitlements
    const hubData = await withAdmin(async (supabase) => {
      const { data: entitlementAssignments } = await supabase
        .from("entitlement_assignments")
        .select(
          `
          id,
          entitlement_policy_id,
          entitlement_policies(
            private_office_included,
            premium_workflows_included,
            ai_processing_free
          )
        `
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .is("expires_at", null);

      const hasPremium = entitlementAssignments?.some(
        (a: any) => a.entitlement_policies?.premium_workflows_included
      );
      const hasPrivateOffice = entitlementAssignments?.some(
        (a: any) => a.entitlement_policies?.private_office_included
      );

      // 3. Filter workflows based on entitlements
      const userWorkflows = workflows.map((w) => {
        const isIncluded =
          !w.isPremium ||
          (w.verticalId === "private-office" && hasPrivateOffice) ||
          (hasPremium && w.verticalId !== "private-office");

        return { ...w, isIncluded };
      });

      // 4. Get user's in-progress workflows
      const { data: userWorkflowRuns } = await supabase
        .from("workflow_runs")
        .select("*")
        .eq("owner_id", userId)
        .eq("status", "running")
        .order("updated_at", { ascending: false })
        .limit(10);

      const inProgressWorkflows: UserWorkflowState[] = (userWorkflowRuns || [])
        .map((run: any) => ({
          workflowId: run.workflow_id,
          status: "in_progress" as const,
          matterId: run.matter_id,
          runId: run.id,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
          progressPercent: calculateProgress(run.completed_stages?.length || 0),
        }))
        .filter(Boolean);

      // 5. Get user's favorites
      const { data: favoritesData } = await supabase
        .from("workflow_favorites")
        .select("workflow_id")
        .eq("user_id", userId)
        .eq("is_active", true);

      const userFavorites = (favoritesData || []).map((f: any) => f.workflow_id);

      // 6. Get user's completed count
      const { count: completedCount } = await supabase
        .from("workflow_runs")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userId)
        .eq("status", "completed");

      // 7. Categorize workflows
      const categorizedWorkflows = new Map<WorkflowCategory, WorkflowCatalogEntry[]>();
      for (const workflow of userWorkflows) {
        for (const category of workflow.categories) {
          if (!categorizedWorkflows.has(category)) {
            categorizedWorkflows.set(category, []);
          }
          categorizedWorkflows.get(category)!.push(workflow);
        }
      }

      // 8. Get popular workflows
      const sortedByPopularity = [...userWorkflows].sort(
        (a, b) => b.popularity - a.popularity
      );
      const popularWorkflows = sortedByPopularity.slice(0, 6);

      return {
        workflows: userWorkflows,
        categorizedWorkflows,
        popularWorkflows,
        userInProgressWorkflows: inProgressWorkflows,
        userFavorites,
        userCompletedCount: completedCount || 0,
        availableWorkflowsCount: userWorkflows.filter((w) => !w.isPremium).length,
        premiumWorkflowsCount: userWorkflows.filter((w) => w.isPremium && w.isIncluded).length,
      } as WorkflowHubData;
    });

    return hubData;
  }
);

/**
 * Search workflows by query
 */
export const searchWorkflows = createServerFn(
  { method: "GET" },
  async (query: string) => {
    const catalog = buildWorkflowCatalog();
    const q = query.toLowerCase();

    return catalog.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.tagline.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q)) ||
        w.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }
);

/**
 * Get workflows by category
 */
export const getWorkflowsByCategory = createServerFn(
  { method: "GET" },
  async (category: WorkflowCategory) => {
    const catalog = buildWorkflowCatalog();
    return catalog.filter((w) => w.categories.includes(category));
  }
);

/**
 * Toggle workflow favorite for authenticated user
 */
export const toggleWorkflowFavorite = createServerFn(
  { method: "POST" },
  async (workflowId: string, isFavorite: boolean) => {
    const request = getRequest();
    const userId = request?.headers.get("x-user-id");

    if (!userId) {
      throw new Error("Authentication required");
    }

    await withAdmin(async (supabase) => {
      if (isFavorite) {
        // Add to favorites
        await supabase.from("workflow_favorites").upsert(
          {
            user_id: userId,
            workflow_id: workflowId,
            is_active: true,
          },
          { onConflict: "user_id,workflow_id" }
        );
      } else {
        // Remove from favorites
        await supabase
          .from("workflow_favorites")
          .update({ is_active: false })
          .eq("user_id", userId)
          .eq("workflow_id", workflowId);
      }
    });

    return { success: true };
  }
);

/**
 * Get category taxonomy with counts
 */
export const getWorkflowCategories = createServerFn(
  { method: "GET" },
  async () => {
    const catalog = buildWorkflowCatalog();
    const categories: WorkflowCategoryMetadata[] = [];

    for (const [categoryKey, categoryMeta] of Object.entries(WORKFLOW_CATEGORIES)) {
      const count = catalog.filter((w) =>
        w.categories.includes(categoryKey as WorkflowCategory)
      ).length;

      if (count > 0) {
        categories.push({ ...categoryMeta, count });
      }
    }

    return categories.sort((a, b) => b.count - a.count);
  }
);

/* ─────────────────────────────────────────────────────────────────────────── */
/* HELPERS                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function calculateProgress(completedStages: number): number {
  // Rough estimate: 5 stages per workflow = 20% each
  return Math.min(100, completedStages * 20);
}
