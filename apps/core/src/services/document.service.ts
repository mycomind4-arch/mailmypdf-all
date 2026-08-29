/**
 * DocumentService — handles PDF validation, generation, and storage.
 *
 * Extracted from orders.functions.ts to separate document processing
 * concerns from order creation and payment logic.
 *
 * This service does NOT know about:
 * - The database (orders table) — that's MailService's job
 * - Stripe / payments — that's BillingService's job
 * - The order state machine — that's MailService's job
 *
 * It DOES know about:
 * - PDF validation rules (page count, file size, format)
 * - Letter PDF generation from text
 * - Storage upload (via StorageProvider interface)
 * - SHA-256 hashing (for proof-of-service documents)
 */

import { getConfig } from "@/config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PdfValidationResult {
  pageCount: number;
  sizeBytes: number;
}

export interface UploadResult {
  storagePath: string;
  sizeBytes: number;
}

export interface LetterGenerationParams {
  letterText: string;
  senderName: string;
  senderLine1: string;
  senderLine2?: string | null;
  senderCity: string;
  senderState: string;
  senderPostal: string;
  recipientName: string;
  recipientLine1: string;
  recipientLine2?: string | null;
  recipientCity: string;
  recipientState: string;
  recipientPostal: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * DocumentService encapsulates all document processing logic.
 *
 * Usage:
 *   const docs = new DocumentService();
 *   const { pageCount } = await docs.validatePdf(bytes);
 *   const { storagePath } = await docs.uploadDocument(orderId, fileName, bytes);
 */
export class DocumentService {
  /**
   * Validate a PDF for mailing: check format, page count, file size.
   * Returns the page count if valid, throws if invalid.
   */
  async validatePdf(bytes: Uint8Array): Promise<PdfValidationResult> {
    const { validatePdfForMailing } = await import("@/lib/pdf-validation.server");
    const { pageCount } = await validatePdfForMailing(bytes);
    return { pageCount, sizeBytes: bytes.byteLength };
  }

  /**
   * Upload a document to storage.
   * Returns the storage path for the uploaded file.
   */
  async uploadDocument(
    orderId: string,
    fileName: string,
    bytes: Uint8Array,
  ): Promise<UploadResult> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storagePath = `${orderId}/${fileName}`;
    const { error } = await supabaseAdmin.storage
      .from("order-pdfs")
      .upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return { storagePath, sizeBytes: bytes.byteLength };
  }

  /**
   * Delete a document from storage (cleanup on order creation failure).
   */
  async deleteDocument(storagePath: string): Promise<void> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from("order-pdfs").remove([storagePath]);
  }

  /**
   * Generate a PDF from letter text.
   * Returns the generated PDF bytes.
   */
  async generateLetterPdf(params: LetterGenerationParams): Promise<Uint8Array> {
    const { generateLetterPdf } = await import("@/lib/letter-pdf.server");
    return generateLetterPdf(params);
  }

  /**
   * Estimate the page count for a letter without generating the PDF.
   */
  estimateLetterPages(letterText: string): number {
    // Inline the estimation to avoid circular dependency on letter-pdf.server
    // (which has heavy deps). This matches the existing logic.
    const { estimateLetterPageCount } = require("@/lib/letter-pdf.server");
    return estimateLetterPageCount(letterText);
  }

  /**
   * Compute SHA-256 hash of a document.
   * Used for proof-of-service document registration.
   */
  async computeHash(bytes: Uint8Array): Promise<string> {
    const { computeSha256 } = await import("@/lib/proof-of-service/hashing");
    return computeSha256(bytes);
  }
}
