import { useEffect, useState } from "react";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PagePreviewGrid } from "./PagePreviewGrid";

/** Read-only review of the supplied bytes; never edits or rebuilds a document. */
export function PdfDocumentReview({ file }: { file: File }) {
  const [preview, setPreview] = useState<{
    file: File;
    bytes: ArrayBuffer;
    url: string;
  } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    setPreview(null);
    setError(false);
    void file
      .arrayBuffer()
      .then((bytes) => {
        if (!cancelled) setPreview({ file, bytes, url });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <section className="wf-document-review" aria-label="Document preview">
      <h2>Review every page</h2>
      <p>
        This is your document, unchanged. Check readability, missing pages, and
        personal information. Preview is not a legal or content check.
      </p>
      {error && (
        <p role="alert">
          Preview could not load. Open your original file on your device and
          review every page before approving.
        </p>
      )}
      {!error && (!preview || preview.file !== file) && (
        <p role="status">Preparing the page previews…</p>
      )}
      {preview?.file === file && (
        <>
          <a
            href={preview.url}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download this exact PDF to review at full size
          </a>
          <p>
            If a page preview is unavailable, review the downloaded PDF before
            approving. If you cannot open it, replace the file.
          </p>
          <PagePreviewGrid
            pdfBytes={preview.bytes}
            workerSrc={workerSrc}
            thumbnailWidth={680}
          />
        </>
      )}
    </section>
  );
}
