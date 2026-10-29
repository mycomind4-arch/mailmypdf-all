/**
 * Owner-authenticated packet review response. This is deliberately read-only:
 * the route must derive the owner from a verified session and materialize
 * bytes from the secure case runtime before calling this helper.
 *
 * A PDF download is not an approval, checkout, or authorization to mail.
 */
export function acceptsPacketPdf(accept: string | null): boolean {
  // Explicit opt-in preserves the existing JSON response contract.
  return accept?.trim().toLowerCase() === "application/pdf";
}

export interface PacketPdfReview {
  readonly bytes: Uint8Array;
  readonly packetSha256: string;
  readonly responsePages: number;
  readonly supportingPages: number;
}

const SHA256 = /^[a-f0-9]{64}$/;
const MAX_REVIEW_BYTES = 20 * 1024 * 1024;

export async function packetPdfReviewResponse(packet: PacketPdfReview): Promise<Response> {
  if (!(packet?.bytes instanceof Uint8Array) ||
      packet.bytes.length < 5 || packet.bytes.length > MAX_REVIEW_BYTES ||
      !SHA256.test(packet.packetSha256 ?? "") ||
      !Number.isSafeInteger(packet.responsePages) || packet.responsePages < 1 ||
      !Number.isSafeInteger(packet.supportingPages) || packet.supportingPages < 0) {
    throw new Error("Invalid packet PDF preview");
  }

  // Copy before hashing and serving: a mutable storage adapter must not be
  // able to swap the bytes between verification and the response body.
  const copy = new Uint8Array(packet.bytes.length);
  copy.set(packet.bytes);
  if (copy[0] !== 0x25 || copy[1] !== 0x50 || copy[2] !== 0x44 ||
      copy[3] !== 0x46 || copy[4] !== 0x2d) {
    throw new Error("Invalid packet PDF preview");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  const actualSha256 = Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")).join("");
  if (actualSha256 !== packet.packetSha256) {
    throw new Error("Packet PDF integrity check failed");
  }

  return new Response(copy.buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="mailmypdf-packet-preview.pdf"',
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Packet-Sha256": actualSha256,
      "X-Response-Pages": String(packet.responsePages),
      "X-Supporting-Pages": String(packet.supportingPages),
    },
  });
}
