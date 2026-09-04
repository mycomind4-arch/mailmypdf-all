// Shared response shaping for the v2 secure endpoints.
//
// Every v2 response is no-store: these payloads describe someone's medical,
// financial or legal documents and must not sit in a shared cache.

import { AuthenticationError } from "./auth.server";
import { CaseError, CaseNotFoundError } from "./case.server";
import { PacketError } from "./packet.server";

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

/**
 * Maps a thrown error to a response without leaking internals. Anything
 * unrecognized is a 500 with a generic message and a server-side log.
 */
export function errorResponse(scope: string, error: unknown): Response {
  if (error instanceof AuthenticationError) return json(401, { error: error.message });
  if (error instanceof CaseNotFoundError) return json(404, { error: error.message });
  if (error instanceof CaseError) return json(400, { error: error.message });
  if (error instanceof PacketError) return json(409, { error: error.message });
  console.error(`[${scope}] request failed`, error);
  return json(500, { error: "Request failed" });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    throw new CaseError("application/json is required");
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new CaseError("A JSON object is required");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof CaseError) throw error;
    throw new CaseError("Request body is not valid JSON");
  }
}
