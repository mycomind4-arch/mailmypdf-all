import { generatePlainTextPdf } from "@mailmypdf/packet-builder";
import {
  prepareIrsGeneralLetterPreview,
  type IrsGeneralLetterPreviewBlocker,
  type IrsGeneralLetterPreviewInput,
} from "./letter-preview";

/**
 * Offline PDF preview only. Never use this result as an approval, checkout,
 * or fulfillment token. The authenticated server must persist these exact
 * bytes, recheck the source/recipient, and bind any later approval to the
 * stored packet hash and owner before a provider call is possible.
 */
export type IrsGeneralPdfPreviewResult =
  | {
      ready: false;
      blockers: readonly (IrsGeneralLetterPreviewBlocker | "pdf_font_unsupported_characters" | "pdf_render_failed")[];
      preview: null;
    }
  | {
      ready: true;
      blockers: readonly [];
      preview: Readonly<{
        pdfBytes: Uint8Array;
        pdfSha256: string;
        sourceNoticeSha256: string;
        recipientAddress: string;
        status: "draft_pdf_preview_only";
      }>;
    };

// The shared packet builder uses Times Roman / WinAnsi and replaces other
// characters with '?'. Reject unsupported text instead of silently changing
// a taxpayer's name, address, or response in the printable preview.
const NORMALIZED_BY_PACKET_BUILDER = new Set([
  0x2018, 0x2019, 0x201c, 0x201d, 0x2013, 0x2014, 0x2026, 0x2022,
]);

function printableWithStandardPdfFont(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0)!;
    if (code === 10 || (code >= 32 && code <= 255 && !(code >= 127 && code <= 159))) continue;
    if (NORMALIZED_BY_PACKET_BUILDER.has(code)) continue;
    return false;
  }
  return true;
}

export async function prepareIrsGeneralPdfPreview(
  input: IrsGeneralLetterPreviewInput,
): Promise<IrsGeneralPdfPreviewResult> {
  const letter = prepareIrsGeneralLetterPreview(input);
  if (!letter.ready) return { ready: false, blockers: letter.blockers, preview: null };
  if (!printableWithStandardPdfFont(letter.preview.letterText)) {
    return { ready: false, blockers: ["pdf_font_unsupported_characters"], preview: null };
  }

  try {
    // Reuse the production PDF builder; no test-only PDF implementation.
    // This does not merge enclosures, approve the packet, or contact providers.
    const pdfBytes = await generatePlainTextPdf(letter.preview.letterText);
    // Copy to a concrete ArrayBuffer to satisfy WebCrypto's BufferSource type
    // across Node, browser, and Worker runtimes.
    const hashInput = new Uint8Array(pdfBytes.length);
    hashInput.set(pdfBytes);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", hashInput.buffer);
    const pdfSha256 = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0")).join("");
    return {
      ready: true,
      blockers: [],
      preview: {
        pdfBytes,
        pdfSha256,
        sourceNoticeSha256: letter.preview.sourceNoticeSha256,
        recipientAddress: letter.preview.recipientAddress,
        status: "draft_pdf_preview_only",
      },
    };
  } catch {
    return { ready: false, blockers: ["pdf_render_failed"], preview: null };
  }
}
