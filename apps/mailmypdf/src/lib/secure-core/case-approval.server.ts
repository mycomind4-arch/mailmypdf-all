// Draft → packet → price → approval.
//
// The client chooses a recipient and a mail class. It does not choose page
// counts and it does not choose a price: both are derived here from the bytes
// that will actually be mailed, and the database independently recounts the
// enclosed pages before it will record an approval.

import { calculateQuote, type MailClass, type Quote } from "@mailmypdf/pricing";
import type { AuthenticatedUserContext } from "./auth.server";
import { CaseError, CaseNotFoundError, loadCase } from "./case.server";
import {
  assemblePacket,
  loadPacketDocuments,
  persistMeasuredPageCounts,
  PacketError,
  type PacketManifestEntry,
} from "./packet.server";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const FONT_SIZE = 11;
const LINE_HEIGHT = 15.5;

export interface Recipient {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
}

export interface PacketPreview {
  packetSha256: string;
  responsePages: number;
  supportingPages: number;
  manifest: PacketManifestEntry[];
  quote: Quote;
}

export interface ReviewedPacket {
  packetSha256: string;
  totalCents: number;
}

export function assertReviewedPacket(expected: unknown, actual: ReviewedPacket): void {
  const reviewed = expected as Partial<ReviewedPacket> | null;
  if (!reviewed || typeof reviewed.packetSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(reviewed.packetSha256) ||
      !Number.isSafeInteger(reviewed.totalCents) || reviewed.totalCents! < 0) {
    throw new CaseError("Review the packet and price before approving.");
  }
  if (reviewed.packetSha256 !== actual.packetSha256 || reviewed.totalCents !== actual.totalCents)
    throw new PacketError("The packet or price changed. Review the updated preview before approving.");
}

export function assertRecipient(value: unknown): Recipient {
  const r = value as Partial<Recipient> | null;
  if (!r) throw new CaseError("A recipient is required");
  for (const field of ["name", "line1", "city", "state", "postal"] as const) {
    const v = r[field];
    if (typeof v !== "string" || !v.trim()) throw new CaseError(`Recipient ${field} is required`);
    if (v.length > 200) throw new CaseError(`Recipient ${field} is too long`);
  }
  const state = r.state!.trim().toUpperCase();
  const postal = r.postal!.trim();
  if (!/^[A-Z]{2}$/.test(state)) throw new CaseError("Recipient state must be a 2-letter code");
  if (!/^\d{5}(-\d{4})?$/.test(postal)) throw new CaseError("Recipient ZIP code is invalid");

  return {
    name: r.name!.trim(),
    line1: r.line1!.trim(),
    line2: typeof r.line2 === "string" && r.line2.trim() ? r.line2.trim() : null,
    city: r.city!.trim(),
    state,
    postal,
  };
}

export function assertMailClass(value: unknown): MailClass {
  if (value === "standard" || value === "certified" || value === "registered") return value;
  throw new CaseError("Select a mailing method");
}

/** Renders the approved draft text into the response letter that leads the packet. */
export async function renderResponseLetter(bodyText: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  // Wall-clock metadata must not change the bytes between preview and approval.
  pdf.setCreationDate(new Date(0));
  pdf.setModificationDate(new Date(0));
  const font = await pdf.embedFont(StandardFonts.TimesRoman);

  const usableWidth = PAGE_WIDTH - MARGIN * 2;
  const lines: string[] = [];

  for (const paragraph of bodyText.replace(/\r\n/g, "\n").split("\n")) {
    if (!paragraph.trim()) { lines.push(""); continue; }
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, FONT_SIZE) > usableWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }

  const linesPerPage = Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT);
  for (let i = 0; i < Math.max(lines.length, 1); i += linesPerPage) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;
    for (const line of lines.slice(i, i + linesPerPage)) {
      if (line) page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font });
      y -= LINE_HEIGHT;
    }
  }

  return pdf.save({ useObjectStreams: false });
}

async function loadCurrentDraft(
  caseId: string,
  context: AuthenticatedUserContext,
): Promise<{ version: number; body: string }> {
  const { data, error } = await context.supabase
    .from("case_drafts")
    .select("version, body_text")
    .eq("case_id", caseId)
    .eq("owner_id", context.user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new CaseError(error.message);
  if (!data) throw new CaseNotFoundError("This case has no drafted response yet");
  return { version: data.version, body: data.body_text };
}

/**
 * Assembles the packet and prices it without recording anything. This is what
 * the review window shows, so the figure the user approves is the figure the
 * server calculated from the same bytes.
 */
export async function previewPacket(
  caseId: string,
  mailClass: MailClass,
  context: AuthenticatedUserContext,
): Promise<PacketPreview> {
  const workflowCase = await loadCase(caseId, context);
  const draft = await loadCurrentDraft(caseId, context);
  const documents = await loadPacketDocuments(caseId, context);

  const letter = await renderResponseLetter(draft.body);
  const packet = await assemblePacket(letter, documents);
  await persistMeasuredPageCounts(caseId, packet.manifest, context);

  const quote = calculateQuote({
    workflowId: workflowCase.workflow_id,
    verticalId: workflowCase.vertical_id,
    actualPages: packet.responsePages,
    supportingPages: packet.supportingPages,
    mailClass,
  });

  return {
    packetSha256: packet.sha256,
    responsePages: packet.responsePages,
    supportingPages: packet.supportingPages,
    manifest: packet.manifest,
    quote,
  };
}

/**
 * Records an immutable approval bound to this exact packet.
 *
 * The packet is rebuilt here rather than trusted from the preview call, so an
 * attachment added, removed, or swapped between review and approval produces a
 * different hash and a different price — never a silent substitution.
 */
export interface MaterializedApprovedPacket {
  approvalId: string;
  caseId: string;
  workflowId: string;
  verticalId: string;
  bytes: Uint8Array;
  packetSha256: string;
  responsePages: number;
  supportingPages: number;
  recipient: Recipient;
  mailClass: MailClass;
  quote: Quote;
}

function normalizedManifest(value: unknown): Array<{
  documentId: string;
  role: string;
  evidenceKind: string | null;
  filename: string;
  sha256: string;
  pageCount: number;
}> {
  if (!Array.isArray(value)) throw new PacketError("Approved packet manifest is invalid");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new PacketError("Approved packet manifest is invalid");
    const item = entry as Record<string, unknown>;
    const documentId = typeof item.documentId === "string"
      ? item.documentId
      : typeof item.document_id === "string"
        ? item.document_id
        : "";
    const role = typeof item.role === "string" ? item.role : "";
    const evidenceKind = typeof item.evidenceKind === "string"
      ? item.evidenceKind
      : typeof item.evidence_kind === "string"
        ? item.evidence_kind
        : null;
    const filename = typeof item.filename === "string" ? item.filename : "";
    const sha256 = typeof item.sha256 === "string" ? item.sha256 : "";
    const pageCount = Number(item.pageCount ?? item.page_count);
    if (
      !documentId ||
      !role ||
      !filename ||
      !/^[a-f0-9]{64}$/.test(sha256) ||
      !Number.isSafeInteger(pageCount) ||
      pageCount < 1
    ) {
      throw new PacketError("Approved packet manifest is invalid");
    }
    return { documentId, role, evidenceKind, filename, sha256, pageCount };
  });
}

/**
 * Rebuild the exact approved packet immediately before order creation.
 *
 * Approval is not treated as permission to mail arbitrary later state: the
 * current draft and every included vault document are re-read, re-hashed, and
 * compared with the immutable approval record.
 */
export async function materializeApprovedPacket(
  caseId: string,
  approvalId: string,
  context: AuthenticatedUserContext,
): Promise<MaterializedApprovedPacket> {
  const workflowCase = await loadCase(caseId, context);
  const { data: approval, error } = await context.supabase
    .from("case_approvals")
    .select("id, case_id, packet_sha256, manifest, response_pages, supporting_pages, recipient, mail_class, quote")
    .eq("id", approvalId)
    .eq("case_id", caseId)
    .eq("owner_id", context.user.id)
    .maybeSingle();

  if (error) throw new CaseError(error.message);
  if (!approval) throw new CaseNotFoundError("Approved packet not found");

  const mailClass = assertMailClass(approval.mail_class);
  const recipient = assertRecipient(approval.recipient);
  const storedQuote = approval.quote as Partial<Quote> | null;
  if (!storedQuote || !Number.isSafeInteger(storedQuote.totalCents) || storedQuote.totalCents! < 0) {
    throw new PacketError("Approved quote is invalid");
  }

  const draft = await loadCurrentDraft(caseId, context);
  const documents = await loadPacketDocuments(caseId, context);
  const letter = await renderResponseLetter(draft.body);
  const packet = await assemblePacket(letter, documents);
  await persistMeasuredPageCounts(caseId, packet.manifest, context);

  const quote = calculateQuote({
    workflowId: workflowCase.workflow_id,
    verticalId: workflowCase.vertical_id,
    actualPages: packet.responsePages,
    supportingPages: packet.supportingPages,
    mailClass,
  });

  if (packet.sha256 !== approval.packet_sha256) {
    throw new PacketError("The approved packet changed. Review and approve it again before checkout.");
  }
  if (
    packet.responsePages !== approval.response_pages ||
    packet.supportingPages !== approval.supporting_pages
  ) {
    throw new PacketError("The approved packet page count changed. Review it again before checkout.");
  }

  const storedManifest = normalizedManifest(approval.manifest);
  const currentManifest = normalizedManifest(packet.manifest);
  if (JSON.stringify(storedManifest) !== JSON.stringify(currentManifest)) {
    throw new PacketError("The approved attachment manifest changed. Review it again before checkout.");
  }

  if (quote.totalCents !== storedQuote.totalCents) {
    throw new PacketError("The approved price changed. Review the updated quote before checkout.");
  }

  return {
    approvalId,
    caseId,
    workflowId: workflowCase.workflow_id,
    verticalId: workflowCase.vertical_id,
    bytes: packet.bytes,
    packetSha256: packet.sha256,
    responsePages: packet.responsePages,
    supportingPages: packet.supportingPages,
    recipient,
    mailClass,
    quote,
  };
}

export async function approvePacket(
  input: { caseId: string; recipient: Recipient; mailClass: MailClass; reviewed: ReviewedPacket },
  context: AuthenticatedUserContext,
): Promise<{ approvalId: string; preview: PacketPreview }> {
  const preview = await previewPacket(input.caseId, input.mailClass, context);
  assertReviewedPacket(input.reviewed, {
    packetSha256: preview.packetSha256,
    totalCents: preview.quote.totalCents,
  });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("approve_case_packet", {
    p_case_id: input.caseId,
    p_packet_sha256: preview.packetSha256,
    p_manifest: preview.manifest as unknown as never,
    p_response_pages: preview.responsePages,
    p_supporting_pages: preview.supportingPages,
    p_recipient: input.recipient as unknown as never,
    p_mail_class: input.mailClass,
    p_quote: preview.quote as unknown as never,
  });

  if (error) throw new PacketError(error.message);
  const approval = data as unknown as { id: string } | null;
  if (!approval?.id) throw new PacketError("Approval was not recorded");

  return { approvalId: approval.id, preview };
}
