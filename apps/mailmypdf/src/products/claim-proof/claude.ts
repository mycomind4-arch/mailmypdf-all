/**
 * ClaimProof — Claude Provider
 *
 * 1. analyzeClaim — reviews the user's claim details, identifies the
 *    appropriate format, checks deadlines, and provides a checklist
 *    of supporting documents to include.
 * 2. draftCoverLetter — generates a professional claim cover letter
 *    that summarizes the claim, lists enclosed evidence, and requests
 *    action.
 */

import { z } from "zod";
import type { ClaimProofAnalysis, ClaimProofInput } from "../claim-proof";

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
  suggestedFormat: z.string().nullable(),
  deadlineInfo: z.string().nullable(),
  deadlinePassed: z.boolean(),
  warnings: z.array(z.string()),
  tips: z.array(z.string()),
  checklistItems: z.array(z.string()),
});

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function analyzeClaim(
  input: ClaimProofInput,
): Promise<ClaimProofAnalysis> {
  // Calculate deadline status
  const deadlineDate = parseDate(input.deadline);
  let deadlineInfo: string | null = null;
  let deadlinePassed = false;

  if (deadlineDate) {
    deadlineInfo = deadlineDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    deadlinePassed = deadlineDate < new Date();
  }

  const raw = await callClaude({
    model: MODEL,
    max_tokens: 1200,
    system:
      "You are a claims documentation expert. You help people organize and submit claims for insurance, " +
      "warranty, government benefits, property damage, and similar matters. " +
      "Analyze the user's claim details and provide guidance on formatting, deadlines, and what " +
      "supporting documents to include. Do not provide legal advice. Return JSON only.",
    messages: [
      {
        role: "user",
        content: `CLAIM DETAILS:
Claim type: ${input.claimType}
Recipient: ${input.recipientName}
Claim number: ${input.claimNumber || "Not provided"}
Claim date: ${input.claimDate || "Not provided"}
Claim amount: ${input.claimAmount || "Not provided"}
Claim summary: ${input.claimSummary}
Evidence listed: ${input.evidenceItems || "None listed yet"}
Deadline: ${input.deadline || "Not specified"}

Return JSON with: suggestedFormat (the recommended claim submission format for this claim type, e.g. "Form SF-95 for federal tort claims" or "Standard insurance claim letter with itemized attachments"), deadlineInfo (human-readable deadline info or null), deadlinePassed (boolean), warnings (array of issues like missing evidence, deadline passed, vague description), tips (array of practical suggestions), checklistItems (array of documents/evidence the user should include in their claim package).`,
      },
    ],
  });

  const parsed = AnalysisSchema.parse(JSON.parse(raw));
  if (deadlineInfo) {
    parsed.deadlineInfo = deadlineInfo;
    parsed.deadlinePassed = deadlinePassed;
  }
  return {
    suggestedFormat: parsed.suggestedFormat,
    deadlineInfo: parsed.deadlineInfo,
    deadlinePassed: parsed.deadlinePassed,
    warnings: parsed.warnings,
    tips: parsed.tips,
    checklistItems: parsed.checklistItems,
  };
}

// ── Draft ─────────────────────────────────────────────────────────────────────

export async function draftCoverLetter(
  input: ClaimProofInput,
): Promise<string> {
  return callClaude({
    model: MODEL,
    max_tokens: 2000,
    system:
      "Draft a professional claim cover letter from the user's input. " +
      "The letter should: state the claim type and reference number, summarize the claim clearly, " +
      "list all enclosed/attached evidence items, state the amount claimed (if applicable), " +
      "note any applicable deadline, and request specific action (review, payment, response). " +
      "Do not invent facts, amounts, or evidence not provided by the user. " +
      "Use placeholders only when critical information is missing. " +
      "Return only the letter body (no envelope or metadata).",
    messages: [
      {
        role: "user",
        content: `CLAIM TYPE: ${input.claimType}
RECIPIENT: ${input.recipientName}
RECIPIENT ADDRESS: ${input.recipientAddress || "[Verify the correct address]"}
CLAIM NUMBER: ${input.claimNumber || "Not provided"}
CLAIM DATE: ${input.claimDate || "Not provided"}
CLAIM AMOUNT: ${input.claimAmount || "Not specified"}
CLAIM SUMMARY: ${input.claimSummary}
EVIDENCE / ENCLOSURES: ${input.evidenceItems || "See attached documents"}
DEADLINE: ${input.deadline || "Not specified"}
CLAIMANT NAME: ${input.claimantName}
CLAIMANT ADDRESS: ${input.claimantAddress || "[Claimant's address]"}
CLAIMANT EMAIL: ${input.claimantEmail || "Not provided"}
CLAIMANT PHONE: ${input.claimantPhone || "Not provided"}
ADDITIONAL NOTES: ${input.additionalNotes || "None"}

DOCUMENT TEXT (pasted by user):
${(input as any).documentText || "None provided"}

Draft the claim cover letter addressed to the recipient. Include the date, proper salutation, clear claim summary, itemized list of enclosures, and the claimant's contact information. Be professional, factual, and specific.`,
      },
    ],
  });
}
