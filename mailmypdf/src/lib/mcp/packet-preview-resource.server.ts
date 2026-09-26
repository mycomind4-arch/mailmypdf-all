import type { AuthenticatedUserContext } from "@/lib/secure-core/auth.server";
import { materializePacketPreview } from "@/lib/secure-core/case-approval.server";
import {
  parsePacketPreviewResourceUri,
  type PacketPreviewResourceIdentity,
} from "./packet-preview-resource";

export class PacketPreviewResourceError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "PacketPreviewResourceError";
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    let binary = "";
    for (let index = 0; index < chunk.length; index += 1) {
      binary += String.fromCharCode(chunk[index]!);
    }
    chunks.push(binary);
  }
  return btoa(chunks.join(""));
}

export async function readPacketPreviewResource(
  uri: string,
  context: AuthenticatedUserContext,
): Promise<{
  identity: PacketPreviewResourceIdentity;
  content: {
    uri: string;
    mimeType: "application/pdf";
    blob: string;
  };
}> {
  const identity = parsePacketPreviewResourceUri(uri);
  if (!identity) {
    throw new PacketPreviewResourceError(
      404,
      "Packet preview resource not found",
      "PACKET_PREVIEW_RESOURCE_INVALID",
    );
  }

  const preview = await materializePacketPreview(
    identity.matterId,
    identity.mailClass,
    context,
  );

  if (preview.packetSha256.toLowerCase() !== identity.packetSha256) {
    throw new PacketPreviewResourceError(
      409,
      "The packet changed after preview. Build and review a fresh packet before approval.",
      "PACKET_PREVIEW_CHANGED",
    );
  }

  return {
    identity,
    content: {
      uri,
      mimeType: "application/pdf",
      blob: bytesToBase64(preview.bytes),
    },
  };
}
