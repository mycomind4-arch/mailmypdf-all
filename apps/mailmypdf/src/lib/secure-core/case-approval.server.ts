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

export function assertRecipient(value: unknown): Recipient {
  const r = value as Partial<Recipient> | null;
  if (!r) throw new CaseError("A recipient is required");
  for (const field of ["name", "line1", "city", "state", "postal"] as const) {
    const v = r[field];
    if (typeof v !== "string" || !v.trim()) throw new CaseError(`Recipient ${field} is required`);
    if (v.length > 200) throw new CaseError(`Recipient ${field} is too long`);
  }
  return {
    name: r.name!.trim(),
    line1: r.line1!.trim(),
    line2: typeof r.line2 === "string" && r.line2.trim() ? r.line2.trim() : null,
    city: r.city!.trim(),
    state: r.state!.trim(),
    postal: r.postal!.trim(),
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
export async function approvePacket(
  input: { caseId: string; recipient: Recipient; mailClass: MailClass },
  context: AuthenticatedUserContext,
): Promise<{ approvalId: string; preview: PacketPreview }> {
  const preview = await previewPacket(input.caseId, input.mailClass, context);

  const { data, error } = await context.supabase.rpc("approve_case_packet", {
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
