/**
 * PermitReply — Claude Provider
 *
 * 1. analyzePermitNotice — reviews the agency notice, identifies the
 *    appropriate response, checks deadlines, provides a checklist, and
 *    gives a brief overview of the typical permit response process.
 * 2. draftPermitResponse — generates a formal response letter to the
 *    agency that states the applicant's position, references evidence,
 *    and requests specific action.
 */

import { z } from "zod";
import type { PermitReplyAnalysis, PermitReplyInput } from "../permit-reply";

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
  processOverview: z.string().nullable(),
});

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function analyzePermitNotice(
  input: PermitReplyInput,
): Promise<PermitReplyAnalysis> {
  const deadlineDate = parseDate(input.responseDeadline);
  let deadlineInfo: string | null = null;
  let deadlinePassed = false;

  if (deadlineDate) {
    deadlineInfo = deadlineDate.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    deadlinePassed = deadlineDate < new Date();
  }

  const raw = await callClaude({
    model: MODEL,
    max_tokens: 1500,
    system:
      "You are a permitting and land-use expert. You help property owners and applicants respond to " +
      "permit-related notices from government agencies. Analyze the notice and provide guidance on the " +
      "appropriate response, deadlines, and supporting documents. You can reference general permitting " +
      "concepts (e.g. due process, right to appeal, hearing requests, variance standards) but do NOT " +
      "provide specific legal advice for any jurisdiction — recommend consulting local permitting " +
      "officials or a land-use attorney when appropriate. Return JSON only.",
    messages: [{
      role: "user",
      content: `NOTICE DETAILS:
Notice type: ${input.noticeType}
Agency: ${input.agencyName}
Permit number: ${input.permitNumber || "Not provided"}
Notice date: ${input.noticeDate || "Not provided"}
Response deadline: ${input.responseDeadline || "Not specified"}
Notice summary: ${input.noticeSummary}
Applicant's position: ${input.applicantPosition}
Evidence listed: ${input.evidenceItems || "None listed yet"}
Property address: ${input.propertyAddress || "Not provided"}
Project description: ${input.projectDescription || "Not provided"}

Return JSON with: suggestedAction (recommended response action), deadlineInfo (human-readable or null), deadlinePassed (boolean), warnings (array of issues), tips (array of practical suggestions), checklistItems (array of documents/evidence to include), processOverview (brief 2-3 sentence overview of the typical permit response process for this notice type — NOT jurisdiction-specific).`,
    }],
  });

  const parsed = AnalysisSchema.parse(JSON.parse(raw));
  if (deadlineInfo) {
    parsed.deadlineInfo = deadlineInfo;
    parsed.deadlinePassed = deadlinePassed;
  }
  return parsed;
}

export async function draftPermitResponse(
  input: PermitReplyInput,
): Promise<string> {
  return callClaude({
    model: MODEL,
    max_tokens: 2000,
    system:
      "Draft a formal permit response letter to a government agency. " +
      "The letter should: reference the permit number and notice, clearly state the applicant's position, " +
      "list any enclosed evidence, describe the project/property context, and request specific action. " +
      "Be professional, factual, and respectful. Use placeholders only when critical info is missing. " +
      "Return only the letter body.",
    messages: [{
      role: "user",
      content: `NOTICE TYPE: ${input.noticeType}
AGENCY: ${input.agencyName}
AGENCY ADDRESS: ${input.agencyAddress || "[Agency address]"}
PERMIT NUMBER: ${input.permitNumber || "Not provided"}
NOTICE DATE: ${input.noticeDate || "Not provided"}
RESPONSE DEADLINE: ${input.responseDeadline || "Not specified"}
NOTICE SUMMARY: ${input.noticeSummary}
APPLICANT'S POSITION: ${input.applicantPosition}
EVIDENCE / ENCLOSURES: ${input.evidenceItems || "See attached documents"}
PROPERTY ADDRESS: ${input.propertyAddress || "Not provided"}
PROJECT DESCRIPTION: ${input.projectDescription || "Not provided"}
APPLICANT NAME: ${input.applicantName}
APPLICANT ADDRESS: ${input.applicantAddress || "[Applicant address]"}
APPLICANT EMAIL: ${input.applicantEmail || "Not provided"}
APPLICANT PHONE: ${input.applicantPhone || "Not provided"}
ADDITIONAL NOTES: ${input.additionalNotes || "None"}

DOCUMENT TEXT (pasted by user):
${(input as any).documentText || "None provided"}

Draft the response letter addressed to the agency. Include the date, proper salutation, clear statement of position, itemized list of enclosures, and the applicant's contact information.`,
    }],
  });
}
