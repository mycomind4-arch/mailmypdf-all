export type PacketPreviewMailClass = "standard" | "certified" | "registered";

export type PacketPreviewResourceIdentity = {
  matterId: string;
  mailClass: PacketPreviewMailClass;
  packetSha256: string;
};

const PACKET_PREVIEW_SCHEME = "mailmypdf:";
const PACKET_PREVIEW_HOST = "packet-preview";

function normalizeHash(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("packetSha256 must be a 64-character SHA-256 hex digest");
  }
  return normalized;
}

function normalizeMailClass(value: string): PacketPreviewMailClass {
  if (value === "standard" || value === "certified" || value === "registered") {
    return value;
  }
  throw new Error("mailClass is invalid");
}

export function createPacketPreviewResourceUri(
  input: PacketPreviewResourceIdentity,
): string {
  const matterId = input.matterId.trim();
  if (!matterId) throw new Error("matterId is required");

  const url = new URL(`${PACKET_PREVIEW_SCHEME}//${PACKET_PREVIEW_HOST}/${encodeURIComponent(matterId)}`);
  url.searchParams.set("mailClass", normalizeMailClass(input.mailClass));
  url.searchParams.set("packetSha256", normalizeHash(input.packetSha256));
  return url.toString();
}

export function parsePacketPreviewResourceUri(
  value: string,
): PacketPreviewResourceIdentity | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== PACKET_PREVIEW_SCHEME || url.hostname !== PACKET_PREVIEW_HOST) {
    return null;
  }

  const encodedMatterId = url.pathname.replace(/^\/+/, "");
  if (!encodedMatterId || encodedMatterId.includes("/")) return null;

  let matterId: string;
  try {
    matterId = decodeURIComponent(encodedMatterId).trim();
  } catch {
    return null;
  }
  if (!matterId) return null;

  const mailClass = url.searchParams.get("mailClass");
  const packetSha256 = url.searchParams.get("packetSha256");
  if (
    !mailClass ||
    !packetSha256 ||
    !["standard", "certified", "registered"].includes(mailClass) ||
    !/^[0-9a-f]{64}$/i.test(packetSha256)
  ) {
    return null;
  }

  const allowed = new Set(["mailClass", "packetSha256"]);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) return null;
  }

  return {
    matterId,
    mailClass: mailClass as PacketPreviewMailClass,
    packetSha256: packetSha256.toLowerCase(),
  };
}
