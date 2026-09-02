/**
 * Factory Wrapper
 *
 * Re-exports the canonical factory runtime from @mailmypdf/workflows
 * to handle workspace package resolution in Vite/Rolldown.
 */

// Import from the actual source files using relative path to bypass Rolldown's package resolution
// Path: from apps/verticals/notice-respond/src/platform/factory-wrapper.ts
// To: packages/workflows/src/configured-pipeline.js
export { runConfiguredPipeline } from "../../../../../packages/workflows/src/configured-pipeline.js";
export type { PipelineResult, StageResult } from "../../../../../packages/workflows/src/domain-pack-contract.js";
