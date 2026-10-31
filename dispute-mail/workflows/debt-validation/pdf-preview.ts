import { assemblePacket, generatePlainTextPdf, validatePdfForMailing, type AssembledPacket } from "@mailmypdf/packet-builder";
import { draftDebtValidationLetter, type DebtValidationIntake } from "./domain";

/**
 * Local-only PDF preview through the canonical packet builder.
 * No account storage, immutable approval, checkout or mailing occurs.
 * The standard PDF font cannot render all Unicode glyphs; refuse silent
 * substitutions that would change the consumer's actual dispute.
 */
const UNSUPPORTED_PDF_CHARACTERS = /[^\x09\x0a\x0d\x20-\xff\u2018\u2019\u201c\u201d\u2013\u2014\u2026\u2022]/u;

export async function createLocalDebtValidationPdfPreview(
  intake: DebtValidationIntake,
  letterDate: string,
): Promise<AssembledPacket> {
  const letter = draftDebtValidationLetter(intake, letterDate);
  if (UNSUPPORTED_PDF_CHARACTERS.test(letter)) {
    throw new Error("The current PDF font cannot represent all letter characters. Retain the text draft.");
  }
  const responsePdf = await generatePlainTextPdf(letter);
  const packet = await assemblePacket(responsePdf, [], async () => {
    throw new Error("Local debt-validation preview cannot fetch or enclose stored documents.");
  });
  if (packet.responsePages < 1 || packet.supportingPages !== 0 || packet.manifest.length !== 0) {
    throw new Error("Local debt-validation preview must contain only the reviewed letter.");
  }
  // The browser preview must meet the same canonical page, size and safety
  // limits as the final server-prepared physical-mailing packet. Otherwise a
  // customer can review a PDF that can never pass the server approval gate.
  try {
    const validated = await validatePdfForMailing(packet.bytes);
    if (validated.pageCount !== packet.responsePages + packet.supportingPages) {
      throw new Error("generated_packet_page_mismatch");
    }
  } catch {
    throw new Error("Debt validation PDF exceeds mailing limits or cannot be validated.");
  }
  return packet;
}
