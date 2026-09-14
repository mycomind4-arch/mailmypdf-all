/**
 * PDF inspection utilities for the acceptance engine: structural preflight
 * (page count, encryption), text extraction (for mustContain / placeholder
 * scans), and page-image rendering for human/agent review. See "PDF
 * Preflight" and "PDF Visual Rendering" in
 * docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface PdfStructuralInfo {
  parses: boolean;
  pageCount: number;
  encrypted: boolean;
  error?: string;
}

export async function inspectPdfStructure(bytes: Uint8Array): Promise<PdfStructuralInfo> {
  try {
    const { PDFDocument } = await import("pdf-lib");
    // First, try strictly (ignoreEncryption: false) -- if that throws
    // specifically because the file is encrypted, pdf-lib still reports it
    // via a distinguishable error; fall back to a permissive load just to
    // measure page count so encrypted-but-parseable files aren't reported as
    // fully unparseable.
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false });
      return { parses: true, pageCount: doc.getPageCount(), encrypted: false };
    } catch (strictError) {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false }).catch(() => null);
      if (!doc) {
        return {
          parses: false,
          pageCount: 0,
          encrypted: false,
          error: strictError instanceof Error ? strictError.message : String(strictError),
        };
      }
      return { parses: true, pageCount: doc.getPageCount(), encrypted: true };
    }
  } catch (error) {
    return { parses: false, pageCount: 0, encrypted: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export interface RenderPagesResult {
  rendered: boolean;
  pageFiles: string[];
  reason?: string;
}

export interface PdfContentInspection {
  text: string;
  textWarning?: string;
  render: RenderPagesResult;
}

/**
 * Extracts page text and (optionally) renders every page to PNG, in ONE
 * pdfjs-dist document session.
 *
 * IMPORTANT: pdfjs-dist's Node "legacy" build has no real worker thread, so
 * it falls back to an in-process `LoopbackPort` that still round-trips
 * render/text commands through `structuredClone`-based message passing.
 * Empirically (see docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md, "Known
 * Finding: pdfjs-dist Node fake-worker only survives one getDocument() per
 * process"), a SECOND independent `getDocument()` call anywhere later in the
 * same process reliably throws "Unable to deserialize cloned data" on its
 * first postMessage round-trip -- regardless of call order, regardless of
 * `.destroy()`, and regardless of using a cache-busted fresh module
 * instance. The only reliable fix found is to do text extraction and
 * rendering for a given PDF in a single document session, which is exactly
 * what this function does. Do not add a second, separate `getDocument()`
 * call path for the same run -- route both needs through here.
 */
export async function inspectPdfContent(
  bytes: Uint8Array,
  options: { render?: { outDir: string } } = {},
): Promise<PdfContentInspection> {
  let loadingTask: any;
  const result: PdfContentInspection = { text: "", render: { rendered: false, pageFiles: [] } };

  let canvasLib: any;
  if (options.render) {
    try {
      canvasLib = await import("@napi-rs/canvas");
    } catch (error) {
      result.render = { rendered: false, pageFiles: [], reason: `@napi-rs/canvas unavailable: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
    loadingTask = (pdfjs as any).getDocument({
      data: bytes,
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
    });
    const doc = await loadingTask.promise;

    if (options.render && canvasLib) {
      mkdirSync(options.render.outDir, { recursive: true });
    }

    const pageTexts: string[] = [];
    const pageFiles: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);

      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item: any) => ("str" in item ? item.str : "")).join(" "));

      if (options.render && canvasLib) {
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasLib.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext("2d");
        await page.render({ canvasContext: context as any, viewport }).promise;
        const pngBuffer = await canvas.encode("png");
        const fileName = `page-${String(pageNum).padStart(3, "0")}.png`;
        const filePath = join(options.render.outDir, fileName);
        writeFileSync(filePath, pngBuffer);
        pageFiles.push(filePath);
      }
    }

    result.text = pageTexts.join("\f");
    if (options.render && canvasLib) result.render = { rendered: true, pageFiles };
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!result.text) result.textWarning = `Text extraction failed: ${message}`;
    if (options.render && !result.render.rendered) result.render = { rendered: false, pageFiles: [], reason: message };
    return result;
  } finally {
    try {
      await loadingTask?.destroy();
    } catch {
      // best-effort cleanup only
    }
  }
}

/**
 * Common unresolved-template / AI-artifact strings a mailed packet must
 * never contain. Deliberately excludes bare "null" -- real legal
 * correspondence legitimately contains phrases like "null and void", and
 * that false-positive risk isn't worth the marginal detection value when
 * "{{", "undefined", and "[object Object]" already catch the same class of
 * bug. See "PDF Preflight" ("use care with false positives") in
 * docs/architecture/WORKFLOW_ACCEPTANCE_ENGINE.md.
 */
export const DEFAULT_PLACEHOLDER_PATTERNS: string[] = [
  "{{",
  "}}",
  "undefined",
  "[object Object]",
  "TODO",
  "lorem ipsum",
  "[Your Name]",
  "[Your Address]",
  "[Insert Name]",
];

export function findPlaceholders(text: string, patterns: string[] = DEFAULT_PLACEHOLDER_PATTERNS): string[] {
  const lower = text.toLowerCase();
  return patterns.filter((pattern) => lower.includes(pattern.toLowerCase()));
}
