import type {
  DocumentExtractionRequest,
  DocumentIntelligenceProvider,
  ProviderExtractedDocument,
  ExtractedPage,
  ExtractedTable,
  SourceRef,
} from "./index.js";

export interface DoclingHttpProviderConfig {
  endpoint: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  authorizationHeader?: string;
}

type DoclingResponse = {
  text?: unknown;
  pages?: unknown;
  tables?: unknown;
  warnings?: unknown;
  metadata?: unknown;
};

function requireHttpsEndpoint(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Docling endpoint must use HTTPS");
  if (url.username || url.password) throw new Error("Docling endpoint must not contain credentials");
  return url;
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < min || resolved > max) {
    throw new Error(`${label} must be between ${min} and ${max}`);
  }
  return resolved;
}

async function readBoundedJson(response: Response, maxBytes: number): Promise<DoclingResponse> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("Docling response exceeds configured size limit");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Docling returned an empty response");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Docling response exceeds configured size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  try {
    return JSON.parse(new TextDecoder().decode(merged)) as DoclingResponse;
  } catch {
    throw new Error("Docling returned invalid JSON");
  }
}

function normalizePages(value: unknown): ExtractedPage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((page, index) => {
    if (!page || typeof page !== "object") return [];
    const row = page as Record<string, unknown>;
    const text = typeof row.text === "string" ? row.text : "";
    const pageNumber = Number.isInteger(row.pageNumber) && Number(row.pageNumber) > 0
      ? Number(row.pageNumber)
      : index + 1;
    return [{ pageNumber, text }];
  });
}

function normalizeTables(value: unknown): ExtractedTable[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((table) => {
    if (!table || typeof table !== "object") return [];
    const row = table as Record<string, unknown>;
    if (!Array.isArray(row.rows)) return [];
    const rows = row.rows.map((cells) =>
      Array.isArray(cells) ? cells.map((cell) => String(cell ?? "")) : [String(cells ?? "")],
    );
    return [{ page: Number.isInteger(row.page) ? Number(row.page) : undefined, rows }];
  });
}

export class DoclingHttpProvider implements DocumentIntelligenceProvider {
  readonly name = "docling";
  private readonly endpoint: URL;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly authorizationHeader?: string;

  constructor(config: DoclingHttpProviderConfig) {
    this.endpoint = requireHttpsEndpoint(config.endpoint);
    this.timeoutMs = boundedInteger(config.timeoutMs, 30_000, 1_000, 120_000, "Docling timeout");
    this.maxResponseBytes = boundedInteger(config.maxResponseBytes, 4 * 1024 * 1024, 1024, 16 * 1024 * 1024, "Docling response limit");
    this.authorizationHeader = config.authorizationHeader;
  }

  async extract(request: DocumentExtractionRequest): Promise<ProviderExtractedDocument> {
    if (!request.documentId || !request.filename.trim()) throw new Error("Docling request requires document identity");
    if (!request.content.byteLength) throw new Error("Docling request contains no document bytes");
    if (request.content.byteLength > 24 * 1024 * 1024) throw new Error("Docling request exceeds the 24 MB analysis limit");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(this.authorizationHeader ? { Authorization: this.authorizationHeader } : {}),
        },
        body: JSON.stringify({
          document_id: String(request.documentId),
          filename: request.filename,
          content_type: request.contentType,
          content_base64: (() => {
            let binary = "";
            for (const byte of request.content) binary += String.fromCharCode(byte);
            if (typeof btoa !== "function") throw new Error("Base64 encoder is unavailable");
            return btoa(binary);
          })(),
        }),
      });
    } catch (error) {
      throw new Error(controller.signal.aborted
        ? "Docling request timed out"
        : `Docling request failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`Docling returned HTTP ${response.status}`);
    }

    const payload = await readBoundedJson(response, this.maxResponseBytes);
    const pages = normalizePages(payload.pages);
    const text = typeof payload.text === "string"
      ? payload.text
      : pages.map((page) => page.text).join("\n\n");
    const warnings = Array.isArray(payload.warnings) ? payload.warnings.map(String) : [];
    const tables = normalizeTables(payload.tables);
    const sourceRefs: SourceRef[] = pages
      .filter((page) => page.text.trim())
      .map((page) => ({
        documentId: String(request.documentId),
        documentName: request.filename,
        page: page.pageNumber,
        excerpt: page.text.slice(0, 200),
        extractionMethod: "pdf_text",
        confidence: 0.9,
      }));

    return {
      documentId: request.documentId,
      documentName: request.filename,
      kind: text.trim() ? "text_pdf" : "image_only_pdf",
      text,
      pages,
      tables,
      sourceRefs,
      warnings,
      metadata: {
        extractor: "docling",
        pageCount: pages.length,
        ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata as Record<string, unknown> : {}),
      },
    };
  }
}
