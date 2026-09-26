import { z } from "zod";
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

interface RecordDependencies {
  /** Must enforce the existing order ID + private token authorization. */
  loadOrder: (id: string, token: string) => Promise<OrderWithEvents>;
  download: (storagePath: string) => Promise<Blob | null>;
}

const inputSchema = z.object({
  id: z.string().uuid(),
  token: z.string().min(8).max(128),
  artifact: z.enum(["summary", "document"]),
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
