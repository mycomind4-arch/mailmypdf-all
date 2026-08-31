/**
 * Client-side text extraction from uploaded documents.
 *
 * For PDFs: uses pdf.js (pdfjs-dist) to extract text.
 * For images: sends directly to the server for OCR / vision model processing.
 *
 * Falls back to raw text extraction where possible.
 */

/**
 * Extract text from a PDF file using pdf.js loaded from CDN.
 * This runs client-side to avoid sending large files to the server for basic text extraction.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  // Dynamically import pdfjs-dist from CDN to avoid bundling it
  const pdfjsLib = await import(
    /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs"
  );

  // Set the worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  const maxPages = Math.min(pdf.numPages, 20); // Cap at 20 pages

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += `\n--- Page ${i} ---\n${pageText}\n`;
  }

  return fullText.trim();
}

/**
 * For images, we can't extract text client-side without OCR.
 * Instead, we send the image to the server for vision model analysis.
 * The server function handles image -> text -> analysis in one call.
 *
 * For now, return a placeholder that triggers image-based analysis on the server.
 */
export async function extractTextFromImage(file: File): Promise<string> {
  // Convert to base64 for server-side vision processing
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(`[IMAGE_DATA:${base64}]`);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Main entry point: extract text from any supported file type.
 */
export async function extractText(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    return extractTextFromPDF(file);
  }
  if (file.type === "image/jpeg" || file.type === "image/png") {
    return extractTextFromImage(file);
  }
  // For plain text files, just read them
  if (file.type.startsWith("text/")) {
    return await file.text();
  }
  throw new Error(`Unsupported file type: ${file.type}`);
}
