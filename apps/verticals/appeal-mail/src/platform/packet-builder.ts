import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { scanPdfForDangerousTokens, sanitizeFilename, validateFile } from "../lib/platform/documents";

export interface PacketPageOp { partId: string; sourcePageIndex: number; rotation?: number; removed?: boolean; }
export type PacketPart =
  | { id: string; type: "ai_response"; text: string; title?: string }
  | { id: string; type: "uploaded_document"; filename: string; mimeType: string; bytes: Uint8Array }
  | { id: string; type: "generated_document"; filename: string; mimeType: "application/pdf"; bytes: Uint8Array };
export interface BuiltPacket { bytes: Uint8Array; finalDraftHash: string; partHashes: Array<{ id: string; type: PacketPart["type"]; sha256: string; pageCount: number; filename?: string }>; pageCount: number; }

async function sha256(bytes: Uint8Array): Promise<string> { const digest = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function hashText(text: string): Promise<string> { return sha256(new TextEncoder().encode(text)); }
function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  const output: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) { output.push(""); continue; }
    let current = "";
    for (const word of rawLine.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
      else if (current) { output.push(current); current = word; }
      else output.push(word);
    }
    if (current) output.push(current);
  }
  return output;
}
async function addTextPart(target: PDFDocument, text: string, title: string): Promise<number> {
  const font = await target.embedFont(StandardFonts.Helvetica); const bold = await target.embedFont(StandardFonts.HelveticaBold);
  const width = 612; const height = 792; const margin = 54; const bodySize = 10.5; const lineHeight = 15; const maxWidth = width - margin * 2;
  let page = target.addPage([width, height]); let y = height - margin; let pageCount = 1;
  page.drawText(title, { x: margin, y, size: 15, font: bold, color: rgb(0.08, 0.08, 0.08) }); y -= 28;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.6, color: rgb(0.75, 0.75, 0.75) }); y -= 24;
  for (const line of wrapText(text, maxWidth, font, bodySize)) { if (y < margin + lineHeight) { page = target.addPage([width, height]); pageCount += 1; y = height - margin; } if (line) page.drawText(line, { x: margin, y, size: bodySize, font, color: rgb(0.12, 0.12, 0.12) }); y -= lineHeight; }
  return pageCount;
}
async function appendPdf(target: PDFDocument, bytes: Uint8Array, ops: PacketPageOp[], partId: string): Promise<number> {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: false }); const sourceCount = source.getPageCount();
  const selected = ops.length ? ops.filter((op) => op.partId === partId && !op.removed) : source.getPageIndices().map((i) => ({ partId, sourcePageIndex: i, rotation: 0, removed: false }));
  if (!selected.length) return 0;
  let count = 0;
  for (const op of selected) { if (!Number.isInteger(op.sourcePageIndex) || op.sourcePageIndex < 0 || op.sourcePageIndex >= sourceCount) throw new Error(`Invalid page ${op.sourcePageIndex + 1} for packet part ${partId}.`); const [page] = await target.copyPages(source, [op.sourcePageIndex]); if ((op.rotation || 0) % 360 !== 0) page.setRotation(degrees((op.rotation || 0) % 360)); target.addPage(page); count += 1; }
  return count;
}
async function appendImage(target: PDFDocument, bytes: Uint8Array, mimeType: string): Promise<number> { const page = target.addPage([612, 792]); const margin = 36; const maxW = 612 - margin * 2; const maxH = 792 - margin * 2; const image = mimeType === "image/png" ? await target.embedPng(bytes) : await target.embedJpg(bytes); const scale = Math.min(maxW / image.width, maxH / image.height, 1); const width = image.width * scale; const height = image.height * scale; page.drawImage(image, { x: (612 - width) / 2, y: (792 - height) / 2, width, height }); return 1; }

export async function buildPacket(parts: PacketPart[], pageOps: PacketPageOp[] = []): Promise<BuiltPacket> {
  if (!parts.length) throw new Error("At least one packet part is required.");
  const target = await PDFDocument.create(); const partHashes: BuiltPacket["partHashes"] = []; let finalDraftHash = ""; let pageCount = 0;
  const aiParts = parts.filter((part) => part.type === "ai_response"); const documentParts = parts.filter((part) => part.type !== "ai_response");
  if (aiParts.length !== 1) throw new Error("Packet must contain exactly one AI response part.");
  const orderIndex = new Map<string, number>(); pageOps.forEach((op, index) => { if (!orderIndex.has(op.partId)) orderIndex.set(op.partId, index); });
  const orderedDocuments = [...documentParts].sort((a, b) => (orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER));

  for (const part of aiParts) { if (!part.text.trim()) throw new Error(`AI response part ${part.id} is empty.`); finalDraftHash = await hashText(part.text); const pages = await addTextPart(target, part.text, part.title || "Appeal Response"); const bytes = new TextEncoder().encode(part.text); partHashes.push({ id: part.id, type: part.type, sha256: await sha256(bytes), pageCount: pages }); pageCount += pages; }

  for (const part of orderedDocuments) {
    if (part.type === "uploaded_document") {
      const safeName = sanitizeFilename(part.filename); const validation = validateFile({ filename: safeName, mimeType: part.mimeType, size: part.bytes.byteLength }); if (!validation.ok) throw new Error(validation.error.message);
      if (part.mimeType === "application/pdf") { const dangerousTokens = scanPdfForDangerousTokens(part.bytes); if (dangerousTokens.length) throw new Error(`Uploaded PDF contains blocked active-content tokens: ${dangerousTokens.join(", ")}`); const pages = await appendPdf(target, part.bytes, pageOps, part.id); if (!pages) throw new Error(`Packet part ${part.id} has no active pages.`); partHashes.push({ id: part.id, type: part.type, sha256: await sha256(part.bytes), pageCount: pages, filename: safeName }); pageCount += pages; }
      else if (part.mimeType === "image/png" || part.mimeType === "image/jpeg") { const pages = pageOps.length && pageOps.every((op) => op.partId !== part.id || op.removed) ? 0 : await appendImage(target, part.bytes, part.mimeType); if (!pages) throw new Error(`Packet part ${part.id} has no active page.`); partHashes.push({ id: part.id, type: part.type, sha256: await sha256(part.bytes), pageCount: pages, filename: safeName }); pageCount += pages; }
      else throw new Error(`Unsupported packet attachment type: ${part.mimeType}`);
      continue;
    }
    const dangerousTokens = scanPdfForDangerousTokens(part.bytes); if (dangerousTokens.length) throw new Error(`Generated PDF contains blocked active-content tokens: ${dangerousTokens.join(", ")}`); const pages = await appendPdf(target, part.bytes, pageOps, part.id); if (!pages) throw new Error(`Packet part ${part.id} has no active pages.`); partHashes.push({ id: part.id, type: part.type, sha256: await sha256(part.bytes), pageCount: pages, filename: sanitizeFilename(part.filename) }); pageCount += pages;
  }
  if (!finalDraftHash) throw new Error("Packet must contain a final AI response/draft part."); if (pageCount === 0) throw new Error("Packet produced no pages."); return { bytes: await target.save(), finalDraftHash, partHashes, pageCount };
}
export { hashText as computePacketTextHash, sha256 as computePacketBytesHash };
