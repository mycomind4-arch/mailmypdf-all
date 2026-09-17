/* Appeal strategy/argument model promoted from the legacy Appeal Mail domain. */

export type ArgumentStrength = "strong" | "moderate" | "weak";
export type AppealContradictionSeverity = "high" | "medium" | "low";

export interface AppealContradiction {
  id: string;
  description: string;
  sources: string[];
  severity: AppealContradictionSeverity;
  resolved: boolean;
  resolution?: string;
}

export type Contradiction = AppealContradiction;

export interface AppealArgument {
  id: string;
  groundId: string;
  heading: string;
  body: string;
  evidenceIds: string[];
  citations: string[];
  strength: ArgumentStrength;
  contradictions: AppealContradiction[];
}

export type Argument = AppealArgument;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error(`Invalid ${field}`);
  }
  return value as string[];
}

export const contradictionSchema = {
  parse(input: unknown): AppealContradiction {
    if (!isRecord(input) || typeof input.id !== "string" || typeof input.description !== "string") {
      throw new Error("Invalid appeal contradiction");
    }
    if (input.severity !== "high" && input.severity !== "medium" && input.severity !== "low") {
      throw new Error("Invalid appeal contradiction severity");
    }
    return {
      id: input.id,
      description: input.description,
      sources: stringArray(input.sources, "contradiction sources"),
      severity: input.severity,
      resolved: typeof input.resolved === "boolean" ? input.resolved : false,
      ...(typeof input.resolution === "string" ? { resolution: input.resolution } : {}),
    };
  },
};

export const argumentSchema = {
  parse(input: unknown): AppealArgument {
    if (!isRecord(input) || typeof input.id !== "string" || typeof input.groundId !== "string" || typeof input.heading !== "string" || typeof input.body !== "string") {
      throw new Error("Invalid appeal argument");
    }
    const strength: ArgumentStrength = input.strength === "strong" || input.strength === "weak" || input.strength === "moderate"
      ? input.strength
      : "moderate";
    const contradictions = input.contradictions === undefined
      ? []
      : Array.isArray(input.contradictions)
        ? input.contradictions.map((entry) => contradictionSchema.parse(entry))
        : (() => { throw new Error("Invalid appeal argument contradictions"); })();
    return {
      id: input.id,
      groundId: input.groundId,
      heading: input.heading,
      body: input.body,
      evidenceIds: stringArray(input.evidenceIds, "argument evidence ids"),
      citations: stringArray(input.citations, "argument citations"),
      strength,
      contradictions,
    };
  },
};

export function createArgument(
  groundId: string,
  heading: string,
  body: string,
  partial: Partial<AppealArgument> = {},
): AppealArgument {
  return argumentSchema.parse({
    id: crypto.randomUUID(),
    groundId,
    heading,
    body,
    evidenceIds: [],
    citations: [],
    strength: "moderate",
    contradictions: [],
    ...partial,
  });
}

export function detectContradictions(
  decisionReasons: string[],
  _userFacts: string[],
  draftText: string,
): AppealContradiction[] {
  const contradictions: AppealContradiction[] = [];
  const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
  const draftDates = draftText.match(datePattern) ?? [];
  const reasonDates = decisionReasons.join(" ").match(datePattern) ?? [];

  for (const date of draftDates) {
    if (reasonDates.length > 0 && !reasonDates.includes(date)) {
      contradictions.push({
        id: crypto.randomUUID(),
        description: `Date "${date}" in the draft does not appear in the decision reasons. Verify this date is correct.`,
        sources: ["draft", "decision"],
        severity: "medium",
        resolved: false,
      });
    }
  }

  return contradictions;
}
