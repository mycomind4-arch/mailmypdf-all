export type DocumentSourceKind =
  | "local_upload"
  | "conversation_attachment"
  | "google_drive"
  | "mailmypdf_library"
  | "external_provider";

export type DocumentUseRole = "primary" | "supporting";

export interface DocumentSourceDescriptor {
  kind: DocumentSourceKind;
  role: DocumentUseRole;
  sourceId: string;
  provider: string | null;
  fileName: string;
  mimeType: string | null;
  importedAt: string;
}

const FORBIDDEN_SOURCE_KEYS = new Set([
  "access_token", "refresh_token", "token", "authorization", "password",
  "secret", "api_key", "download_url", "url",
]);

function value(value: string, field: string, max = 512): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  if (normalized.length > max) throw new Error(`${field} is too long`);
  return normalized;
}

export function normalizeDocumentSource(input: {
  kind: DocumentSourceKind;
  role: DocumentUseRole;
  sourceId: string;
  provider?: string | null;
  fileName: string;
  mimeType?: string | null;
  importedAt?: string;
  metadata?: Readonly<Record<string, unknown>>;
}): DocumentSourceDescriptor {
  for (const key of Object.keys(input.metadata ?? {})) {
    if (FORBIDDEN_SOURCE_KEYS.has(key.toLowerCase())) {
      throw new Error(`Document source metadata must not contain credentials or fetch URLs: ${key}`);
    }
  }

  const importedAt = input.importedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(importedAt))) throw new Error("importedAt must be an ISO date-time");

  const provider = input.provider?.trim() || null;
  if (input.kind === "google_drive" && provider !== "google") {
    throw new Error("google_drive sources must use provider google");
  }
  if (input.kind === "mailmypdf_library" && provider !== "mailmypdf") {
    throw new Error("mailmypdf_library sources must use provider mailmypdf");
  }

  return {
    kind: input.kind,
    role: input.role,
    sourceId: value(input.sourceId, "sourceId"),
    provider,
    fileName: value(input.fileName, "fileName", 255),
    mimeType: input.mimeType?.trim() || null,
    importedAt: new Date(Date.parse(importedAt)).toISOString(),
  };
}

export function documentSourceProvenance(source: DocumentSourceDescriptor) {
  return {
    sourceType: source.kind === "mailmypdf_library" ? "upload" as const : "external" as const,
    sourceId: source.sourceId,
    provider: source.provider,
    sourceKind: source.kind,
    role: source.role,
    originalFilename: source.fileName,
    importedAt: source.importedAt,
  };
}
