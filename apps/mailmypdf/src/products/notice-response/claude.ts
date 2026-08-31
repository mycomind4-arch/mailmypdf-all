import { z } from "zod";
import type { NoticeAnalysis } from "../notice-response";

const Signal = z.object({ value: z.string().nullable(), confidence: z.number().min(0).max(1) });
const Analysis = z.object({
  sender: Signal,
  noticeDate: Signal,
  responseDeadline: Signal,
  referenceNumber: Signal,
  requestedAction: Signal,
  consequence: Signal,
  noticeType: Signal,
  warnings: z.array(z.string()),
});

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
  const payload = await response.json() as { content?: Array<{ type?: string; text?: string }> };
  const text = payload.content?.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("Claude returned no content");
  return text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function analyzeNoticePdf(bytes: Uint8Array): Promise<NoticeAnalysis> {
  const data = Buffer.from(bytes).toString("base64");
  const raw = await callClaude({
    model: MODEL,
    max_tokens: 1800,
    system: "Analyze the supplied official notice. Extract only facts explicitly supported by the document. Never invent dates, legal rights, procedures, or conclusions. Use null for missing or ambiguous fields and explain uncertainty in warnings. Return JSON only.",
    messages: [{ role: "user", content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
      { type: "text", text: "Return exactly sender, noticeDate, responseDeadline, referenceNumber, requestedAction, consequence, noticeType, warnings. Each non-warning field is {value:string|null,confidence:0..1}." },
    ] }],
  });
  const parsed = Analysis.parse(JSON.parse(raw));
  const signal = (s: z.infer<typeof Signal>) => s.value ? { value: s.value, confidence: s.confidence } : null;
  return { sender: signal(parsed.sender), noticeDate: signal(parsed.noticeDate), responseDeadline: signal(parsed.responseDeadline), referenceNumber: signal(parsed.referenceNumber), requestedAction: signal(parsed.requestedAction), consequence: signal(parsed.consequence), noticeType: signal(parsed.noticeType), warnings: parsed.warnings };
}

export async function draftNoticeResponse(input: {
  sender: string;
  deadline: string;
  referenceNumber: string;
  responseType: string;
  userFacts: string;
  noticeFacts: string;
}): Promise<string> {
  return callClaude({
    model: MODEL,
    max_tokens: 2200,
    system: "Draft a professional response letter from verified notice facts and user-provided facts. Do not invent facts, authorities, rights, dates, or evidence. Do not give legal advice. Use placeholders only when information is missing. Make clear, factual, respectful requests. Return only the letter body.",
    messages: [{ role: "user", content: `NOTICE FACTS:\n${input.noticeFacts.slice(0, 12000)}\n\nUSER FACTS:\n${input.userFacts.slice(0, 12000)}\n\nRESPONSE TYPE: ${input.responseType}\nSENDER: ${input.sender}\nDEADLINE: ${input.deadline}\nREFERENCE: ${input.referenceNumber || "Not provided"}\n\nDraft the response letter.` }],
  });
}