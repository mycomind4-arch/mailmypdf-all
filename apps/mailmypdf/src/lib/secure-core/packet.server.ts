// Packet assembly for workflow cases.
//
// A packet is the exact PDF a user approves and the mailing provider receives:
// the generated response letter followed by every attachment the user chose to
// enclose, in order. Page counts are *measured here from the stored bytes*, not
// supplied by the caller — the approval gate then compares its own recount
// against these measurements, so a client cannot approve one packet and have
// another mailed.
//
// NOTE: pdf-lib is imported dynamically. A top-level import causes the Nitro
// bundler to hoist tslib into the SSR chunk and break on Cloudflare Workers.
// See src/lib/pdf-validation.server.ts.

import { computeSha256 } from "@mailmypdf/documents";
import type { AuthenticatedUserContext } from "./auth.server";

const BUCKET = "secure-documents";
const FETCH_TTL_SECONDS = 60;
const MAX_ATTACHMENT_PAGES = 200;
const MAX_PACKET_PAGES = 400;
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export class PacketError extends Error {}

export interface PacketDocumentRow {
  document_id: string;
  role: "subject_notice" | "evidence";
  evidence_kind: string | null;
  page_count: number | null;
  position: number;
  sha256: string;
  storage_path: string;
  safe_filename: string;
  mime_type: string;
}

export interface PacketManifestEntry {
  documentId: string;
  role: PacketDocumentRow["role"];
  evidenceKind: string | null;
  filename: string;
  sha256: string;
  pageCount: number;
}

export interface AssembledPacket {
  bytes: Uint8Array;
  sha256: string;
  responsePages: number;
  supportingPages: number;
  manifest: PacketManifestEntry[];
}

/**
 * Lists the documents that may enter the packet. The database refuses the whole
 * case if any included document has not cleared malware scanning, so there is
 * no path that assembles a packet around unscanned content.
 */
export async function loadPacketDocuments(
  caseId: string,
  context: AuthenticatedUserContext,
): Promise<PacketDocumentRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("case_packet_documents", { p_case_id: caseId });
  if (error) throw new PacketError(error.message);
  return (data ?? []) as PacketDocumentRow[];
}

export type DocumentByteReader = (row: PacketDocumentRow) => Promise<Uint8Array>;

/** Reads a stored document through a short-lived signed URL and verifies it. */
export async function fetchDocumentBytes(row: PacketDocumentRow): Promise<Uint8Array> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, FETCH_TTL_SECONDS);
  if (error || !data?.signedUrl) throw new PacketError("Unable to read an approved document");

  const response = await fetch(data.signedUrl);
  if (!response.ok) throw new PacketError("Unable to read an approved document");
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new PacketError(`${row.safe_filename} is too large to enclose`);
  }
  return bytes;
}


async function loadPdfLib() {
  return import("pdf-lib");
}

// PDFDocument's constructor is private, so the document type is taken from the
// factory rather than through InstanceType.
type PdfDoc = Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfLib>>["PDFDocument"]["create"]>>;

/**
 * pdf-lib will happily "load" some malformed input and only fail later while
 * copying pages, so parsing and copying are guarded together. A document we
 * cannot read is refused, never silently dropped from the packet.
 */
async function appendPdf(
  packet: PdfDoc,
  bytes: Uint8Array,
  row: PacketDocumentRow,
): Promise<number> {
  const { PDFDocument } = await loadPdfLib();
  try {
    const attachment = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
      updateMetadata: false,
    });
    const indices = attachment.getPageIndices();
    if (indices.length < 1) throw new PacketError(`${row.safe_filename} has no pages`);
    if (indices.length > MAX_ATTACHMENT_PAGES) {
      throw new PacketError(`${row.safe_filename} exceeds ${MAX_ATTACHMENT_PAGES} pages`);
    }
    const copied = await packet.copyPages(attachment, indices);
    for (const page of copied) packet.addPage(page);
    return copied.length;
  } catch (error) {
    if (error instanceof PacketError) throw error;
    throw new PacketError(`${row.safe_filename} is not a readable PDF`);
  }
}

async function appendImage(
  packet: PdfDoc,
  bytes: Uint8Array,
  row: PacketDocumentRow,
): Promise<number> {
  try {
    const image = row.mime_type === "image/png"
      ? await packet.embedPng(bytes)
      : await packet.embedJpg(bytes);
    // US Letter, image fitted inside a half-inch margin.
    const page = packet.addPage([612, 792]);
    const scale = Math.min((612 - 72) / image.width, (792 - 72) / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, { x: (612 - width) / 2, y: (792 - height) / 2, width, height });
    return 1;
  } catch (error) {
    if (error instanceof PacketError) throw error;
    throw new PacketError(`${row.safe_filename} is not a readable image`);
  }
}

/**
 * Builds the combined packet and measures every page in it.
 *
 * `responseLetterPdf` is the generated response. Everything after it is an
 * attachment the user explicitly chose to enclose.
 *
 * `readBytes` is injectable so the assembly rules can be exercised against real
 * PDFs in tests without a storage backend.
 */
export async function assemblePacket(
  responseLetterPdf: Uint8Array,
  documents: PacketDocumentRow[],
  readBytes: DocumentByteReader = fetchDocumentBytes,
): Promise<AssembledPacket> {
  const { PDFDocument } = await import("pdf-lib");

  const packet = await PDFDocument.create();
  packet.setCreationDate(new Date(0));
  packet.setModificationDate(new Date(0));

  const response = await PDFDocument.load(responseLetterPdf, {
    ignoreEncryption: false,
    throwOnInvalidObject: true,
    updateMetadata: false,
  }).catch(() => {
    throw new PacketError("The generated response letter is not a readable PDF");
  });
  const responsePageRefs = await packet.copyPages(response, response.getPageIndices());
  for (const page of responsePageRefs) packet.addPage(page);
  const responsePages = responsePageRefs.length;
  if (responsePages < 1) throw new PacketError("The generated response letter has no pages");

  const manifest: PacketManifestEntry[] = [];
  let supportingPages = 0;

  for (const row of documents) {
    const bytes = await readBytes(row);

    // The vault recorded this hash at intake. A mismatch means the stored bytes
    // are not the ones the user uploaded, so the packet must not be built.
    if (computeSha256(bytes) !== row.sha256) {
      throw new PacketError(`${row.safe_filename} failed its integrity check`);
    }

    let pageCount: number;

    if (row.mime_type === "application/pdf") {
      pageCount = await appendPdf(packet, bytes, row);
    } else if (row.mime_type === "image/png" || row.mime_type === "image/jpeg") {
      pageCount = await appendImage(packet, bytes, row);
    } else {
      throw new PacketError(`${row.safe_filename} cannot be enclosed in a mailed packet`);
    }

    supportingPages += pageCount;
    if (responsePages + supportingPages > MAX_PACKET_PAGES) {
      throw new PacketError(`The packet exceeds ${MAX_PACKET_PAGES} pages`);
    }

    manifest.push({
      documentId: row.document_id,
      role: row.role,
      evidenceKind: row.evidence_kind,
      filename: row.safe_filename,
      sha256: row.sha256,
      pageCount,
    });
  }

  const bytes = await packet.save({ useObjectStreams: false });
  return { bytes, sha256: computeSha256(bytes), responsePages, supportingPages, manifest };
}

/**
 * Writes the measured page counts back so the database approval gate can
 * recount independently of whatever the client believes.
 */
export async function persistMeasuredPageCounts(
  caseId: string,
  manifest: PacketManifestEntry[],
  context: AuthenticatedUserContext,
): Promise<void> {
  for (const entry of manifest) {
    const { error } = await context.supabase
      .from("case_documents")
      .update({ page_count: entry.pageCount })
      .eq("case_id", caseId)
      .eq("document_id", entry.documentId)
      .eq("owner_id", context.user.id);
    if (error) throw new PacketError("Unable to record measured page counts");
  }
}
