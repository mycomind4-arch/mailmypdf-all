/**
 * BenefitsAppeal — Claude Provider
 *
 * 1. analyzeDenial — reviews the benefits denial, identifies the
 *    appropriate appeal level and process, checks deadlines, and
 *    provides a checklist of supporting documents.
 * 2. draftAppeal — generates a formal benefits appeal letter
 *    that states the appellant's case, references evidence, and
 *    requests a hearing or reconsideration.
 */

import { z } from "zod";
import type { BenefitsAppealAnalysis, BenefitsAppealInput } from "../benefits-appeal";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
const API = "https://api.anthropic.com/v1/messages";

async function callClaude(body: unknown) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  const response = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Claude API error (${response.status})`);
  const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = payload.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("Claude returned no content");
  return text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
}

const AnalysisSchema = z.object({
  suggestedAction: z.string().nullable(),
  deadlineInfo: z.string().nullable(),
  deadlinePassed: z.boolean(),
  warnings: z.array(z.string()),
  tips: z.array(z.string()),
  checklistItems: z.array(z.string()),
  appealLevel: z.string().nullable(),
});

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function analyzeDenial(
  input: BenefitsAppealInput,
): Promise<BenefitsAppealAnalysis> {
  const deadlineDate = parseDate(input.appealDeadline);
  let deadlineInfo: string | null = null;
  let deadlinePassed = false;
  let daysRemaining: number | null = null;

  if (deadlineDate) {
    deadlineInfo = deadlineDate.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    deadlinePassed = deadlineDate < new Date();
    const msDiff = deadlineDate.getTime() - Date.now();
    daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
  }

  const raw = await callClaude({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You are a benefits advocacy expert. You help people appeal denials of government benefits. " +
      "Analyze the denial and provide guidance on the appropriate appeal level, deadlines, and supporting " +
      "documents. You can reference general appeals concepts (e.g. reconsideration, administrative hearing, " +
      "ALJ, appeals council, file-a-claim deadlines) but do NOT provide specific legal advice for any " +
      "jurisdiction — recommend contacting a legal aid organization or benefits counselor when appropriate. " +
      "Return JSON only.",
    messages: [{
      role: "user",
      content: `DENIAL DETAILS:
Benefit type: ${input.benefitType}
Agency: ${input.agencyName}
Case number: ${input.caseNumber || "Not provided"}
Denial date: ${input.denialDate || "Not provided"}
Appeal deadline: ${input.appealDeadline || "Not specified"}
Denial reason: ${input.denialReason}
Appellant's position: ${input.appellantPosition}
Evidence listed: ${input.evidenceItems || "None listed yet"}

Return JSON with: suggestedAction (recommended appeal action), deadlineInfo (human-readable or null), deadlinePassed (boolean), warnings (array of issues like deadline passed, missing evidence), tips (array of practical suggestions), checklistItems (array of documents/evidence to include), appealLevel (the typical first appeal level for this benefit type — e.g. "Reconsideration" for SSDI, "Telephonic hearing request" for unemployment, or null if unclear).`,
    }],
  });

  const parsed = AnalysisSchema.parse(JSON.parse(raw));
  if (deadlineInfo) {
    parsed.deadlineInfo = deadlineInfo;
    parsed.deadlinePassed = deadlinePassed;
  }
  return { ...parsed, daysRemaining };
}

export async function draftAppeal(
  input: BenefitsAppealInput,
): Promise<string> {
  return callClaude({
    model: MODEL,
    max_tokens: 2000,
    system:
      "Draft a formal benefits appeal letter. " +
      "The letter should: reference the denial notice and date, state the benefit being appealed, " +
      "clearly explain why the denial is wrong, list supporting evidence, and request a hearing " +
      "or reconsideration. Be professional, factual, and specific. " +
      "Do not invent facts, dates, or evidence not provided. " +
      "Use placeholders only when critical information is missing. " +
      "Return only the letter body.",
    messages: [{
      role: "user",
      content: `BENEFIT TYPE: ${input.benefitType}
AGENCY: ${input.agencyName}
AGENCY ADDRESS: ${input.agencyAddress || "[Agency address]"}
CASE NUMBER: ${input.caseNumber || "Not provided"}
DENIAL DATE: ${input.denialDate || "Not provided"}
APPEAL DEADLINE: ${input.appealDeadline || "Not specified"}
DENIAL REASON: ${input.denialReason}
APPELLANT'S POSITION: ${input.appellantPosition}
EVIDENCE / ENCLOSURES: ${input.evidenceItems || "See attached documents"}
APPELLANT NAME: ${input.appellantName}
APPELLANT ADDRESS: ${input.appellantAddress || "[Appellant address]"}
APPELLANT EMAIL: ${input.appellantEmail || "Not provided"}
APPELLANT PHONE: ${input.appellantPhone || "Not provided"}
ADDITIONAL NOTES: ${input.additionalNotes || "None"}

DOCUMENT TEXT (pasted by user):
${(input as any).documentText || "None provided"}

Draft the appeal letter addressed to the agency. Include the date, proper salutation, clear statement of the appeal, explanation of why the denial should be reversed, itemized list of enclosures, and the appellant's contact information. Request a hearing or reconsideration as appropriate.`,
    }],
  });
}
