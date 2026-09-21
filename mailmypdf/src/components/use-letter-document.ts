import { useEffect, useState } from "react";
import type { AddressInput } from "@/services/mail.service";

/** Generate once for review; checkout uploads these same bytes, not a new rendering. */
export function useLetterDocument(
  enabled: boolean,
  text: string,
  sender: AddressInput,
  recipient: AddressInput,
) {
  const basis = JSON.stringify([text, sender, recipient]);
  const [result, setResult] = useState<{ basis: string; file: File; pages: number } | null>(null);
  const [failure, setFailure] = useState<{ basis: string; message: string } | null>(null);
  useEffect(() => {
    if (!enabled || result?.basis === basis) return;
    let cancelled = false;
    setFailure(null);
    void (async () => {
      try {
        const { generateLetterPdf } = await import("@mailmypdf/packet-builder");
        const { PDFDocument } = await import("pdf-lib");
        const bytes = await generateLetterPdf({
          letterText: text,
          senderName: sender.name,
          senderLine1: sender.line1,
          senderLine2: sender.line2,
          senderCity: sender.city,
          senderState: sender.state,
          senderPostal: sender.postalCode,
          recipientName: recipient.name,
          recipientLine1: recipient.line1,
          recipientLine2: recipient.line2,
          recipientCity: recipient.city,
          recipientState: recipient.state,
          recipientPostal: recipient.postalCode,
        });
        const pages = (await PDFDocument.load(bytes)).getPageCount();
        if (pages > 10) throw new Error("Your letter is over 10 pages. Shorten it before mailing.");
        if (!cancelled)
          setResult({
            basis,
            file: new File([new Uint8Array(bytes)], "typed-letter.pdf", {
              type: "application/pdf",
            }),
            pages,
          });
      } catch {
        if (!cancelled)
          setFailure({
            basis,
            message:
              "We couldn’t prepare this letter for review. Check its length and characters, then edit it or return to the previous step and try again.",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    basis,
    result?.basis,
    text,
    sender.name,
    sender.line1,
    sender.line2,
    sender.city,
    sender.state,
    sender.postalCode,
    recipient.name,
    recipient.line1,
    recipient.line2,
    recipient.city,
    recipient.state,
    recipient.postalCode,
  ]);
  return {
    document: result?.basis === basis ? result : null,
    error: failure?.basis === basis ? failure.message : null,
  };
}
