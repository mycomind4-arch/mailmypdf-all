import { createServerFn } from "@tanstack/react-start";
import { runStressTest, type StressTestResult } from "@/domain/stress-test";
import type { AppealGround } from "@/domain/ground";
import type { Evidence } from "@/domain/evidence";
import type { XRayResult, XRayFinding } from "@/domain/xray";
import type { Decision } from "@/domain/decision";
import {
  enhanceStressTestResult,
  type EnhancedStressTestResult,
} from "@/platform/intelligence-adapter";
import {
  type AuditEventType,
} from "@/lib/platform/intelligence";

/* ─────────────────────────────────────────────
   Stress Test Server Function
   Runs adversarial analysis on the user's
   grounds, evidence, and draft.

   Upgraded with platform intelligence:
   - Evidence evaluation with provenance weighting
   - Contradiction detection (singular vs potential)
   - Case assessment with recommended actions
   ───────────────────────────────────────────── */

export const runStressTestFn = createServerFn()
  .validator((input: {
    grounds: AppealGround[];
    evidence: Evidence[];
    draft: string;
    xrayResult: XRayResult | null;
    decision?: Decision;
    userId?: string;
  }) => input)
  .handler(async ({ data }) => {
    if (!data.grounds || data.grounds.length === 0) {
      throw new Error("At least one ground is required to run the stress test");
    }

    // Run existing Benefits Appeal stress test
    const baseResult = runStressTest(
      data.grounds,
      data.evidence,
      data.draft,
      data.xrayResult,
    );

    // If decision is provided, enhance with platform intelligence
    if (data.decision) {
      const xrayFindings: XRayFinding[] = data.xrayResult?.findings || [];
      const enhanced = enhanceStressTestResult(
        baseResult,
        data.evidence,
        data.grounds,
        data.decision,
        xrayFindings,
      );
      return enhanced;
    }

    // Without decision, return base result with empty platform enhancements
    return {
      ...baseResult,
      evidenceEvaluations: new Map(),
      contradictions: [],
      caseAssessment: {
        status: "in_review",
        readiness: {
          score: baseResult.summary.overallScore,
          checks: [],
          issuesRequiringAttention: baseResult.summary.vulnerable,
          ready: baseResult.summary.overallScore >= 60,
        },
        recommendedActions: [],
        summary: "Decision data not provided — platform intelligence limited.",
        assessedAt: new Date().toISOString(),
      },
    } as EnhancedStressTestResult;
  });
