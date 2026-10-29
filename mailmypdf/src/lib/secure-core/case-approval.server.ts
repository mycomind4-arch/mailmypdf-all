// Draft → packet → price → approval.
//
// The client chooses a recipient and a mail class. It does not choose page
// counts and it does not choose a price: both are derived here from the bytes
// that will actually be mailed, and the database independently recounts the
// enclosed pages before it will record an approval.

import { calculateQuote, type MailClass, type Quote } from "@mailmypdf/pricing";
import { unresolvedPlaceholderMessage } from "@mailmypdf/workflows";
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
// assemblePacket puts this letter first, and the resulting packet is
// submitted to Lob with address_placement: "top_first_page" (see
// apps/mailmypdf's lob-adapter), which overlays Lob's own return/recipient
// address into the top of page 1. That zone must stay clear or the overlay
// covers the first lines of the letter. Lob's guidance for this placement
// is a minimum 2" clear at the top of page 1; every other page keeps the
// normal 1" margin.
const LOB_FIRST_PAGE_TOP_MARGIN = 144; // 2"

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

export interface MaterializedPacketPreview extends PacketPreview {
  bytes: Uint8Array;
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

// Postal fields cross an untrusted JSON boundary. A newline or invisible
// direction-control character can change the envelope's visible destination
// even when the reviewed recipient object appears unchanged.
const UNSAFE_RECIPIENT_CHARACTER = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060\u2066-\u2069\ufeff]/;
const USPS_STATE_CODES = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI AA AE AP".split(" "),
);

export function assertRecipient(value: unknown): Recipient {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CaseError("A recipient is required");
  }
  const r = value as Partial<Recipient>;
  for (const field of ["name", "line1", "city", "state", "postal"] as const) {
    const v = r[field];
    if (typeof v !== "string" || !v.trim()) throw new CaseError(`Recipient ${field} is required`);
    if (v.length > 200) throw new CaseError(`Recipient ${field} is too long`);
    if (UNSAFE_RECIPIENT_CHARACTER.test(v) || unresolvedPlaceholderMessage(v)) {
      throw new CaseError(`Recipient ${field} contains unsafe or unfinished text`);
    }
  }
  // Do not silently drop an invalid apartment/suite line: that could turn a
  // complete address into an undeliverable one without the customer's review.
  if (r.line2 != null && typeof r.line2 !== "string") {
    throw new CaseError("Recipient line2 must be text");
  }
  if (typeof r.line2 === "string" &&
      (r.line2.length > 200 || UNSAFE_RECIPIENT_CHARACTER.test(r.line2) ||
       unresolvedPlaceholderMessage(r.line2))) {
    throw new CaseError("Recipient line2 contains unsafe or unfinished text");
  }
  const state = r.state!.trim().toUpperCase();
  const postal = r.postal!.trim();
  if (!USPS_STATE_CODES.has(state)) throw new CaseError("Recipient state is not a supported US postal code");
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

/**
 * The generic workflow runtime blocks unresolved placeholders, but the
 * authenticated /api/v2/cases routes can be called directly. Enforce the same
 * rule at their shared packet materialization boundary so an incomplete
 * response cannot be previewed as mail-ready, approved, or fulfilled.
 * Saving an unfinished draft remains allowed.
 */
export function assertMailableDraftText(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new PacketError("The response draft is empty. Complete it before preparing a mailing packet.");
  }
  const unresolved = unresolvedPlaceholderMessage(value);
  if (unresolved) throw new PacketError(unresolved);
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
  const firstPageLines = Math.floor((PAGE_HEIGHT - LOB_FIRST_PAGE_TOP_MARGIN - MARGIN) / LINE_HEIGHT);
  let cursor = 0;
  let pageIndex = 0;
  do {
    const capacity = pageIndex === 0 ? firstPageLines : linesPerPage;
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - (pageIndex === 0 ? LOB_FIRST_PAGE_TOP_MARGIN : MARGIN);
    for (const line of lines.slice(cursor, cursor + capacity)) {
      if (line) page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font });
      y -= LINE_HEIGHT;
    }
    cursor += capacity;
    pageIndex += 1;
  } while (cursor < lines.length);

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
  assertMailableDraftText(data.body_text);
  return { version: data.version, body: data.body_text };
}

/**
 * Assembles the packet and prices it without recording anything. This is what
 * the review window shows, so the figure the user approves is the figure the
 * server calculated from the same bytes.
 */
export async function materializePacketPreview(
  caseId: string,
  mailClass: MailClass,
  context: AuthenticatedUserContext,
  options: { persistMeasuredPages?: boolean } = {},
): Promise<MaterializedPacketPreview> {
  const workflowCase = await loadCase(caseId, context);
  const draft = await loadCurrentDraft(caseId, context);
  const documents = await loadPacketDocuments(caseId, context);

  const letter = await renderResponseLetter(draft.body);
  const packet = await assemblePacket(letter, documents);
  if (options.persistMeasuredPages !== false) {
    await persistMeasuredPageCounts(caseId, packet.manifest, context);
  }

  const quote = calculateQuote({
    workflowId: workflowCase.workflow_id,
    verticalId: workflowCase.vertical_id,
    actualPages: packet.responsePages,
    supportingPages: packet.supportingPages,
    mailClass,
  });

  return {
    bytes: packet.bytes,
    packetSha256: packet.sha256,
    responsePages: packet.responsePages,
    supportingPages: packet.supportingPages,
    manifest: packet.manifest,
    quote,
  };
}

export async function previewPacket(
  caseId: string,
  mailClass: MailClass,
  context: AuthenticatedUserContext,
): Promise<PacketPreview> {
  const { bytes: _bytes, ...preview } = await materializePacketPreview(
    caseId,
    mailClass,
    context,
  );
  return preview;
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
 * Verify an approval through an independent, owner-scoped read after the
 * service-role RPC writes it. An RPC receipt is not durable proof of consent.
 * This is a readback guard, NOT permission to charge or mail.
 */
export function assertRecordedCaseApproval(
  recorded: unknown,
  expected: {
    approvalId: string;
    caseId: string;
    ownerId: string;
    packetSha256: string;
    manifest: PacketManifestEntry[];
    responsePages: number;
    supportingPages: number;
    recipient: Recipient;
    mailClass: MailClass;
    totalCents: number;
  },
): void {
  const invalid = () => new PacketError("Approval persistence could not be verified");
  if (!recorded || typeof recorded !== "object") throw invalid();
  const row = recorded as Record<string, unknown>;
  if (
    row.id !== expected.approvalId ||
    row.case_id !== expected.caseId ||
    row.owner_id !== expected.ownerId ||
    row.packet_sha256 !== expected.packetSha256 ||
    row.response_pages !== expected.responsePages ||
    row.supporting_pages !== expected.supportingPages ||
    row.mail_class !== expected.mailClass
  ) throw invalid();

  const quote = row.quote as Record<string, unknown> | null;
  if (!quote || !Number.isSafeInteger(quote.totalCents) ||
      quote.totalCents !== expected.totalCents) throw invalid();

  try {
    // JSONB may reorder object keys and older records may use snake_case.
    // Compare canonical attachment fields, not raw JSON serialization.
    if (JSON.stringify(normalizedManifest(row.manifest)) !==
        JSON.stringify(normalizedManifest(expected.manifest))) throw invalid();
    if (JSON.stringify(assertRecipient(row.recipient)) !==
        JSON.stringify(assertRecipient(expected.recipient))) throw invalid();
  } catch {
    throw invalid();
  }
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
  input: {
    caseId: string;
    recipient: Recipient;
    mailClass: MailClass;
    reviewed: ReviewedPacket;
    /**
     * Persists the approval under this id instead of an auto-generated one.
     * The generic workflow-runtime host mints the approval id before calling
     * this function (it is already in the response the client saw), so the
     * stored row must match it or later lookups/checkout by that id would 404.
     */
    approvalId?: string;
  },
  context: AuthenticatedUserContext,
): Promise<{ approvalId: string; preview: PacketPreview }> {
  // The generic workflow-runtime host also calls this function directly.
  // Validate before the service-role approval RPC, not only in the v2 route
  // or during the later durable-record readback.
  const recipient = assertRecipient(input.recipient);
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
    p_recipient: recipient as unknown as never,
    p_mail_class: input.mailClass,
    p_quote: preview.quote as unknown as never,
    p_approval_id: input.approvalId ?? null,
  });

  if (error) throw new PacketError(error.message);
  const approval = data as unknown as { id: string } | null;
  if (!approval?.id || (input.approvalId && approval.id !== input.approvalId)) {
    throw new PacketError("Approval was not recorded");
  }

  // Read through the authenticated RLS client, not the service-role writer.
  // A plausible RPC receipt alone cannot establish that the correct owner's
  // exact packet, destination and reviewed price were durably recorded.
  const { data: recorded, error: readError } = await context.supabase
    .from("case_approvals")
    .select("id, case_id, owner_id, packet_sha256, manifest, response_pages, supporting_pages, recipient, mail_class, quote")
    .eq("id", approval.id)
    .eq("case_id", input.caseId)
    .eq("owner_id", context.user.id)
    .maybeSingle();
  if (readError) throw new PacketError("Approval persistence could not be verified");
  assertRecordedCaseApproval(recorded, {
    approvalId: approval.id,
    caseId: input.caseId,
    ownerId: context.user.id,
    packetSha256: preview.packetSha256,
    manifest: preview.manifest,
    responsePages: preview.responsePages,
    supportingPages: preview.supportingPages,
    recipient,
    mailClass: input.mailClass,
    totalCents: preview.quote.totalCents,
  });

  return { approvalId: approval.id, preview };
}
