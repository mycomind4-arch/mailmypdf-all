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
  /** Native Docling Serve v1 is the default; opt into the previous custom wrapper. */
  protocol?: "serve-v1" | "legacy";
  apiKey?: string;
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
  document?: unknown;
  status?: unknown;
  errors?: unknown;
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
    const value: unknown = JSON.parse(new TextDecoder().decode(merged));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as DoclingResponse;
  } catch {
    throw new Error("Docling returned invalid JSON");
  }
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function positiveInteger(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

/** Preserve page provenance; never invent a page for unlocated text. */
function normalizeServe(payload: DoclingResponse): DoclingResponse {
  if (payload.status !== "success" && payload.status !== "partial_success") {
    throw new Error("Docling conversion did not succeed");
  }
  const document = object(payload.document);
  const json = object(document.json_content);
  if (!Object.keys(document).length || !Object.keys(json).length) {
    throw new Error("Docling returned no structured document");
  }
  const pageTexts = new Map<number, string[]>();
  const documentTexts: string[] = [];
  for (const [key, value] of Object.entries(object(json.pages))) {
    const number = positiveInteger(object(value).page_no) ?? positiveInteger(Number(key));
    if (number) pageTexts.set(number, []);
  }
  const addText = (item: Record<string, unknown>, text: string) => {
    if (text) documentTexts.push(text);
    const pages = new Set<number>();
    for (const prov of Array.isArray(item.prov) ? item.prov : []) {
      const number = positiveInteger(object(prov).page_no);
      if (number) pages.add(number);
    }
    for (const number of pages) {
      if (!pageTexts.has(number)) pageTexts.set(number, []);
      if (text) pageTexts.get(number)!.push(text);
    }
  };
  for (const item of Array.isArray(json.texts) ? json.texts : []) {
    const row = object(item);
    addText(row, typeof row.text === "string" ? row.text : "");
  }
  const tables: ExtractedTable[] = [];
  for (const item of Array.isArray(json.tables) ? json.tables : []) {
    const table = object(item);
    const data = object(table.data);
    const rowCount = positiveInteger(data.num_rows);
    const columnCount = positiveInteger(data.num_cols);
    if (!rowCount || !columnCount || rowCount * columnCount > 100_000) {
      throw new Error("Docling returned invalid or oversized table dimensions");
    }
    const rows = Array.from({ length: rowCount }, () => Array<string>(columnCount).fill(""));
    for (const value of Array.isArray(data.table_cells) ? data.table_cells : []) {
      const cell = object(value);
      const r = cell.start_row_offset_idx;
      const c = cell.start_col_offset_idx;
      if (!Number.isInteger(r) || !Number.isInteger(c) || Number(r) < 0 || Number(c) < 0
        || Number(r) >= rowCount || Number(c) >= columnCount) {
        throw new Error("Docling returned invalid table cell coordinates");
      }
      // Spanning cells occupy their anchor; do not duplicate monetary values.
      rows[Number(r)]![Number(c)] = typeof cell.text === "string" ? cell.text : "";
    }
    const page = (Array.isArray(table.prov) ? table.prov : [])
      .map((value) => positiveInteger(object(value).page_no)).find((value) => value !== undefined);
    tables.push({ page, rows });
    addText(table, rows.map((row) => row.join("\t")).join("\n"));
  }
  const pages = [...pageTexts].sort(([a], [b]) => a - b)
    .map(([pageNumber, texts]) => ({ pageNumber, text: texts.join("\n") }));
  const text = typeof document.text_content === "string" && document.text_content.trim()
    ? document.text_content
    : typeof document.md_content === "string" && document.md_content.trim()
      ? document.md_content : documentTexts.join("\n\n");
  return {
    text, pages, tables,
    warnings: payload.status === "partial_success"
      ? ["Docling conversion was incomplete; review the source document before relying on extracted evidence."] : [],
    metadata: { protocol: "serve-v1", conversionStatus: payload.status },
  };
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
  private readonly protocol: "serve-v1" | "legacy";
  private readonly apiKey?: string;

  constructor(config: DoclingHttpProviderConfig) {
    this.endpoint = requireHttpsEndpoint(config.endpoint);
    this.protocol = config.protocol ?? "serve-v1";
    if (this.protocol !== "serve-v1" && this.protocol !== "legacy") throw new Error("Unknown Docling protocol");
    if (this.protocol === "serve-v1") {
      if (this.endpoint.search || this.endpoint.hash) throw new Error("Docling endpoint must not contain query parameters or fragments");
      if (this.endpoint.pathname === "/" || this.endpoint.pathname === "") this.endpoint.pathname = "/v1/convert/source";
      if (!this.endpoint.pathname.endsWith("/v1/convert/source")) {
        throw new Error("Docling Serve endpoint must be /v1/convert/source; custom wrappers require protocol legacy");
      }
    }
    this.timeoutMs = boundedInteger(config.timeoutMs, 30_000, 1_000, 120_000, "Docling timeout");
    this.maxResponseBytes = boundedInteger(config.maxResponseBytes, 4 * 1024 * 1024, 1024, 16 * 1024 * 1024, "Docling response limit");
    this.authorizationHeader = config.authorizationHeader;
    this.apiKey = config.apiKey;
  }

  async extract(request: DocumentExtractionRequest): Promise<ProviderExtractedDocument> {
    if (!request.documentId || !request.filename.trim()) throw new Error("Docling request requires document identity");
    if (!request.content.byteLength) throw new Error("Docling request contains no document bytes");
    if (request.content.byteLength > 24 * 1024 * 1024) throw new Error("Docling request exceeds the 24 MB analysis limit");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let binary = "";
      // Chunks avoid argument-count limits on large documents.
      for (let offset = 0; offset < request.content.length; offset += 8192) {
        binary += String.fromCharCode(...request.content.subarray(offset, offset + 8192));
      }
      const encoded = btoa(binary);
      const response = await fetch(this.endpoint, {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(this.authorizationHeader ? { Authorization: this.authorizationHeader } : {}),
          ...(this.apiKey ? { "X-Api-Key": this.apiKey } : {}),
        },
        body: JSON.stringify(this.protocol === "serve-v1" ? {
          sources: [{ kind: "file", filename: request.filename, base64_string: encoded }],
          options: { to_formats: ["json", "text"], image_export_mode: "placeholder" },
          target: { kind: "inbody" },
        } : {
          document_id: String(request.documentId),
          filename: request.filename,
          content_type: request.contentType,
          content_base64: encoded,
        }),
      });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`Docling returned HTTP ${response.status}`);
    }

    const raw = await readBoundedJson(response, this.maxResponseBytes);
    const payload = this.protocol === "serve-v1" ? normalizeServe(raw) : raw;
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
      kind: request.contentType === "application/pdf"
        ? text.trim() ? "text_pdf" : "image_only_pdf"
        : request.contentType.startsWith("image/") ? "image"
          : request.contentType.startsWith("text/") ? "text" : "unknown",
      text,
      pages,
      tables,
      sourceRefs,
      warnings,
      metadata: {
        extractor: "docling",
        ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata as Record<string, unknown> : {}),
        pageCount: pages.length,
      },
    };
    } catch (error) {
      if (controller.signal.aborted) throw new Error("Docling request timed out");
      if (error instanceof Error && error.message.startsWith("Docling ")) throw error;
      throw new Error("Docling request failed");
    } finally {
      clearTimeout(timer);
    }
  }
}
