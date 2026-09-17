export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SecureHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "REQUEST_ERROR",
  ) {
    super(message);
    this.name = "SecureHttpError";
  }
}

export interface SecureHttpErrorMapper {
  map(error: unknown): { status: number; message: string; code?: string } | null;
}

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
} as const;

export function secureJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

export async function readJsonObject(
  request: Request,
  options: { maxBytes?: number } = {},
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new SecureHttpError(415, "application/json is required", "JSON_REQUIRED");
  }

  const maxBytes = options.maxBytes ?? 1024 * 1024;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("maxBytes must be a positive safe integer");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    throw new SecureHttpError(413, "Request body is too large", "BODY_TOO_LARGE");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new SecureHttpError(413, "Request body is too large", "BODY_TOO_LARGE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SecureHttpError(400, "Request body is not valid JSON", "INVALID_JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SecureHttpError(400, "A JSON object is required", "JSON_OBJECT_REQUIRED");
  }

  return parsed as Record<string, unknown>;
}

export function secureErrorResponse(
  scope: string,
  error: unknown,
  options: {
    mappers?: readonly SecureHttpErrorMapper[];
    log?: (message: string, error: unknown) => void;
  } = {},
): Response {
  if (error instanceof SecureHttpError) {
    return secureJson(error.status, { error: error.message, code: error.code });
  }

  for (const mapper of options.mappers ?? []) {
    const mapped = mapper.map(error);
    if (mapped) {
      return secureJson(mapped.status, {
        error: mapped.message,
        ...(mapped.code ? { code: mapped.code } : {}),
      });
    }
  }

  const log = options.log ?? ((message: string, value: unknown) => console.error(message, value));
  log(`[${scope}] request failed`, error);
  return secureJson(500, { error: "Request failed", code: "INTERNAL_ERROR" });
}
