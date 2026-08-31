import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   NOTICE TYPE CLASSIFICATION
   Deterministic pattern-based classification of notice types.
   Not an LLM — this is deterministic infrastructure.
   ═══════════════════════════════════════════════════════════ */

export const noticeTypeSchema = z.enum([
  "irs_cp2000",
  "irs_cp14",
  "irs_cp504",
  "irs_letter",
  "court_summons",
  "court_complaint",
  "state_tax_assessment",
  "license_suspension",
  "benefits_denial",
  "agency_action",
  "foia_determination",
  "appeal_denial",
  "other",
]);
export type NoticeType = z.infer<typeof noticeTypeSchema>;

export interface NoticeTypeMeta {
  label: string;
  category: "irs" | "court" | "state_tax" | "licensing" | "benefits" | "agency" | "other";
  description: string;
}

export const NOTICE_TYPE_META: Record<NoticeType, NoticeTypeMeta> = {
  irs_cp2000: {
    label: "IRS CP2000 — Underreported Income",
    category: "irs",
    description: "The IRS is proposing changes based on income mismatch between your return and third-party reports.",
  },
  irs_cp14: {
    label: "IRS CP14 — Balance Due",
    category: "irs",
    description: "The IRS is notifying you of an unpaid balance on your account.",
  },
  irs_cp504: {
    label: "IRS CP504 — Intent to Levy",
    category: "irs",
    description: "The IRS intends to levy your assets if the balance is not paid.",
  },
  irs_letter: {
    label: "IRS Letter",
    category: "irs",
    description: "A general correspondence from the IRS.",
  },
  court_summons: {
    label: "Court Summons",
    category: "court",
    description: "A summons requiring you to appear or respond to a court complaint.",
  },
  court_complaint: {
    label: "Court Complaint",
    category: "court",
    description: "A formal complaint filed in court requiring a response.",
  },
  state_tax_assessment: {
    label: "State Tax Assessment",
    category: "state_tax",
    description: "A state tax authority is assessing additional taxes or proposing changes.",
  },
  license_suspension: {
    label: "License Suspension/Revocation",
    category: "licensing",
    description: "A licensing board is proposing to suspend or revoke a professional license.",
  },
  benefits_denial: {
    label: "Benefits Denial",
    category: "benefits",
    description: "A government agency has denied benefits and you have appeal rights.",
  },
  agency_action: {
    label: "Agency Action",
    category: "agency",
    description: "A regulatory agency has taken or proposed an action requiring a response.",
  },
  foia_determination: {
    label: "FOIA Determination",
    category: "agency",
    description: "A Freedom of Information Act request determination that may be appealed.",
  },
  appeal_denial: {
    label: "Appeal Denial",
    category: "agency",
    description: "An initial appeal has been denied and further action may be available.",
  },
  other: {
    label: "Other Notice",
    category: "other",
    description: "A notice that does not match known categories.",
  },
};

/* ── Classification patterns (deterministic) ── */

interface ClassificationPattern {
  type: NoticeType;
  patterns: RegExp[];
  minMatches: number;
}

const CLASSIFICATION_PATTERNS: ClassificationPattern[] = [
  {
    type: "irs_cp2000",
    patterns: [/CP\s*2000/i, /underreport/i, /under-?report/i, /third.?part/i],
    minMatches: 1,
  },
  {
    type: "irs_cp14",
    patterns: [/CP\s*14\b/i, /balance.?due/i, /unpaid.?balance/i],
    minMatches: 1,
  },
  {
    type: "irs_cp504",
    patterns: [/CP\s*504/i, /intent.?to.?lev/i, /final.?notice/i, /seizure/i],
    minMatches: 1,
  },
  {
    type: "court_summons",
    patterns: [/summons/i, /summoned/i, /appear.{0,20}court/i, /file.{0,20}response.{0,20}within/i],
    minMatches: 1,
  },
  {
    type: "court_complaint",
    patterns: [/complaint/i, /plaintiff/i, /defendant/i, /civil.?action/i],
    minMatches: 1,
  },
  {
    type: "state_tax_assessment",
    patterns: [/franchise.?tax/i, /state.?tax/i, /proposed.?assessment/i, /department.?of.?revenue/i],
    minMatches: 1,
  },
  {
    type: "license_suspension",
    patterns: [/license.?suspend/i, /license.?revok/i, /professional.?license/i, /board.?of.?(professional|licens)/i],
    minMatches: 1,
  },
  {
    type: "benefits_denial",
    patterns: [/disapproved/i, /denied.?benefit/i, /social.?security/i, /disability/i, /benefits?.?den/i],
    minMatches: 1,
  },
  {
    type: "foia_determination",
    patterns: [/freedom.?of.?information/i, /foia/i, /public.?records/i],
    minMatches: 1,
  },
  {
    type: "irs_letter",
    patterns: [/internal.?revenue/i, /\bIRS\b/i, /treasury/i],
    minMatches: 1,
  },
  {
    type: "agency_action",
    patterns: [/agency/i, /regulatory/i, /proposed.?action/i, /notice.?of.?action/i],
    minMatches: 1,
  },
];

export function classifyNoticeType(text: string): { type: NoticeType; confidence: number } {
  if (!text || text.trim().length < 10) {
    return { type: "other", confidence: 0.1 };
  }

  // Generic/fallback types that should yield to specific types
  const GENERIC_TYPES = new Set<NoticeType>(["irs_letter", "agency_action", "other"]);

  const scores: { type: NoticeType; confidence: number; matchCount: number }[] = [];

  for (const entry of CLASSIFICATION_PATTERNS) {
    let matchCount = 0;
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) matchCount++;
    }
    if (matchCount >= entry.minMatches) {
      // Confidence based on proportion of patterns matched
      let confidence = Math.min(0.95, 0.4 + (matchCount / entry.patterns.length) * 0.5);
      // Boost specific types: if a specific type matches, boost its confidence
      // so it wins over generic types with many pattern matches
      if (!GENERIC_TYPES.has(entry.type)) {
        confidence = Math.min(0.98, confidence + 0.3);
      }
      scores.push({ type: entry.type, confidence, matchCount });
    }
  }

  if (scores.length === 0) {
    return { type: "other", confidence: 0.2 };
  }

  // If a specific type matched, prefer it over generic types
  const specific = scores.filter((s) => !GENERIC_TYPES.has(s.type));
  const pool = specific.length > 0 ? specific : scores;

  // Pick highest confidence, with tie-breaking by match count
  pool.sort((a, b) => b.confidence - a.confidence || b.matchCount - a.matchCount);
  return { type: pool[0].type, confidence: pool[0].confidence };
}
