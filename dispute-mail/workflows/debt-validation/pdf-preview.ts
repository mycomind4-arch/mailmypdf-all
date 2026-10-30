import { assemblePacket, generatePlainTextPdf, type AssembledPacket } from "@mailmypdf/packet-builder";
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
  return packet;
}
