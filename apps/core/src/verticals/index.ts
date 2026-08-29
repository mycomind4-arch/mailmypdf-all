/**
 * Verticals — Public API
 *
 * Import vertical metadata, types, and helpers from here.
 *
 * Usage:
 *   import { verticals, getVerticalBySlug, CATEGORY_LABELS } from "@/verticals";
 *   import type { VerticalDefinition, VerticalStatus } from "@/verticals";
 */

export { verticals, getVerticalBySlug, getVerticalByRoute, getVerticalsByCategory,
  getVerticalsByStatus, getNavigationVerticals, getLiveVerticals,
  getVerticalsByCategoryForNav, isVerticalLive, shouldIndexVertical } from "./registry";

export { CATEGORY_LABELS } from "./types";

export type {
  VerticalDefinition, VerticalStatus, VerticalCategory, VerticalCapabilities,
  VerticalSeo, LiveCriteria, VerticalWorkflowState, VerticalOrderMetadata,
  AIWorkflow, AIWorkflowInput, AIAnalysisResult, AIExtractedFacts,
  AIDraftInput, AIDraftResult, AIValidationInput, AIValidationResult,
  AIReviseInput,
} from "./types";

export { VERTICAL_WORKFLOW_STATES, VERTICAL_WORKFLOW_LABELS } from "./types";
