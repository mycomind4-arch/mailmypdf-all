import { useEffect, useRef, useState } from "react";

export interface PagePreviewGridProps {
  /** Bytes of the assembled PDF to preview — the exact packet that would be mailed. */
  pdfBytes: Uint8Array | ArrayBuffer;
  /**
   * One label per page (e.g. "Response Letter", "Enclosure: form-w2.pdf"),
   * same order as the PDF's pages. A page with no matching label just shows
   * its page number.
   */
  pageLabels?: readonly string[];
  /**
   * Called with the 0-based page index the user wants removed. This
   * component only renders and reports intent — the caller owns turning
   * "remove page 3" into the right document's `excluded_pages` (see
   * @mailmypdf/packet-builder's assemblePacket) and re-rendering with the
   * new merged bytes.
   */
  onDeletePage: (pageIndex: number) => void;
  /** Shown as a trailing tile in the grid; omit to hide "add documents". */
  onAddDocuments?: () => void;
  /**
   * URL to pdf.js's worker script. Bundler-specific (e.g. Vite's
   * `pdfjs-dist/build/pdf.worker.min.mjs?url`), so the consuming app
   * resolves it and passes it in rather than this library assuming a bundler.
   */
  workerSrc: string;
  /** Rendered thumbnail width in CSS pixels. Default 140. */
  thumbnailWidth?: number;
}

interface ThumbnailState {
  status: "loading" | "ready" | "error";
  dataUrl?: string;
}

/**
 * Renders every page of a PDF as a thumbnail the user can remove, plus an
 * optional trailing "add documents" tile — the packet preview a workflow's
 * Review/Mail step shows before the final PDF goes to the mailing provider.
 */
export function PagePreviewGrid({
  pdfBytes,
  pageLabels,
  onDeletePage,
  onAddDocuments,
  workerSrc,
  thumbnailWidth = 140,
}: PagePreviewGridProps) {
  const [thumbnails, setThumbnails] = useState<ThumbnailState[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Guards against a slow render from a previous (now-stale) pdfBytes
  // landing after a newer one has already started.
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    setLoadError(null);
    setThumbnails([]);

    let cancelled = false;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

        const data = pdfBytes instanceof Uint8Array ? pdfBytes.slice() : new Uint8Array(pdfBytes);
        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled || generationRef.current !== generation) return;

        const initial: ThumbnailState[] = Array.from({ length: pdf.numPages }, () => ({ status: "loading" }));
        setThumbnails(initial);

        for (let i = 1; i <= pdf.numPages; i += 1) {
          if (cancelled || generationRef.current !== generation) return;
          try {
            const page = await pdf.getPage(i);
            const viewportAt1 = page.getViewport({ scale: 1 });
            const scale = thumbnailWidth / viewportAt1.width;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Canvas 2D context unavailable");

            await page.render({ canvasContext: context, viewport }).promise;
            if (cancelled || generationRef.current !== generation) return;

            const dataUrl = canvas.toDataURL("image/png");
            setThumbnails((current) => {
              const next = [...current];
              next[i - 1] = { status: "ready", dataUrl };
              return next;
            });
          } catch {
            if (cancelled || generationRef.current !== generation) return;
            setThumbnails((current) => {
              const next = [...current];
              next[i - 1] = { status: "error" };
              return next;
            });
          }
        }
      } catch (error) {
        if (cancelled || generationRef.current !== generation) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load this PDF for preview.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBytes, workerSrc, thumbnailWidth]);

  if (loadError) {
    return <p className="wf-page-preview-error">{loadError}</p>;
  }

  return (
    <div className="wf-page-preview-grid">
      {thumbnails.map((thumb, index) => (
        <div key={index} className="wf-page-preview-tile">
          <div className="wf-page-preview-thumb" style={{ width: thumbnailWidth }}>
            {thumb.status === "ready" && thumb.dataUrl && (
              <img src={thumb.dataUrl} alt={pageLabels?.[index] ?? `Page ${index + 1}`} />
            )}
            {thumb.status === "loading" && <div className="wf-page-preview-loading" aria-hidden="true" />}
            {thumb.status === "error" && <div className="wf-page-preview-broken">Preview unavailable</div>}
            <button
              type="button"
              className="wf-page-preview-remove"
              aria-label={`Remove page ${index + 1}`}
              onClick={() => onDeletePage(index)}
            >
              ×
            </button>
          </div>
          <div className="wf-page-preview-caption">
            <span className="wf-page-preview-page-number">Page {index + 1}</span>
            {pageLabels?.[index] && <span className="wf-page-preview-label">{pageLabels[index]}</span>}
          </div>
        </div>
      ))}
      {onAddDocuments && (
        <button type="button" className="wf-page-preview-add" onClick={onAddDocuments}>
          <span className="wf-page-preview-add-icon" aria-hidden="true">+</span>
          <span>Add documents</span>
        </button>
      )}
    </div>
  );
}
