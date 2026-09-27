import { MCP_PROTOCOL_VERSION } from "./tool-catalog";

export const SUPPORTED_MCP_VERSIONS = [MCP_PROTOCOL_VERSION, "2025-11-25", "2025-06-18", "2025-03-26"] as const;
export const MAX_MCP_REQUEST_BYTES = 1024 * 1024;

export function isAllowedMcpOrigin(request: Request, canonicalOrigin: string): boolean {
  const origin = request.headers.get("origin");
  // Server-to-server clients normally omit Origin. Browser requests must match
  // a known origin; never accept suffixes, arbitrary subdomains or literal null.
  return origin === null || new Set([
    new URL(request.url).origin, canonicalOrigin,
    "https://chatgpt.com", "https://claude.ai",
  ]).has(origin);
}

export async function readMcpMessage(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing request body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MCP_REQUEST_BYTES) {
        await reader.cancel();
        throw new RangeError("MCP request is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(body));
}
