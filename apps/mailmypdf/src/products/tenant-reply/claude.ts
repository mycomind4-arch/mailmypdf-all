/**
 * TenantReply — Claude Provider
 *
 * 1. analyzeNotice — reviews the landlord's notice, identifies the
 *    appropriate response, checks deadlines, and provides a checklist
 *    of supporting documents. Also provides a brief summary of
 *    general tenant rights relevant to the notice type (not legal advice).
 * 2. draftResponse — generates a formal tenant response letter
 *    that states the tenant's position, references evidence, and
 *    requests specific action from the landlord.
 */

import { z } from "zod";
import type { TenantReplyAnalysis, TenantReplyInput } from "../tenant-reply";

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
  suggestedAction: z.string().nullable(),
  deadlineInfo: z.string().nullable(),
  deadlinePassed: z.boolean(),
  warnings: z.array(z.string()),
  tips: z.array(z.string()),
  checklistItems: z.array(z.string()),
  rightsSummary: z.string().nullable(),
});

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function analyzeNotice(
  input: TenantReplyInput,
): Promise<TenantReplyAnalysis> {
  const deadlineDate = parseDate(input.responseDeadline);
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
    max_tokens: 1500,
    system:
      "You are a tenant advocacy expert. You help tenants understand notices from landlords and respond effectively. " +
      "Analyze the landlord's notice and provide guidance on the appropriate response, deadlines, and what supporting " +
      "documents to include. You can reference general tenant rights concepts (e.g. implied warranty of habitability, " +
      "right to quiet enjoyment, security deposit limits, eviction process requirements) but do NOT provide specific " +
      "legal advice for any jurisdiction — recommend consulting a local tenant rights organization or housing attorney " +
      "when appropriate. Return JSON only.",
    messages: [
      {
        role: "user",
        content: `NOTICE DETAILS:
Notice type: ${input.noticeType}
Landlord/property manager: ${input.landlordName}
Notice date: ${input.noticeDate || "Not provided"}
Response deadline: ${input.responseDeadline || "Not specified"}
Notice summary: ${input.noticeSummary}
Tenant's position: ${input.tenantPosition}
Evidence listed: ${input.evidenceItems || "None listed yet"}
Lease start: ${input.leaseStartDate || "Not provided"}
Lease end: ${input.leaseEndDate || "Not provided"}
Monthly rent: ${input.monthlyRent || "Not provided"}

Return JSON with: suggestedAction (recommended response action, e.g. "File a written repair request referencing local habitability laws" or "Respond with a cure letter within the cure period"), deadlineInfo (human-readable or null), deadlinePassed (boolean), warnings (array of issues like deadline passed, missing evidence, vague notice), tips (array of practical suggestions for the tenant), checklistItems (array of documents/evidence to include), rightsSummary (brief 2-3 sentence summary of relevant general tenant rights concepts — NOT jurisdiction-specific legal advice).`,
      },
    ],
  });

  const parsed = AnalysisSchema.parse(JSON.parse(raw));
  if (deadlineInfo) {
    parsed.deadlineInfo = deadlineInfo;
    parsed.deadlinePassed = deadlinePassed;
  }
  return parsed;
}

// ── Draft ─────────────────────────────────────────────────────────────────────

export async function draftResponse(
  input: TenantReplyInput,
): Promise<string> {
  return callClaude({
    model: MODEL,
    max_tokens: 2000,
    system:
      "Draft a formal tenant response letter. " +
      "The letter should: reference the landlord's notice and date, clearly state the tenant's position, " +
      "list any enclosed evidence, reference relevant lease terms if provided, and request specific action. " +
      "Be professional, factual, and firm. Do not use inflammatory language. " +
      "Do not invent facts, dates, or evidence not provided. " +
      "Use placeholders only when critical information is missing. " +
      "Return only the letter body.",
    messages: [
      {
        role: "user",
        content: `NOTICE TYPE: ${input.noticeType}
LANDLORD/MANAGER: ${input.landlordName}
LANDLORD ADDRESS: ${input.landlordAddress || "[Landlord's address]"}
NOTICE DATE: ${input.noticeDate || "Not provided"}
RESPONSE DEADLINE: ${input.responseDeadline || "Not specified"}
NOTICE SUMMARY: ${input.noticeSummary}
TENANT'S POSITION: ${input.tenantPosition}
EVIDENCE / ENCLOSURES: ${input.evidenceItems || "See attached documents"}
LEASE START: ${input.leaseStartDate || "Not provided"}
LEASE END: ${input.leaseEndDate || "Not provided"}
MONTHLY RENT: ${input.monthlyRent || "Not specified"}
TENANT NAME: ${input.tenantName}
TENANT ADDRESS: ${input.tenantAddress || "[Property address]"}
TENANT EMAIL: ${input.tenantEmail || "Not provided"}
TENANT PHONE: ${input.tenantPhone || "Not provided"}
ADDITIONAL NOTES: ${input.additionalNotes || "None"}

DOCUMENT TEXT (pasted by user):
${(input as any).documentText || "None provided"}

Draft the tenant response letter addressed to the landlord/manager. Include the date, proper salutation, clear statement of the tenant's position, itemized list of enclosures, and the tenant's contact information. Be professional, factual, and specific.`,
      },
    ],
  });
}
