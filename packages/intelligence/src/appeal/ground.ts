/* Appeal grounds promoted from the legacy Appeal Mail domain layer. */

export const GROUND_TYPES = [
  "factual_error",
  "procedural_error",
  "legal_error",
  "new_evidence",
  "insufficient_weight",
  "misapplied_rule",
  "contradictory_finding",
  "incomplete_review",
] as const;

export type GroundType = (typeof GROUND_TYPES)[number];

export const GROUND_TYPE_LABELS: Record<GroundType, string> = {
  factual_error: "Factual Error",
  procedural_error: "Procedural Error",
  legal_error: "Legal Error",
  new_evidence: "New Evidence",
  insufficient_weight: "Insufficient Weight Given to Evidence",
  misapplied_rule: "Misapplied Rule or Regulation",
  contradictory_finding: "Contradictory Finding",
  incomplete_review: "Incomplete Review",
};

export const GROUND_TYPE_DESCRIPTIONS: Record<GroundType, string> = {
  factual_error: "The decision relies on a fact that is incorrect or unsupported.",
  procedural_error: "The required process was not followed.",
  legal_error: "The wrong legal standard was applied.",
  new_evidence: "New information not considered in the original decision.",
  insufficient_weight: "Relevant evidence was not given adequate consideration.",
  misapplied_rule: "A rule or regulation was applied incorrectly to your situation.",
  contradictory_finding: "The decision contains internal contradictions.",
  incomplete_review: "The decision-maker did not review all relevant material.",
};

export interface AppealGround {
  id: string;
  type: GroundType;
  claim: string;
  source: string;
  supportingEvidenceIds: string[];
  counterargument?: string;
  confidence: number;
  unresolvedIssue?: string;
  userConfirmed: boolean;
  draftLanguage: string;
}

function isGroundType(value: unknown): value is GroundType {
  return typeof value === "string" && (GROUND_TYPES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const appealGroundSchema = {
  parse(input: unknown): AppealGround {
    if (!isRecord(input) || typeof input.id !== "string" || !isGroundType(input.type)) {
      throw new Error("Invalid appeal ground");
    }
    if (typeof input.claim !== "string" || typeof input.source !== "string") {
      throw new Error("Appeal ground requires claim and source");
    }
    const supportingEvidenceIds = input.supportingEvidenceIds === undefined
      ? []
      : Array.isArray(input.supportingEvidenceIds) && input.supportingEvidenceIds.every((value) => typeof value === "string")
        ? input.supportingEvidenceIds as string[]
        : (() => { throw new Error("Invalid supporting evidence ids"); })();
    const confidence = typeof input.confidence === "number" && Number.isFinite(input.confidence)
      ? Math.min(1, Math.max(0, input.confidence))
      : 0.5;
    return {
      id: input.id,
      type: input.type,
      claim: input.claim,
      source: input.source,
      supportingEvidenceIds,
      confidence,
      userConfirmed: typeof input.userConfirmed === "boolean" ? input.userConfirmed : false,
      draftLanguage: typeof input.draftLanguage === "string" ? input.draftLanguage : "",
      ...(typeof input.counterargument === "string" ? { counterargument: input.counterargument } : {}),
      ...(typeof input.unresolvedIssue === "string" ? { unresolvedIssue: input.unresolvedIssue } : {}),
    };
  },
};

export function createGround(type: GroundType, partial: Partial<AppealGround> = {}): AppealGround {
  return appealGroundSchema.parse({
    id: crypto.randomUUID(),
    type,
    claim: "",
    source: "user_provided",
    supportingEvidenceIds: [],
    confidence: 0.5,
    userConfirmed: false,
    draftLanguage: "",
    ...partial,
  });
}

export function groundToParagraph(ground: AppealGround): string {
  const parts: string[] = [];
  if (ground.claim) parts.push(ground.claim);
  if (ground.source) parts.push(`The decision states: "${ground.source}".`);
  if (ground.counterargument) parts.push(ground.counterargument);
  return parts.join(" ");
}

export function groundsSummary(grounds: AppealGround[]): string {
  return grounds.map((ground, index) => `${index + 1}. ${GROUND_TYPE_LABELS[ground.type]}: ${ground.claim}`).join("\n");
}
