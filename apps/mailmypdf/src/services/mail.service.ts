/**
 * MailService — orchestrates the mail job lifecycle.
 *
 * This is the primary application service. It coordinates document
 * processing, pricing, billing, and database persistence for mail jobs
 * (currently called "orders" in the database).
 *
 * Routes and server functions call this service to create orders,
 * manage checkout, and retrieve order information. The service
 * delegates to DocumentService, PricingService, and BillingService
 * for specific concerns.
 */

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { distributedRateLimit } from "@/lib/distributed-rate-limit";
import {
  sanitizeAddress,
  sanitizeEmail,
  sanitizeFileName,
  sanitizePlainText,
} from "@/lib/sanitize";
import { DocumentService } from "./document.service";
import { PricingService } from "./pricing.service";
import { BillingService } from "./billing.service";
import type { MailClass } from "@/lib/pricing";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddressInput {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
}

export interface FileInput {
  name: string;
  sizeBytes: number;
  dataBase64: string;
}

export interface CreateOrderParams {
  email: string;
  sender: AddressInput;
  recipient: AddressInput;
  file: FileInput;
  color: boolean;
  mailClass: MailClass;
  scheduledDeliveryDate?: string;
  clientIp?: string;
}

export interface CreateOrderResult {
  orderId: string;
  token: string;
  pageCount: number;
  priceCents: number;
}

export interface CreateLetterOrderParams {
  email: string;
  sender: AddressInput;
  recipient: AddressInput;
  letterText: string;
  templateId?: string;
  color: boolean;
  mailClass: MailClass;
  scheduledDeliveryDate?: string;
  clientIp?: string;
}

export interface OrderWithEvents {
  order: Record<string, unknown>;
  events: Array<{ type: string; label: string; created_at: string; metadata?: unknown }>;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class MailService {
  private documents: DocumentService;
  private pricing: PricingService;
  private billing: BillingService;

  constructor() {
    this.documents = new DocumentService();
    this.pricing = new PricingService();
    this.billing = new BillingService();
  }

  /**
   * Create a mail job from a PDF upload.
   *
   * Steps:
   * 1. Rate limit by email
   * 2. Sanitize inputs
   * 3. Validate PDF
   * 4. Calculate price
   * 5. Upload to storage
   * 6. Insert order row
   * 7. Record events
   * 8. Clean up on failure
   */
  async createOrderFromPdf(params: CreateOrderParams): Promise<CreateOrderResult> {
    // Rate limit by email (per-user)
    const sanitizedEmail = sanitizeEmail(params.email);
    const rl = rateLimit(sanitizedEmail, "create-order", {
      maxRequests: 10,
      windowMs: 3_600_000,
    });
    if (!rl.allowed) {
      throw new Error("Too many orders. Please try again later.");
    }

    // Rate limit by IP (per-IP abuse prevention)
    const ipKey = params.clientIp ?? "unknown";
    const ipRl = await distributedRateLimit(ipKey, "create-order-ip", {
      maxRequests: 20,
      windowMs: 3_600_000,
    });
    if (!ipRl.allowed) {
      throw new Error("Too many orders from this address. Please try again later.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Sanitize
    const sender = sanitizeAddress(params.sender);
    const recipient = sanitizeAddress(params.recipient);
    const sanitizedFileName = sanitizeFileName(params.file.name);

    // Decode and validate PDF
    const pdfBytes = decodeBase64(params.file.dataBase64);
    if (pdfBytes.byteLength !== params.file.sizeBytes) {
      throw new Error("Uploaded file size did not match declared size.");
    }

    const { pageCount } = await this.documents.validatePdf(pdfBytes);
    const priceCents = this.pricing.calculateTotalCents({
      pageCount,
      color: params.color,
      mailClass: params.mailClass,
    });

    // Upload and create order
    const orderId = crypto.randomUUID();
    const token = randomToken(32);
    const { storagePath } = await this.documents.uploadDocument(
      orderId,
      sanitizedFileName,
      pdfBytes,
    );

    const { error: insertError } = await supabaseAdmin.from("orders").insert({
      id: orderId,
      lookup_token: token,
      email: sanitizedEmail,
      sender_name: sender.name,
      sender_line1: sender.line1,
      sender_line2: sender.line2,
      sender_city: sender.city,
      sender_state: sender.state,
      sender_postal: sender.postalCode,
      recipient_name: recipient.name,
      recipient_line1: recipient.line1,
      recipient_line2: recipient.line2,
      recipient_city: recipient.city,
      recipient_state: recipient.state,
      recipient_postal: params.recipient.postalCode,
      file_name: params.file.name,
      file_size_bytes: params.file.sizeBytes,
      page_count: pageCount,
      pdf_storage_path: storagePath,
      price_cents: priceCents,
      status: "draft",
      color: params.color,
      mail_class: params.mailClass,
      scheduled_delivery_date: params.scheduledDeliveryDate || null,
    });

    if (insertError) {
      await this.documents.deleteDocument(storagePath);
      throw new Error(`Could not create order: ${insertError.message}`);
    }

    // Record events
    await supabaseAdmin.from("order_events").insert([
      { order_id: orderId, type: "order.created", label: "Order created" },
      {
        order_id: orderId,
        type: "file.uploaded",
        label: `PDF uploaded (${pageCount} page${pageCount === 1 ? "" : "s"})`,
      },
    ]);

    return { orderId, token, pageCount, priceCents };
  }

  /**
   * Create a mail job from typed letter text (Letter Editor).
   *
   * Steps:
   * 1. Rate limit
   * 2. Generate PDF from letter text
   * 3. Validate generated PDF
   * 4. Calculate price
   * 5. Upload to storage
   * 6. Insert order row
   * 7. Record events
   * 8. Clean up on failure
   */
  async createOrderFromLetter(
    params: CreateLetterOrderParams,
  ): Promise<CreateOrderResult> {
    // Rate limit by email (per-user)
    const rl = rateLimit(
      params.email.toLowerCase(),
      "create-letter-order",
      { maxRequests: 10, windowMs: 3_600_000 },
    );
    if (!rl.allowed) {
      throw new Error("Too many orders. Please try again later.");
    }

    // Rate limit by IP (per-IP abuse prevention)
    const ipKey = params.clientIp ?? "unknown";
    const ipRl = await distributedRateLimit(ipKey, "create-letter-order-ip", {
      maxRequests: 20,
      windowMs: 3_600_000,
    });
    if (!ipRl.allowed) {
      throw new Error("Too many orders from this address. Please try again later.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Generate PDF from letter text
    const pdfBytes = await this.documents.generateLetterPdf({
      letterText: params.letterText,
      senderName: params.sender.name,
      senderLine1: params.sender.line1,
      senderLine2: params.sender.line2 || null,
      senderCity: params.sender.city,
      senderState: params.sender.state,
      senderPostal: params.sender.postalCode,
      recipientName: params.recipient.name,
      recipientLine1: params.recipient.line1,
      recipientLine2: params.recipient.line2 || null,
      recipientCity: params.recipient.city,
      recipientState: params.recipient.state,
      recipientPostal: params.recipient.postalCode,
    });

    // Validate the generated PDF
    const { pageCount } = await this.documents.validatePdf(pdfBytes);

    const priceCents = this.pricing.calculateTotalCents({
      pageCount,
      color: params.color,
      mailClass: params.mailClass,
    });

    const orderId = crypto.randomUUID();
    const token = randomToken(32);
    const fileName = params.templateId
      ? `letter-${params.templateId}.pdf`
      : "typed-letter.pdf";
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

    const { storagePath } = await this.documents.uploadDocument(
      orderId,
      safeFileName,
      pdfBytes,
    );

    const { error: insertError } = await supabaseAdmin.from("orders").insert({
      id: orderId,
      lookup_token: token,
      email: params.email,
      sender_name: params.sender.name,
      sender_line1: params.sender.line1,
      sender_line2: params.sender.line2 || null,
      sender_city: params.sender.city,
      sender_state: params.sender.state.toUpperCase(),
      sender_postal: params.sender.postalCode,
      recipient_name: params.recipient.name,
      recipient_line1: params.recipient.line1,
      recipient_line2: params.recipient.line2 || null,
      recipient_city: params.recipient.city,
      recipient_state: params.recipient.state.toUpperCase(),
      recipient_postal: params.recipient.postalCode,
      file_name: fileName,
      file_size_bytes: pdfBytes.byteLength,
      page_count: pageCount,
      pdf_storage_path: storagePath,
      price_cents: priceCents,
      status: "draft",
      color: params.color,
      mail_class: params.mailClass,
      letter_text: params.letterText,
      scheduled_delivery_date: params.scheduledDeliveryDate || null,
    });

    if (insertError) {
      await this.documents.deleteDocument(storagePath);
      throw new Error(`Could not create order: ${insertError.message}`);
    }

    await supabaseAdmin.from("order_events").insert([
      { order_id: orderId, type: "order.created", label: "Order created" },
      {
        order_id: orderId,
        type: "file.uploaded",
        label: `Letter composed (${pageCount} page${pageCount === 1 ? "" : "s"})`,
      },
    ]);

    return { orderId, token, pageCount, priceCents };
  }

  /**
   * Get an order by ID and lookup token, with its event history.
   */
  async getOrder(id: string, token: string): Promise<OrderWithEvents> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("lookup_token", token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found.");

    const { data: events } = await supabaseAdmin
      .from("order_events")
      .select("type,label,created_at,metadata")
      .eq("order_id", id)
      .order("created_at", { ascending: true });

    return { order, events: events ?? [] };
  }

  /**
   * Look up an order by email + order ID. Returns the lookup token.
   */
  async lookupOrder(
    email: string,
    orderId: string,
  ): Promise<{ token: string } | null> {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, lookup_token")
      .eq("id", orderId)
      .ilike("email", email)
      .maybeSingle();
    if (!order) return null;
    return { token: order.lookup_token as string };
  }

  /**
   * Preview pricing for a PDF upload (validates + returns page count and price).
   */
  async previewPdfPricing(
    sizeBytes: number,
    dataBase64: string,
  ): Promise<{ pageCount: number; priceCents: number } | { error: string }> {
    try {
      const bytes = decodeBase64(dataBase64);
      if (bytes.byteLength !== sizeBytes) return { error: "File size mismatch." };
      const { pageCount } = await this.documents.validatePdf(bytes);
      const priceCents = this.pricing.getBasePrice(pageCount);
      return { pageCount, priceCents };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Could not validate this PDF.",
      };
    }
  }

  /**
   * Preview pricing for a letter (estimates pages + calculates price).
   */
  async previewLetterPricing(
    letterText: string,
    color: boolean,
    mailClass: MailClass,
  ): Promise<{ pageCount: number; priceCents: number } | { error: string }> {
    try {
      const { estimateLetterPageCount } = await import("@/lib/letter-pdf.server");
      const pageCount = estimateLetterPageCount(letterText);
      const priceCents = this.pricing.calculateTotalCents({
        pageCount,
        color,
        mailClass,
      });
      return { pageCount, priceCents };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "Could not estimate pricing.",
      };
    }
  }

  /**
   * Get the BillingService (for checkout creation).
   * Exposed so route handlers can call billing without a separate import.
   */
  getBilling(): BillingService {
    return this.billing;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let output = "";
  for (const byte of bytes) output += chars[byte % chars.length];
  return output;
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    output[index] = binary.charCodeAt(index);
  return output;
}
