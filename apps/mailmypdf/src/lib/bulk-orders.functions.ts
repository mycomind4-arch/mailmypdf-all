import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BulkRecipient {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
}

export interface BulkPreviewRow {
  index: number;
  recipient: BulkRecipient;
  priceCents: number;
  valid: boolean;
  error?: string;
}

// ── CSV Parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into recipient addresses.
 * Expected columns (header row required): name, line1, line2, city, state, postalCode
 * line2 is optional. State must be 2-letter. Postal code must be 5 or 9 digits.
 */
export function parseRecipientCsv(csvText: string): { recipients: BulkRecipient[]; errors: string[] } {
  const errors: string[] = [];
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { recipients: [], errors: ["CSV must have a header row and at least one data row."] };
  }

  // Parse header
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const colMap: Record<string, number> = {};
  headers.forEach((h, i) => {
    // Accept common variations
    if (h === "name" || h === "recipient_name" || h === "recipient") colMap.name = i;
    else if (h === "line1" || h === "address1" || h === "address" || h === "street") colMap.line1 = i;
    else if (h === "line2" || h === "address2" || h === "apt" || h === "unit") colMap.line2 = i;
    else if (h === "city") colMap.city = i;
    else if (h === "state") colMap.state = i;
    else if (h === "postal" || h === "postalcode" || h === "zip" || h === "zipcode" || h === "zip_code") colMap.postalCode = i;
  });

  if (colMap.name === undefined || colMap.line1 === undefined || colMap.city === undefined || colMap.state === undefined || colMap.postalCode === undefined) {
    return {
      recipients: [],
      errors: ["CSV must have columns: name, line1, city, state, postalCode (line2 is optional)."],
    };
  }

  const recipients: BulkRecipient[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const name = (fields[colMap.name] || "").trim();
    const line1 = (fields[colMap.line1] || "").trim();
    const line2 = colMap.line2 !== undefined ? (fields[colMap.line2] || "").trim() : "";
    const city = (fields[colMap.city] || "").trim();
    const state = (fields[colMap.state] || "").trim().toUpperCase();
    const postalCode = (fields[colMap.postalCode] || "").trim();

    if (!name || !line1 || !city || !state || !postalCode) {
      errors.push(`Row ${i + 1}: missing required field(s)`);
      continue;
    }
    if (state.length !== 2) {
      errors.push(`Row ${i + 1}: state must be 2 letters (got "${state}")`);
      continue;
    }
    if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
      errors.push(`Row ${i + 1}: invalid postal code "${postalCode}"`);
      continue;
    }

    recipients.push({
      name, line1, line2: line2 || null, city, state, postalCode,
    });
  }

  return { recipients, errors };
}

function parseCsvLine(line: string): string[] {
  // Simple CSV parser — handles quoted fields with commas
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Preview Bulk Order ───────────────────────────────────────────────────────

const previewBulkInput = z.object({
  csvText: z.string().min(1).max(500_000), // ~500KB max CSV
  pageCount: z.number().int().positive().max(100),
  color: z.boolean().default(false),
  mailClass: z.enum(["standard", "certified", "registered"]).default("standard"),
});

export const previewBulkOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => previewBulkInput.parse(data))
  .handler(async ({ data }): Promise<{
    rows: BulkPreviewRow[];
    totalCents: number;
    recipientCount: number;
    validCount: number;
    errors: string[];
  } | { error: string }> => {
    const { parseRecipientCsv } = await import("@/lib/bulk-orders.functions");
    const { calculateTotalPrice } = await import("@/lib/pricing");

    const { recipients, errors } = parseRecipientCsv(data.csvText);
    if (recipients.length === 0 && errors.length > 0) {
      return { error: errors[0] };
    }
    if (recipients.length > 200) {
      return { error: "Maximum 200 recipients per bulk order. Please split into smaller batches." };
    }

    const rows: BulkPreviewRow[] = recipients.map((r, i) => {
      const priceCents = calculateTotalPrice({
        pageCount: data.pageCount,
        color: data.color,
        mailClass: data.mailClass,
      });
      return { index: i, recipient: r, priceCents, valid: true };
    });

    const totalCents = rows.reduce((sum, r) => sum + r.priceCents, 0);

    return {
      rows,
      totalCents,
      recipientCount: recipients.length,
      validCount: recipients.length,
      errors,
    };
  });

// ── Create Bulk Order ────────────────────────────────────────────────────────

const createBulkInput = z.object({
  email: z.string().email().max(200),
  sender: z.object({
    name: z.string().min(1).max(120),
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional().nullable(),
    city: z.string().min(1).max(100),
    state: z.string().length(2),
    postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  }),
  file: z.object({
    name: z.string().min(1).max(200),
    sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
    dataBase64: z.string().min(1),
  }),
  csvText: z.string().min(1).max(500_000),
  color: z.boolean().default(false),
  mailClass: z.enum(["standard", "certified", "registered"]).default("standard"),
});

export const createBulkOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createBulkInput.parse(data))
  .handler(async ({ data }): Promise<{
    bulkOrderId: string;
    orderIds: string[];
    token: string;
    totalCents: number;
    recipientCount: number;
  } | { error: string }> => {
    // Rate limit: 3 bulk orders per hour per email
    const rl = rateLimit(data.email.toLowerCase(), "create-bulk-order", { maxRequests: 3, windowMs: 3_600_000 });
    if (!rl.allowed) {
      return { error: "Too many bulk orders. Please try again later." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { validatePdfForMailing } = await import("@/lib/pdf-validation.server");
    const { calculateTotalPrice } = await import("@/lib/pricing");
    const { parseRecipientCsv } = await import("@/lib/bulk-orders.functions");

    // Parse CSV
    const { recipients, errors } = parseRecipientCsv(data.csvText);
    if (recipients.length === 0) {
      return { error: "No valid recipients found in CSV." };
    }
    if (recipients.length > 200) {
      return { error: "Maximum 200 recipients per bulk order." };
    }

    // Validate PDF
    const pdfBytes = decodeBase64(data.file.dataBase64);
    if (pdfBytes.byteLength !== data.file.sizeBytes) {
      return { error: "Uploaded file size did not match declared size." };
    }
    const { pageCount } = await validatePdfForMailing(pdfBytes);

    // Upload PDF once — all orders share the same PDF
    const bulkOrderId = crypto.randomUUID();
    const token = randomToken(32);
    const storagePath = `${bulkOrderId}/${data.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("order-pdfs")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

    // Create individual orders for each recipient
    const priceCents = calculateTotalPrice({
      pageCount,
      color: data.color,
      mailClass: data.mailClass,
    });

    const orderIds: string[] = [];
    const orderInserts: any[] = [];

    for (const recipient of recipients) {
      const orderId = crypto.randomUUID();
      orderIds.push(orderId);

      orderInserts.push({
        id: orderId,
        lookup_token: token,
        email: data.email,
        // Same sender for all
        sender_name: data.sender.name,
        sender_line1: data.sender.line1,
        sender_line2: data.sender.line2 || null,
        sender_city: data.sender.city,
        sender_state: data.sender.state.toUpperCase(),
        sender_postal: data.sender.postalCode,
        // Per-recipient
        recipient_name: recipient.name,
        recipient_line1: recipient.line1,
        recipient_line2: recipient.line2 || null,
        recipient_city: recipient.city,
        recipient_state: recipient.state.toUpperCase(),
        recipient_postal: recipient.postalCode,
        // Same file for all
        file_name: data.file.name,
        file_size_bytes: data.file.sizeBytes,
        page_count: pageCount,
        pdf_storage_path: storagePath,
        price_cents: priceCents,
        status: "draft",
        color: data.color,
        mail_class: data.mailClass,
      });
    }

    // Batch insert all orders
    const { error: insertError } = await supabaseAdmin.from("orders").insert(orderInserts);
    if (insertError) {
      await supabaseAdmin.storage.from("order-pdfs").remove([storagePath]);
      return { error: `Could not create orders: ${insertError.message}` };
    }

    // Log events
    const eventInserts = orderIds.map((orderId) => ({
      order_id: orderId,
      type: "order.created",
      label: "Bulk order created",
      metadata: { bulk_order_id: bulkOrderId, recipient: "bulk" },
    }));
    await supabaseAdmin.from("order_events").insert(eventInserts);

    const totalCents = priceCents * recipients.length;

    return {
      bulkOrderId,
      orderIds,
      token,
      totalCents,
      recipientCount: recipients.length,
    };
  });

// ── Create Bulk Checkout ────────────────────────────────────────────────────

const bulkCheckoutInput = z.object({
  bulkOrderId: z.string().uuid(),
  orderIds: z.array(z.string().uuid()).min(1).max(200),
  token: z.string().min(8).max(128),
  totalCents: z.number().int().positive(),
  email: z.string().email().max(200),
  fileName: z.string().optional(),
});

export const createBulkCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bulkCheckoutInput.parse(data))
  .handler(async ({ data }): Promise<{ clientSecret: string } | { error: string }> => {
    const { createStripeClient, getMailMyPdfBaseUrl, getStripeErrorMessage } = await import("@/lib/stripe.server");

    try {
      const stripe = createStripeClient();
      const baseUrl = getMailMyPdfBaseUrl();
      const returnUrl = new URL("/bulk", `${baseUrl}/`);
      returnUrl.searchParams.set("bulk", data.bulkOrderId);
      returnUrl.searchParams.set("token", data.token);
      returnUrl.searchParams.set("paid", "1");

      const description = `MailMyPDF Bulk Mail — ${data.orderIds.length} letter${data.orderIds.length === 1 ? "" : "s"}`;

      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: description },
            unit_amount: data.totalCents,
          },
          quantity: 1,
        }],
        mode: "payment" as const,
        ui_mode: "embedded_page" as const,
        return_url: returnUrl.toString(),
        customer_email: data.email,
        payment_intent_data: { description: `${description}${data.fileName ? ` · ${data.fileName}` : ""}` },
        metadata: {
          bulkOrderId: data.bulkOrderId,
          orderIds: data.orderIds.join(","),
          isBulk: "true",
        },
      } as any, {
        idempotencyKey: `bulk_checkout_${data.bulkOrderId}`,
      });

      if (!session.client_secret) {
        return { error: "Failed to create checkout session." };
      }

      return { clientSecret: session.client_secret };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  for (let i = 0; i < binary.length; i += 1) output[i] = binary.charCodeAt(i);
  return output;
}
