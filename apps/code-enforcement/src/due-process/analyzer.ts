// ─── DUE-PROCESS ANALYZER (TypeScript port) ──────────────────────────────
// Ported from fairprocessmaps/backend/api/src/services/due_process_analyzer.py
// Timeline sorting is correct (bug was in the Python relationship-replay,
// not in the analyzer logic itself — we sort by event_date explicitly).

import type { FindingType, UnifiedFinding, FindingSeverity } from "../findings/taxonomy";
import { createFinding } from "../findings/taxonomy";

// ── Types ───────────────────────────────────────────────────────────────

export interface DueProcessTimelineEvent {
  id: string;
  eventType: string;
  eventDate: Date;
  receivingParty?: string;
  evidenceId?: string;
  description?: string;
}

export interface DueProcessEvidenceItem {
  id: string;
  ocrText?: string;
  extractedMarkdown?: string;
  propertyId?: string;
}

export interface DueProcessFlag {
  ruleId: string;
  ruleName: string;
  severity: FindingSeverity;
  description: string;
  evidenceIds: string[];
  suggestedAction: string;
}

export interface DueProcessReport {
  propertyId: string;
  overallScore: number;
  flags: DueProcessFlag[];
  summary: string;
  recommendations: string[];
}

// ── Rules ───────────────────────────────────────────────────────────────

const RULES = {
  notice_timing: {
    name: "Adequate Notice Period",
    description: "Property owner must receive notice at least X days before hearing/action",
    defaultDays: 10,
    severity: "critical" as FindingSeverity,
  },
  hearing_right: {
    name: "Right to Hearing",
    description: "Owner must be offered an opportunity to contest before adverse action",
    severity: "critical" as FindingSeverity,
  },
  appeal_pathway: {
    name: "Appeal Pathway Available",
    description: "Decision must include information on how to appeal",
    severity: "medium" as FindingSeverity,
  },
  record_access: {
    name: "Public Record Accessibility",
    description: "Relevant records must be accessible via FOIA or public portal",
    severity: "medium" as FindingSeverity,
  },
  consistent_application: {
    name: "Consistent Application",
    description: "Enforcement actions should be consistent with prior similar cases",
    severity: "info" as FindingSeverity,
  },
} as const;

// ── Analyzer ────────────────────────────────────────────────────────────

export class DueProcessAnalyzer {
  analyze(
    evidenceList: DueProcessEvidenceItem[],
    timeline: DueProcessTimelineEvent[]
  ): DueProcessReport {
    // Sort timeline chronologically (fixes the bug — never trust unsorted input)
    const sortedTimeline = [...timeline].sort(
      (a, b) => a.eventDate.getTime() - b.eventDate.getTime()
    );

    const flags: DueProcessFlag[] = [];

    // Rule 1: Notice timing
    const noticeEvents = sortedTimeline.filter((e) =>
      /notice/i.test(e.eventType)
    );
    const actionEvents = sortedTimeline.filter((e) =>
      /hearing|decision|enforcement|fine|penalty|lien|demolition|eviction/i.test(e.eventType)
    );

    for (const action of actionEvents) {
      const matchingNotices = noticeEvents.filter(
        (n) =>
          n.receivingParty === action.receivingParty &&
          n.eventDate <= action.eventDate
      );
      if (matchingNotices.length === 0) {
        flags.push({
          ruleId: "notice_timing",
          ruleName: RULES.notice_timing.name,
          severity: "critical",
          description: `No prior notice found before ${action.eventType} on ${action.eventDate.toISOString().split("T")[0]}`,
          evidenceIds: action.evidenceId ? [action.evidenceId] : [],
          suggestedAction: "Verify if notice was given through alternative channel",
        });
      } else {
        const latestNotice = matchingNotices.reduce((latest, n) =>
          n.eventDate > latest.eventDate ? n : latest
        );
        const daysDiff = Math.floor(
          (action.eventDate.getTime() - latestNotice.eventDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysDiff < RULES.notice_timing.defaultDays) {
          flags.push({
            ruleId: "notice_timing",
            ruleName: RULES.notice_timing.name,
            severity: "medium",
            description: `Only ${daysDiff} days between notice and action (minimum: ${RULES.notice_timing.defaultDays})`,
            evidenceIds: [
              ...(latestNotice.evidenceId ? [latestNotice.evidenceId] : []),
              ...(action.evidenceId ? [action.evidenceId] : []),
            ],
            suggestedAction: "Check jurisdiction-specific notice requirements",
          });
        }
      }
    }

    // Rule 2: Hearing right
    const hasHearing = sortedTimeline.some((e) => /hearing/i.test(e.eventType));
    const hasAdverseAction = sortedTimeline.some((e) =>
      /fine|penalty|lien|demolition|eviction/i.test(e.eventType)
    );
    if (hasAdverseAction && !hasHearing) {
      flags.push({
        ruleId: "hearing_right",
        ruleName: RULES.hearing_right.name,
        severity: "critical",
        description: "Adverse action taken without recorded hearing opportunity",
        evidenceIds: [],
        suggestedAction: "Request hearing transcript or verify administrative waiver",
      });
    }

    // Rule 3: Appeal pathway
    const decisionEvents = sortedTimeline.filter((e) =>
      /decision/i.test(e.eventType)
    );
    for (const decision of decisionEvents) {
      const relatedEvidence = evidenceList.filter(
        (ev) => ev.id === decision.evidenceId
      );
      for (const ev of relatedEvidence) {
        const text = (ev.ocrText || "") + (ev.extractedMarkdown || "");
        if (!/appeal|review/i.test(text)) {
          flags.push({
            ruleId: "appeal_pathway",
            ruleName: RULES.appeal_pathway.name,
            severity: "medium",
            description: `Decision on ${decision.eventDate.toISOString().split("T")[0]} does not mention appeal rights`,
            evidenceIds: decision.evidenceId ? [decision.evidenceId] : [],
            suggestedAction: "Verify appeal rights under local administrative code",
          });
        }
      }
    }

    // Score
    const critical = flags.filter((f) => f.severity === "critical").length;
    const warning = flags.filter((f) => f.severity === "medium").length;
    const score = Math.max(0, 100 - critical * 25 - warning * 10);

    const summary = `Analysis complete: ${flags.length} flag(s) found (${critical} critical, ${warning} warning).`;

    const recommendations: string[] = [];
    if (critical > 0)
      recommendations.push("Immediate legal review recommended due to critical due-process flags.");
    if (warning > 0)
      recommendations.push("Follow up on warning-level discrepancies with jurisdiction clerk.");
    if (flags.length === 0)
      recommendations.push("No due-process discrepancies detected in available records.");

    return {
      propertyId: evidenceList[0]?.propertyId || "",
      overallScore: score,
      flags,
      summary,
      recommendations,
    };
  }

  toFindings(report: DueProcessReport): UnifiedFinding[] {
    return report.flags.map((flag) => {
      const type = flagToType(flag.ruleId);
      return createFinding({
        type,
        severity: flag.severity === "medium" ? "medium" : flag.severity,
        statement: flag.description,
        supportingFacts: flag.evidenceIds.length > 0
          ? flag.evidenceIds
          : ["timeline-analysis"],
        confidence: flag.evidenceIds.length > 0 ? "high" : "medium",
        recommendedAction: flag.suggestedAction,
        source: "due-process",
        evidenceIds: flag.evidenceIds,
        analysisRule: flag.ruleId,
      });
    });
  }
}

function flagToType(ruleId: string): FindingType {
  switch (ruleId) {
    case "notice_timing":
      return "NOTICE_TIMING_VIOLATION";
    case "hearing_right":
      return "HEARING_RIGHT_VIOLATION";
    case "appeal_pathway":
      return "APPEAL_PATHWAY_MISSING";
    default:
      return "FACIAL_DEFECT";
  }
}
