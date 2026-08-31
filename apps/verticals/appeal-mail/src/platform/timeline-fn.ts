import { defineEventHandler, readBody } from "h3";
import {
  buildTimeline,
  explainConflict,
  conflictToGround,
  type TimelineDocument,
  type BuildTimelineInput,
  type TimelineResult,
  type TimelineConflict,
} from "../domain/timeline";
import type { Decision } from "../domain/decision";
import type { XRayFinding } from "../domain/xray";

/* ═══════════════════════════════════════════════════════════
   APPEAL TIMELINE™ SERVER FUNCTIONS
   HTTP endpoints for building, enriching, and querying
   the canonical timeline.
   ═══════════════════════════════════════════════════════════ */

/* ── POST /api/timeline/build ──
   Reconstruct the timeline from uploaded documents.
   Body: BuildTimelineInput (documents, decision, xrayFindings, userEvents)
   Returns: TimelineResult
   */
export const buildTimelineHandler = defineEventHandler(async (event) => {
  const body = await readBody<BuildTimelineInput>(event);

  if (!body.documents || body.documents.length === 0) {
    return {
      error: "No documents provided",
      result: null,
    };
  }

  const result = buildTimeline(body);
  return { result };
});

/* ── POST /api/timeline/explain-conflict ──
   Generate alternative explanations for a timeline conflict.
   (Stress Test integration)
   Body: { conflict: TimelineConflict }
   Returns: { explanations: string[] }
   */
export const explainConflictHandler = defineEventHandler(async (event) => {
  const body = await readBody<{ conflict: TimelineConflict }>(event);

  if (!body.conflict) {
    return { error: "No conflict provided", explanations: [] };
  }

  const explanations = explainConflict(body.conflict);
  return { explanations };
});

/* ── POST /api/timeline/conflict-to-ground ──
   Convert a timeline conflict into a candidate appeal ground.
   Body: { conflict: TimelineConflict }
   Returns: { type, claim, source }
   */
export const conflictToGroundHandler = defineEventHandler(async (event) => {
  const body = await readBody<{ conflict: TimelineConflict }>(event);

  if (!body.conflict) {
    return { error: "No conflict provided", ground: null };
  }

  const ground = conflictToGround(body.conflict);
  return { ground };
});

/* ── Export the main build function for direct import ── */
export { buildTimeline } from "../domain/timeline";
export type { TimelineResult, TimelineEvent, TimelineConflict, TimelineGap, DeadlineCalculation } from "../domain/timeline";
