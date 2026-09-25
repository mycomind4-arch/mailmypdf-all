import {
  ALLOWED_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_TEXT_BYTES,
  detectMimeType,
  isAllowedMimeType,
  isDangerousMimeType,
  isSafeUrl,
  sanitizeFilename,
} from "@mailmypdf/documents";

const MAX_REDIRECTS = 3;
const ABSOLUTE_MAX_BYTES = MAX_PDF_BYTES;
const DEFAULT_FILENAME = "assistant-attachment";

export interface AssistantRemoteFile {
  download_url: string;
  file_id: string;
  mime_type?: string;
  file_name?: string;
}

export interface DownloadedAssistantFile {
  file: File;
  sourceFileId: string;
  sourceHost: string;
  sourceMimeType: string | null;
}

export class AssistantFileIngressError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_FILE_REFERENCE"
      | "UNSAFE_FILE_URL"
      | "REMOTE_FILE_UNAVAILABLE"
      | "REMOTE_FILE_TOO_LARGE"
      | "UNSUPPORTED_FILE_TYPE"
      | "REMOTE_FILE_TYPE_MISMATCH",
  ) {
    super(message);
    this.name = "AssistantFileIngressError";
  }
}

function normalizeMimeType(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return normalized || null;
}

function isOpaqueBinaryMime(mimeType: string | null): boolean {
  return mimeType === "application/octet-stream" || mimeType === "binary/octet-stream";
}

function maxBytesForMime(mimeType: string | null): number {
  if (mimeType === "application/pdf") return MAX_PDF_BYTES;
  if (mimeType?.startsWith("image/")) return MAX_IMAGE_BYTES;
  if (mimeType?.startsWith("text/")) return MAX_TEXT_BYTES;
  return ABSOLUTE_MAX_BYTES;
}

function extensionForMime(mimeType: string | null): string {
  switch (mimeType) {
    case "application/pdf":
      return ".pdf";
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/tiff":
      return ".tiff";
    case "text/plain":
      return ".txt";
    default:
      return "";
  }
}

function safeFallbackFilename(fileId: string, mimeType: string | null): string {
  const base =
    fileId
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^[_\.]+|[_\.]+$/g, "")
      .slice(0, 120) || DEFAULT_FILENAME;
  return sanitizeFilename(`${base}${extensionForMime(mimeType)}`);
}

function configuredHostPatterns(raw = process.env.MCP_REMOTE_FILE_HOSTS ?? ""): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function hostnameMatchesPattern(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1);
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }
  return hostname === pattern;
}

function isIpLiteral(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

export function validateRemoteDocumentUrl(
  value: string,
  allowedHostPatterns = configuredHostPatterns(),
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AssistantFileIngressError("The assistant file URL is invalid.", "UNSAFE_FILE_URL");
  }

  if (!isSafeUrl(url.toString())) {
    throw new AssistantFileIngressError(
      "The assistant file URL must use public HTTPS and may not target a private or local network.",
      "UNSAFE_FILE_URL",
    );
  }

  if (url.username || url.password) {
    throw new AssistantFileIngressError(
      "Assistant file URLs may not contain embedded credentials.",
      "UNSAFE_FILE_URL",
    );
  }

  if (url.port && url.port !== "443") {
    throw new AssistantFileIngressError(
      "Assistant file URLs may only use the standard HTTPS port.",
      "UNSAFE_FILE_URL",
    );
  }

  const hostname = url.hostname.toLowerCase();
  if (
    isIpLiteral(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid")
  ) {
    throw new AssistantFileIngressError(
      "Assistant file URLs must use a public DNS hostname.",
      "UNSAFE_FILE_URL",
    );
  }

  if (
    allowedHostPatterns.length > 0 &&
    !allowedHostPatterns.some((pattern) => hostnameMatchesPattern(hostname, pattern))
  ) {
    throw new AssistantFileIngressError(
      "This assistant file host is not allowed by the MailMyPDF deployment.",
      "UNSAFE_FILE_URL",
    );
  }

  return url;
}

async function readBytesWithLimit(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new AssistantFileIngressError(
      "The attached file is larger than MailMyPDF allows for this document type.",
      "REMOTE_FILE_TOO_LARGE",
    );
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) {
      throw new AssistantFileIngressError(
        "The attached file is larger than MailMyPDF allows for this document type.",
        "REMOTE_FILE_TOO_LARGE",
      );
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("MailMyPDF file size limit exceeded").catch(() => undefined);
        throw new AssistantFileIngressError(
          "The attached file is larger than MailMyPDF allows for this document type.",
          "REMOTE_FILE_TOO_LARGE",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function resolveMimeType(input: {
  hinted: string | null;
  response: string | null;
  bytes: Uint8Array;
}): string {
  for (const declared of [input.hinted, input.response]) {
    if (declared && isDangerousMimeType(declared)) {
      throw new AssistantFileIngressError(
        `The attached file uses a blocked content type: ${declared}.`,
        "UNSUPPORTED_FILE_TYPE",
      );
    }
  }

  const hinted =
    input.hinted && !isOpaqueBinaryMime(input.hinted) && isAllowedMimeType(input.hinted)
      ? input.hinted
      : null;
  const responseMime =
    input.response && !isOpaqueBinaryMime(input.response) && isAllowedMimeType(input.response)
      ? input.response
      : null;
  const detected = detectMimeType(input.bytes);

  if (detected) {
    if (hinted && hinted !== detected) {
      throw new AssistantFileIngressError(
        "The attached file signature does not match the MIME type supplied by the assistant.",
        "REMOTE_FILE_TYPE_MISMATCH",
      );
    }
    if (responseMime && responseMime !== detected) {
      throw new AssistantFileIngressError(
        "The attached file signature does not match the MIME type returned by its download server.",
        "REMOTE_FILE_TYPE_MISMATCH",
      );
    }
    return detected;
  }

  if (hinted && hinted !== "text/plain") {
    throw new AssistantFileIngressError(
      "MailMyPDF could not verify the attached binary file type from its signature.",
      "REMOTE_FILE_TYPE_MISMATCH",
    );
  }
  if (responseMime && responseMime !== "text/plain") {
    throw new AssistantFileIngressError(
      "MailMyPDF could not verify the downloaded binary file type from its signature.",
      "REMOTE_FILE_TYPE_MISMATCH",
    );
  }

  if (hinted === "text/plain" || responseMime === "text/plain") return "text/plain";

  throw new AssistantFileIngressError(
    `MailMyPDF accepts only: ${ALLOWED_MIME_TYPES.join(", ")}.`,
    "UNSUPPORTED_FILE_TYPE",
  );
}

function normalizeAssistantFile(value: unknown): AssistantRemoteFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AssistantFileIngressError(
      "A file object with download_url and file_id is required.",
      "INVALID_FILE_REFERENCE",
    );
  }

  const file = value as Record<string, unknown>;
  if (typeof file.download_url !== "string" || !file.download_url.trim()) {
    throw new AssistantFileIngressError("download_url is required.", "INVALID_FILE_REFERENCE");
  }
  if (typeof file.file_id !== "string" || !file.file_id.trim()) {
    throw new AssistantFileIngressError("file_id is required.", "INVALID_FILE_REFERENCE");
  }
  if (file.mime_type !== undefined && typeof file.mime_type !== "string") {
    throw new AssistantFileIngressError("mime_type must be a string when provided.", "INVALID_FILE_REFERENCE");
  }
  if (file.file_name !== undefined && typeof file.file_name !== "string") {
    throw new AssistantFileIngressError("file_name must be a string when provided.", "INVALID_FILE_REFERENCE");
  }

  return {
    download_url: file.download_url.trim(),
    file_id: file.file_id.trim(),
    ...(typeof file.mime_type === "string" && file.mime_type.trim()
      ? { mime_type: file.mime_type.trim() }
      : {}),
    ...(typeof file.file_name === "string" && file.file_name.trim()
      ? { file_name: file.file_name.trim() }
      : {}),
  };
}

export async function downloadAssistantFile(
  rawFile: unknown,
  options: {
    fetchImpl?: typeof fetch;
    allowedHostPatterns?: string[];
  } = {},
): Promise<DownloadedAssistantFile> {
  const remote = normalizeAssistantFile(rawFile);
  const fetchImpl = options.fetchImpl ?? fetch;
  const allowedHostPatterns = options.allowedHostPatterns ?? configuredHostPatterns();
  let url = validateRemoteDocumentUrl(remote.download_url, allowedHostPatterns);

  let response: Response | null = null;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "application/pdf,image/png,image/jpeg,image/tiff,text/plain;q=0.9,*/*;q=0.1",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      if (redirectCount === MAX_REDIRECTS) {
        throw new AssistantFileIngressError(
          "The assistant file download redirected too many times.",
          "REMOTE_FILE_UNAVAILABLE",
        );
      }
      const location = response.headers.get("location");
      if (!location) {
        throw new AssistantFileIngressError(
          "The assistant file download returned an invalid redirect.",
          "REMOTE_FILE_UNAVAILABLE",
        );
      }
      url = validateRemoteDocumentUrl(new URL(location, url).toString(), allowedHostPatterns);
      continue;
    }

    break;
  }

  if (!response || !response.ok) {
    throw new AssistantFileIngressError(
      "The assistant file could not be downloaded. Its temporary link may have expired.",
      "REMOTE_FILE_UNAVAILABLE",
    );
  }

  const hintedMime = normalizeMimeType(remote.mime_type);
  const responseMime = normalizeMimeType(response.headers.get("content-type"));

  if (hintedMime && isDangerousMimeType(hintedMime)) {
    throw new AssistantFileIngressError(
      `The assistant supplied a blocked file type: ${hintedMime}.`,
      "UNSUPPORTED_FILE_TYPE",
    );
  }
  if (responseMime && isDangerousMimeType(responseMime)) {
    throw new AssistantFileIngressError(
      `The file download server returned a blocked file type: ${responseMime}.`,
      "UNSUPPORTED_FILE_TYPE",
    );
  }

  const preliminaryMime =
    hintedMime && isAllowedMimeType(hintedMime)
      ? hintedMime
      : responseMime && isAllowedMimeType(responseMime)
        ? responseMime
        : null;
  const bytes = await readBytesWithLimit(response, maxBytesForMime(preliminaryMime));
  const mimeType = resolveMimeType({ hinted: hintedMime, response: responseMime, bytes });

  const requestedName = remote.file_name?.trim();
  const filename = requestedName
    ? sanitizeFilename(requestedName)
    : safeFallbackFilename(remote.file_id, mimeType);

  if (!filename) {
    throw new AssistantFileIngressError(
      "MailMyPDF could not create a safe filename for the attached file.",
      "INVALID_FILE_REFERENCE",
    );
  }

  return {
    file: new File([bytes], filename, { type: mimeType }),
    sourceFileId: remote.file_id,
    sourceHost: url.hostname.toLowerCase(),
    sourceMimeType: hintedMime,
  };
}
