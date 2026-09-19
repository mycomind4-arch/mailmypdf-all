/**
 * DebtDefense Mail — Claude Provider
 *
 * 1. analyzeDebtSituation — evaluates the user's situation, checks the
 *    30-day validation window, and provides FDCPA rights guidance.
 * 2. draftDebtDefenseLetter — generates a properly formatted FDCPA
 *    letter (validation request, dispute, cease-and-desist, etc.)
 */

import { z } from "zod";
import type { DebtDefenseAnalysis, DebtDefenseInput } from "../debt-defense";

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

// ── Analyze ──────────────────────────────────────────────────────────────────

const AnalysisSchema = z.object({
  thirtyDayDeadline: z.string().nullable(),
  deadlinePassed: z.boolean(),
  warnings: z.array(z.string()),
  tips: z.array(z.string()),
  fdcpaRights: z.array(z.string()),
});

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function analyzeDebtSituation(
  input: DebtDefenseInput,
): Promise<DebtDefenseAnalysis> {
  // Calculate the 30-day window from first contact
  const contactDate = parseDate(input.firstContactDate);
  let thirtyDayDeadline: string | null = null;
  let deadlinePassed = false;

  if (contactDate) {
    const deadline = new Date(contactDate);
    deadline.setDate(deadline.getDate() + 30);
    thirtyDayDeadline = deadline.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    deadlinePassed = deadline < new Date();
  }

  const raw = await callClaude({
    model: MODEL,
    max_tokens: 1000,
    system:
      "You are a consumer rights expert specializing in the Fair Debt Collection Practices Act (FDCPA). " +
      "Analyze the user's debt collection situation and provide guidance. " +
      "Identify relevant FDCPA rights, flag issues, and provide practical tips. " +
      "Do not provide legal advice or recommend specific legal actions. Return JSON only.",
    messages: [
      {
        role: "user",
        content: `DEBT SITUATION:
Response type wanted: ${input.responseType}
Collector: ${input.collectorName}
Account/reference: ${input.accountReference || "Not provided"}
Original creditor: ${input.originalCreditor || "Not provided"}
Claimed amount: ${input.claimedAmount || "Not provided"}
First contact date: ${input.firstContactDate || "Not provided"}
Dispute reason: ${input.disputeReason || "Not provided"}

Return JSON with: thirtyDayDeadline (the date 30 days after first contact, or null), deadlinePassed (boolean), warnings (array of issues like missing info, deadline passed, etc.), tips (array of practical suggestions), fdcpaRights (array of relevant FDCPA rights the user should know about).`,
      },
    ],
  });

  const parsed = AnalysisSchema.parse(JSON.parse(raw));
  // Override with our calculated deadline if we have a date
  if (thirtyDayDeadline) {
    parsed.thirtyDayDeadline = thirtyDayDeadline;
    parsed.deadlinePassed = deadlinePassed;
  }
  return {
    thirtyDayDeadline: parsed.thirtyDayDeadline,
    deadlinePassed: parsed.deadlinePassed,
    warnings: parsed.warnings,
    tips: parsed.tips,
    fdcpaRights: parsed.fdcpaRights,
  };
}

// ── Draft ─────────────────────────────────────────────────────────────────────

export async function draftDebtDefenseLetter(
  input: DebtDefenseInput,
): Promise<string> {
  return callClaude({
    model: MODEL,
    max_tokens: 2000,
    system:
      "Draft a professional FDCPA-compliant letter from the user's input. " +
      "Follow standard format: sender info, date, collector info, subject line, " +
      "clear statement of purpose, relevant FDCPA citations (15 U.S.C. § 1692g for validation, " +
      "§ 1692c for cease communication), and specific requests. " +
      "Do not invent facts, amounts, or account numbers not provided by the user. " +
      "Use placeholders only when critical information is missing. " +
      "Do not provide legal advice beyond citing the FDCPA provisions the user invoked. " +
      "Return only the letter body.",
    messages: [
      {
        role: "user",
        content: `LETTER TYPE: ${input.responseType}
COLLECTOR: ${input.collectorName}
COLLECTOR ADDRESS: ${input.collectorAddress || "[Collector's address — verify]"}
ACCOUNT/REFERENCE: ${input.accountReference || "Not provided"}
ORIGINAL CREDITOR: ${input.originalCreditor || "Not provided"}
CLAIMED AMOUNT: ${input.claimedAmount || "Not provided"}
FIRST CONTACT DATE: ${input.firstContactDate || "Not provided"}
CONSUMER NAME: ${input.consumerName}
CONSUMER ADDRESS: ${input.consumerAddress || "[Consumer's address]"}
CONSUMER EMAIL: ${input.consumerEmail || "Not provided"}
CONSUMER PHONE: ${input.consumerPhone || "Not provided"}
DISPUTE REASON: ${input.disputeReason || "Not provided"}
ADDITIONAL NOTES: ${input.additionalNotes || "None"}

DOCUMENT TEXT (pasted by user):
${(input as any).documentText || "None provided"}

Draft the ${input.responseType} letter. Address it to the collector. Include the consumer's contact information. Cite the applicable FDCPA provisions. Be clear, factual, and professional.`,
      },
    ],
  });
}
