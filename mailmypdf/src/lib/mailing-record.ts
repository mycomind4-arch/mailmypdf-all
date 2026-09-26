import { z } from "zod";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { OrderWithEvents } from "@/services/mail.service";

/** A customer record, deliberately not a dump of privileged database rows. */
export function buildMailingRecord({ order, events }: OrderWithEvents) {
  const address = (side: "sender" | "recipient") => ({
    name: order[`${side}_name`],
    line1: order[`${side}_line1`],
    line2: order[`${side}_line2`],
    city: order[`${side}_city`],
    state: order[`${side}_state`],
    postalCode: order[`${side}_postal`],
  });

  const history = events.map((event) => {
    const metadata =
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? event.metadata as Record<string, unknown>
        : {};
    return {
      event: /^(order|payment|lob|fulfillment)\.[a-z_.-]+$/.test(event.type)
        ? event.type
        : "status_update",
      label: event.label,
      recordedAt: event.created_at,
      providerEventId: typeof metadata.external_id === "string" ? metadata.external_id : null,
      lifecycleStatus: typeof metadata.lifecycle_status === "string" ? metadata.lifecycle_status : null,
      trackingNumber: typeof metadata.tracking_number === "string" ? metadata.tracking_number : null,
    };
  });

  return {
    version: 2,
    kind: "MailMyPDF mailing evidence record — not a payment receipt",
    orderId: order.id,
    status: order.status,
    createdAt: order.created_at,
    document: {
      name: order.file_name,
      pages: order.page_count,
      color: order.color,
      sha256: order.document_sha256 ?? null,
      hashAlgorithm: order.document_sha256 ? "SHA-256" : null,
      availability: "Use the separate original PDF download; retained files may be unavailable.",
    },
    sender: address("sender"),
    recipient: address("recipient"),
    mailClass: order.mail_class,
    payment: {
      orderAmountCents: order.price_cents,
      currency: "USD",
      paidAt: order.paid_at ?? null,
      receipt: "Not included in this record",
    },
    provider: {
      name: "Lob",
      reference: order.lob_letter_id ?? null,
      trackingNumber: order.tracking_number ?? null,
      expectedDeliveryDate: order.expected_delivery_date ?? null,
      mailedAt: order.mailed_at ?? null,
    },
    delivery: {
      status: order.status,
      deliveredAt: order.delivered_at ?? null,
      returnReceiptRequested: order.mail_class === "certified_return_receipt",
      note:
        order.status === "delivered"
          ? "A verified provider event recorded delivery. This does not establish that the recipient read or agreed with the document."
          : "No completed delivery event is recorded yet. Carrier scans can be delayed or incomplete.",
    },
    history,
  };
}

export async function buildMailingEvidencePdf(record: ReturnType<typeof buildMailingRecord>): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margin = 54;
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  const write = (text: string, options: { bold?: boolean; size?: number; gap?: number } = {}) => {
    const size = options.size ?? 10;
    const font = options.bold ? bold : regular;
    const words = text.split(/\s+/);
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    for (const current of lines) {
      if (y < 60) return false;
      page.drawText(current, { x: margin, y, size, font });
      y -= size + 4;
    }
    y -= options.gap ?? 4;
    return true;
  };

  write("MailMyPDF Mailing Evidence Record", { bold: true, size: 18, gap: 10 });
  write(`Order: ${record.orderId}`, { bold: true });
  write(`Current status: ${record.status}`);
  write(`Created: ${record.createdAt}`);
  write(`Mail class: ${record.mailClass}`, { gap: 10 });

  write("Document", { bold: true, size: 12 });
  write(`Name: ${record.document.name}`);
  write(`Pages: ${record.document.pages}`);
  write(`SHA-256: ${record.document.sha256 ?? "Not recorded for this legacy order"}`, { gap: 10 });

  write("Mailing", { bold: true, size: 12 });
  write(`Sender: ${record.sender.name}, ${record.sender.line1}${record.sender.line2 ? `, ${record.sender.line2}` : ""}, ${record.sender.city}, ${record.sender.state} ${record.sender.postalCode}`);
  write(`Recipient: ${record.recipient.name}, ${record.recipient.line1}${record.recipient.line2 ? `, ${record.recipient.line2}` : ""}, ${record.recipient.city}, ${record.recipient.state} ${record.recipient.postalCode}`);
  write(`Provider reference: ${record.provider.reference ?? "Pending"}`);
  write(`Tracking number: ${record.provider.trackingNumber ?? "Not available"}`);
  write(`Mailed at: ${record.provider.mailedAt ?? "Not recorded"}`);
  write(`Expected delivery: ${record.provider.expectedDeliveryDate ?? "Not available"}`);
  write(`Delivered at: ${record.delivery.deliveredAt ?? "Not recorded"}`, { gap: 10 });

  write("Recorded event history", { bold: true, size: 12 });
  for (const event of record.history) {
    const parts = [event.recordedAt, event.label];
    if (event.lifecycleStatus) parts.push(`status=${event.lifecycleStatus}`);
    if (event.providerEventId) parts.push(`provider_event=${event.providerEventId}`);
    if (!write(parts.join(" | "), { size: 8, gap: 2 })) break;
  }

  y -= 8;
  write("Important: This record documents MailMyPDF's stored document fingerprint and provider events. A carrier-reported delivery does not prove that the recipient read or agreed with the document.", { size: 8 });

  return pdf.save();
}

interface RecordDependencies {
  /** Must enforce the existing order ID + private token authorization. */
  loadOrder: (id: string, token: string) => Promise<OrderWithEvents>;
  download: (storagePath: string) => Promise<Blob | null>;
}

const inputSchema = z.object({
  id: z.string().uuid(),
  token: z.string().min(8).max(128),
  artifact: z.enum(["summary", "evidence", "document"]),
});
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

/** POST keeps the bearer token out of download URLs and browser history. */
export async function serveMailingRecord(
  request: Request,
  id: string,
  deps: RecordDependencies,
): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return new Response("Forbidden", { status: 403, headers: privateHeaders });
  try {
    const form = await request.formData();
    const input = inputSchema.safeParse({
      id,
      token: form.get("token"),
      artifact: form.get("artifact"),
    });
    if (!input.success)
      return new Response("Invalid record request.", { status: 400, headers: privateHeaders });
    const record = await deps.loadOrder(id, input.data.token);
    if (record.order.id !== id) throw new Error("Order mismatch");
    if (input.data.artifact === "summary") {
      return new Response(JSON.stringify(buildMailingRecord(record), null, 2), {
        headers: {
          ...privateHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="mailing-${id}.json"`,
        },
      });
    }
    if (input.data.artifact === "evidence") {
      const bytes = await buildMailingEvidencePdf(buildMailingRecord(record));
      return new Response(bytes, {
        headers: {
          ...privateHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="mailing-evidence-${id}.pdf"`,
        },
      });
    }
    const path = record.order.pdf_storage_path;
    if (!path?.startsWith(`${id}/`) || path.split("/").includes(".."))
      throw new Error("Document unavailable");
    const pdf = await deps.download(path);
    if (!pdf) throw new Error("Document unavailable");
    return new Response(pdf, {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="mailing-${id}.pdf"`,
      },
    });
  } catch {
    return new Response(
      "This record or document is unavailable. Check your private order link or contact support.",
      { status: 404, headers: privateHeaders },
    );
  }
}
