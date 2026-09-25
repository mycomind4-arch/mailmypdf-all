import { computeSha256 } from "@mailmypdf/documents";
import { z } from "zod";

import { getClientIp } from "@/lib/rate-limit";
import {
  requireAuthenticatedUser,
  type AuthenticatedUserContext,
} from "@/lib/secure-core/auth.server";
import { intakeSecureDocument } from "@/lib/secure-core/document-intake.server";
import { createStripeClient, getMailMyPdfBaseUrl } from "@/lib/stripe.server";
import { getMailService } from "@/services";
import { classifyDocumentReadiness } from "./document-readiness";
import {
  AssistantFileIngressError,
  downloadAssistantFile,
} from "./remote-document.server";

const DIRECT_MAIL_WORKFLOW_ID = "mail-a-pdf";
const DIRECT_MAIL_PURPOSE = "assistant-direct-mail";
const DIRECT_PREPARED_EVENT = "mcp.direct_mail.prepared";
const DIRECT_APPROVED_EVENT = "mcp.direct_mail.approved";
const DIRECT_CHECKOUT_EVENT = "mcp.direct_mail.checkout_created";

const addressSchema = z.object({
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/),
  postal: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
});

const mailClassSchema = z.enum(["standard", "certified", "registered"]);
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);

export type DirectMailAddress = z.infer<typeof addressSchema>;
export type DirectMailClass = z.infer<typeof mailClassSchema>;

export class McpDirectMailError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "McpDirectMailError";
  }
}

type SecureDocumentRow = {
  id: string;
  safe_filename: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  security_status: string;
  deletion_requested_at: string | null;
  deleted_at: string | null;
};

type DirectOrderRow = {
  id: string;
  lookup_token: string;
  status: string;
  email: string;
  page_count: number;
  price_cents: number;
  file_name: string;
  pdf_storage_path: string;
  stripe_session_id: string | null;
  color: boolean | null;
  mail_class: string | null;
  approved_packet_sha256: string | null;
  approved_price_cents: number | null;
  sender_name: string;
  sender_line1: string;
  sender_line2: string | null;
  sender_city: string;
  sender_state: string;
  sender_postal: string;
  recipient_name: string;
  recipient_line1: string;
  recipient_line2: string | null;
  recipient_city: string;
  recipient_state: string;
  recipient_postal: string;
};

function parseAddress(value: unknown, label: string): DirectMailAddress {
  const parsed = addressSchema.safeParse(value);
  if (!parsed.success) {
    throw new McpDirectMailError(400, `${label} is not a valid US mailing address`);
  }
  return {
    ...parsed.data,
    state: parsed.data.state.toUpperCase(),
    line2: parsed.data.line2 ?? null,
  };
}

function parseMailClass(value: unknown): DirectMailClass {
  const parsed = mailClassSchema.safeParse(value);
  if (!parsed.success) {
    throw new McpDirectMailError(400, "mail_class must be standard, certified, or registered");
  }
  return parsed.data;
}

function parseColor(value: unknown): boolean {
  if (value === undefined) return false;
  if (typeof value !== "boolean") throw new McpDirectMailError(400, "color must be a boolean");
  return value;
}

function parseIdempotencyKey(value: unknown): string {
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) {
    throw new McpDirectMailError(
      400,
      "idempotency_key must be 8-128 characters using letters, numbers, dot, underscore, colon, or hyphen",
    );
  }
  return parsed.data;
}

async function requireAccount(request: Request): Promise<AuthenticatedUserContext> {
  const context = await requireAuthenticatedUser(request);
  if (!context.user.email?.trim()) {
    throw new McpDirectMailError(409, "A verified MailMyPDF account email is required");
  }
  return context;
}

async function secureDocument(
  context: AuthenticatedUserContext,
  documentId: string,
): Promise<SecureDocumentRow> {
  const { data, error } = await context.supabase
    .from("secure_documents")
    .select(
      "id,safe_filename,storage_path,mime_type,size_bytes,sha256,security_status,deletion_requested_at,deleted_at",
    )
    .eq("id", documentId)
    .eq("owner_id", context.user.id)
    .maybeSingle();

  if (error) throw new McpDirectMailError(500, "Unable to read secure document metadata");
  if (!data) throw new McpDirectMailError(404, "Document not found");

  return data as SecureDocumentRow;
}

function documentUsable(document: SecureDocumentRow): boolean {
  return (
    document.security_status === "clean" &&
    !document.deleted_at &&
    !document.deletion_requested_at
  );
}

async function downloadVerifiedSecurePdf(
  context: AuthenticatedUserContext,
  documentId: string,
): Promise<{ document: SecureDocumentRow; bytes: Uint8Array }> {
  const document = await secureDocument(context, documentId);
  const readiness = classifyDocumentReadiness(document.security_status, documentUsable(document));

  if (readiness !== "ready") {
    throw new McpDirectMailError(
      409,
      readiness === "rejected"
        ? "The document failed security validation and cannot be mailed"
        : readiness === "unavailable"
          ? "The document is no longer available"
          : "The document is still in quarantine or scanning",
      { readiness },
    );
  }
  if (document.mime_type !== "application/pdf") {
    throw new McpDirectMailError(400, "Direct PDF mailing requires an application/pdf document");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: stored, error } = await supabaseAdmin.storage
    .from("secure-documents")
    .download(document.storage_path);

  if (error || !stored) throw new McpDirectMailError(409, "The clean document bytes are unavailable");

  const bytes = new Uint8Array(await stored.arrayBuffer());
  const sha256 = computeSha256(bytes);
  if (sha256 !== document.sha256) {
    throw new McpDirectMailError(409, "The secure document hash no longer matches its intake record");
  }

  return { document, bytes };
}

async function orderById(orderId: string): Promise<DirectOrderRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id,lookup_token,status,email,page_count,price_cents,file_name,pdf_storage_path,stripe_session_id,color,mail_class,approved_packet_sha256,approved_price_cents,sender_name,sender_line1,sender_line2,sender_city,sender_state,sender_postal,recipient_name,recipient_line1,recipient_line2,recipient_city,recipient_state,recipient_postal",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new McpDirectMailError(500, "Unable to load direct-mail order");
  return (data as DirectOrderRow | null) ?? null;
}

async function requireDirectOrder(
  orderId: string,
  context: AuthenticatedUserContext,
): Promise<DirectOrderRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ownership, error: ownershipError } = await supabaseAdmin
    .from("order_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", DIRECT_PREPARED_EVENT)
    .contains("metadata", { owner_id: context.user.id })
    .limit(1)
    .maybeSingle();

  if (ownershipError) throw new McpDirectMailError(500, "Unable to verify direct-mail order ownership");
  if (!ownership) throw new McpDirectMailError(404, "Order not found");

  const order = await orderById(orderId);
  if (!order) throw new McpDirectMailError(404, "Order not found");
  return order;
}

async function orderPdfSha256(order: DirectOrderRow): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from("order-pdfs")
    .download(order.pdf_storage_path);
  if (error || !data) throw new McpDirectMailError(409, "The prepared mailing PDF is unavailable");
  return computeSha256(new Uint8Array(await data.arrayBuffer()));
}

async function currentQuote(order: DirectOrderRow): Promise<number> {
  const { mailCheckoutQuote } = await import("@/lib/mail-checkout-quote.server");
  const quote = await mailCheckoutQuote({
    email: order.email,
    page_count: order.page_count,
    color: order.color,
    mail_class: order.mail_class,
  });
  return quote.totalCents;
}

async function preparedOrderForIdempotency(
  ownerId: string,
  idempotencyKey: string,
): Promise<DirectOrderRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: event, error } = await supabaseAdmin
    .from("order_events")
    .select("order_id")
    .eq("type", DIRECT_PREPARED_EVENT)
    .contains("metadata", {
      owner_id: ownerId,
      idempotency_key: idempotencyKey,
    })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new McpDirectMailError(500, "Unable to check direct-mail idempotency");
  if (!event?.order_id) return null;
  return orderById(event.order_id);
}

function mailingSnapshot(order: DirectOrderRow) {
  return {
    sender: {
      name: order.sender_name,
      line1: order.sender_line1,
      line2: order.sender_line2,
      city: order.sender_city,
      state: order.sender_state,
      postal: order.sender_postal,
    },
    recipient: {
      name: order.recipient_name,
      line1: order.recipient_line1,
      line2: order.recipient_line2,
      city: order.recipient_city,
      state: order.recipient_state,
      postal: order.recipient_postal,
    },
    mailClass: order.mail_class ?? "standard",
    color: order.color ?? false,
  };
}

function summary(order: DirectOrderRow, packetSha256: string, totalCents: number) {
  return {
    orderId: order.id,
    packetSha256,
    totalCents,
    pageCount: order.page_count,
    fileName: order.file_name,
    ...mailingSnapshot(order),
  };
}

function metadataObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function directApprovalEvent(
  orderId: string,
  ownerId: string,
): Promise<Record<string, unknown> | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("order_events")
    .select("metadata")
    .eq("order_id", orderId)
    .eq("type", DIRECT_APPROVED_EVENT)
    .contains("metadata", { owner_id: ownerId })
    .limit(1)
    .maybeSingle();
  if (error) throw new McpDirectMailError(500, "Unable to read direct-mail approval");
  return metadataObject(data?.metadata);
}

function approvalSnapshotMatches(
  order: DirectOrderRow,
  metadata: Record<string, unknown> | null,
): boolean {
  const snapshot = metadataObject(metadata?.mailing_snapshot);
  return Boolean(
    snapshot &&
    JSON.stringify(snapshot) === JSON.stringify(mailingSnapshot(order)) &&
    metadata?.packet_sha256 === order.approved_packet_sha256 &&
    metadata?.total_cents === order.approved_price_cents
  );
}

export async function ingestDirectPdf(
  request: Request,
  rawFile: unknown,
  processingConsent: unknown,
) {
  if (processingConsent !== true) {
    throw new McpDirectMailError(
      400,
      "processing_consent must be true after the user explicitly asks MailMyPDF to process this PDF",
    );
  }

  const context = await requireAccount(request);
  let downloaded;
  try {
    downloaded = await downloadAssistantFile(rawFile);
  } catch (error) {
    if (error instanceof AssistantFileIngressError) {
      throw new McpDirectMailError(400, error.message, { code: error.code });
    }
    throw error;
  }

  if (downloaded.file.type !== "application/pdf") {
    throw new McpDirectMailError(400, "Direct mailing accepts PDF attachments only");
  }

  const registered = await intakeSecureDocument(
    {
      file: downloaded.file,
      workflowId: DIRECT_MAIL_WORKFLOW_ID,
      purpose: DIRECT_MAIL_PURPOSE,
      consent: true,
    },
    context,
  );

  const readiness = classifyDocumentReadiness(
    registered.security_status,
    registered.security_status === "clean",
  );

  return {
    document: {
      documentId: registered.id,
      filename: registered.safe_filename,
      mimeType: registered.mime_type,
      sizeBytes: registered.size_bytes,
      sha256: registered.sha256,
      securityStatus: registered.security_status,
      readiness,
      sourceFileId: downloaded.sourceFileId,
      sourceHost: downloaded.sourceHost,
    },
    nextAction:
      readiness === "ready"
        ? "The PDF is clean. Prepare the direct-mail order."
        : "The PDF is quarantined. Check get_document_status with document_id until it is ready.",
  };
}

export async function getOwnedDocumentStatus(
  request: Request,
  documentId: string,
) {
  const context = await requireAccount(request);
  const document = await secureDocument(context, documentId);
  const usable = documentUsable(document);
  const readiness = classifyDocumentReadiness(document.security_status, usable);

  return {
    document: {
      documentId: document.id,
      filename: document.safe_filename,
      mimeType: document.mime_type,
      sizeBytes: document.size_bytes,
      securityStatus: document.security_status,
      usable,
      readiness,
    },
    analysisAllowed: readiness === "ready",
    directMailAllowed: readiness === "ready" && document.mime_type === "application/pdf",
    nextAction:
      readiness === "ready"
        ? document.mime_type === "application/pdf"
          ? "The PDF is clean and may be prepared for direct mailing."
          : "The document is clean but is not a PDF, so it cannot use direct PDF mailing."
        : readiness === "rejected"
          ? "The document failed security validation. Ask the user for a different file."
          : readiness === "unavailable"
            ? "The document is unavailable and must be replaced."
            : "The document is still in quarantine or scanning. Check this status again before using it.",
  };
}

export async function prepareDirectPdfMail(
  request: Request,
  input: {
    documentId: unknown;
    sender: unknown;
    recipient: unknown;
    mailClass: unknown;
    color: unknown;
    idempotencyKey: unknown;
  },
) {
  const context = await requireAccount(request);
  const documentId =
    typeof input.documentId === "string" && input.documentId.trim()
      ? input.documentId.trim()
      : (() => {
          throw new McpDirectMailError(400, "document_id is required");
        })();
  const sender = parseAddress(input.sender, "sender");
  const recipient = parseAddress(input.recipient, "recipient");
  const mailClass = parseMailClass(input.mailClass);
  const color = parseColor(input.color);
  const idempotencyKey = parseIdempotencyKey(input.idempotencyKey);

  const existing = await preparedOrderForIdempotency(context.user.id, idempotencyKey);
  if (existing) {
    const packetSha256 = await orderPdfSha256(existing);
    const totalCents = await currentQuote(existing);
    return {
      order: summary(existing, packetSha256, totalCents),
      reused: true,
      nextAction:
        existing.approved_packet_sha256 && existing.approved_price_cents !== null
          ? "This direct-mail order is already approved. Prepare checkout."
          : "Show the exact PDF hash, recipient, mail class, and price to the user before approval.",
    };
  }

  const { document, bytes } = await downloadVerifiedSecurePdf(context, documentId);
  const packetSha256 = computeSha256(bytes);
  const email = context.user.email!.trim().toLowerCase();

  const created = await getMailService().createOrderFromPdf({
    email,
    sender: {
      name: sender.name,
      line1: sender.line1,
      line2: sender.line2,
      city: sender.city,
      state: sender.state,
      postalCode: sender.postal,
    },
    recipient: {
      name: recipient.name,
      line1: recipient.line1,
      line2: recipient.line2,
      city: recipient.city,
      state: recipient.state,
      postalCode: recipient.postal,
    },
    file: {
      name: document.safe_filename,
      sizeBytes: bytes.byteLength,
      dataBase64: Buffer.from(bytes).toString("base64"),
    },
    color,
    mailClass,
    clientIp: getClientIp(request),
  });

  const order = await orderById(created.orderId);
  if (!order) throw new McpDirectMailError(500, "Prepared order could not be reloaded");
  const totalCents = await currentQuote(order);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: eventError } = await supabaseAdmin.from("order_events").insert({
    order_id: order.id,
    type: DIRECT_PREPARED_EVENT,
    label: "Direct PDF mailing prepared from secure assistant attachment",
    metadata: {
      owner_id: context.user.id,
      secure_document_id: document.id,
      secure_document_sha256: document.sha256,
      packet_sha256: packetSha256,
      idempotency_key: idempotencyKey,
    },
  });

  if (eventError) {
    throw new McpDirectMailError(
      500,
      "The direct-mail order was created but its ownership record could not be saved",
    );
  }

  return {
    order: summary(order, packetSha256, totalCents),
    reused: false,
    nextAction:
      "Show the exact PDF hash, recipient, mail class, and price to the user. Do not approve until the user explicitly confirms those details.",
  };
}

export async function approveDirectPdfMail(
  request: Request,
  input: {
    orderId: unknown;
    expectedPacketSha256: unknown;
    expectedTotalCents: unknown;
    expectedSender: unknown;
    expectedRecipient: unknown;
    expectedMailClass: unknown;
    expectedColor: unknown;
  },
) {
  const context = await requireAccount(request);
  const orderId =
    typeof input.orderId === "string" && input.orderId.trim()
      ? input.orderId.trim()
      : (() => {
          throw new McpDirectMailError(400, "order_id is required");
        })();
  const expectedPacketSha256 =
    typeof input.expectedPacketSha256 === "string" &&
    /^[0-9a-f]{64}$/.test(input.expectedPacketSha256)
      ? input.expectedPacketSha256
      : (() => {
          throw new McpDirectMailError(400, "expected_packet_sha256 must be a lowercase SHA-256");
        })();
  const expectedTotalCents = input.expectedTotalCents;
  if (
    typeof expectedTotalCents !== "number" ||
    !Number.isSafeInteger(expectedTotalCents) ||
    expectedTotalCents < 0
  ) {
    throw new McpDirectMailError(400, "expected_total_cents must be a non-negative integer");
  }
  const expectedSender = parseAddress(input.expectedSender, "expected_sender");
  const expectedRecipient = parseAddress(input.expectedRecipient, "expected_recipient");
  const expectedMailClass = parseMailClass(input.expectedMailClass);
  if (typeof input.expectedColor !== "boolean") {
    throw new McpDirectMailError(400, "expected_color must be a boolean");
  }
  const expectedColor = input.expectedColor;

  const order = await requireDirectOrder(orderId, context);
  const reviewedMailing = {
    sender: expectedSender,
    recipient: expectedRecipient,
    mailClass: expectedMailClass,
    color: expectedColor,
  };
  if (JSON.stringify(reviewedMailing) !== JSON.stringify(mailingSnapshot(order))) {
    throw new McpDirectMailError(
      409,
      "The sender, recipient, mail class, or color setting changed after review. Review the current mailing details before approving.",
    );
  }
  const approvalMetadata = await directApprovalEvent(orderId, context.user.id);
  if (!approvalSnapshotMatches(order, approvalMetadata)) {
    throw new McpDirectMailError(
      409,
      "The current mailing details do not match the user's immutable approval",
    );
  }

  const currentHash = await orderPdfSha256(order);
  const totalCents = await currentQuote(order);

  if (currentHash !== expectedPacketSha256) {
    throw new McpDirectMailError(409, "The PDF changed after review. Review the current PDF before approving.");
  }
  if (totalCents !== expectedTotalCents) {
    throw new McpDirectMailError(409, "The mailing price changed after review. Review the current price before approving.", {
      currentTotalCents: totalCents,
    });
  }

  if (
    order.approved_packet_sha256 !== null ||
    order.approved_price_cents !== null
  ) {
    if (
      order.approved_packet_sha256 === currentHash &&
      order.approved_price_cents === totalCents
    ) {
      const existingApproval = await directApprovalEvent(orderId, context.user.id);
      if (!existingApproval) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: eventError } = await supabaseAdmin.from("order_events").insert({
          order_id: orderId,
          type: DIRECT_APPROVED_EVENT,
          label: "User approved exact direct-mail PDF, price, and mailing details",
          metadata: {
            owner_id: context.user.id,
            packet_sha256: currentHash,
            total_cents: totalCents,
            mailing_snapshot: mailingSnapshot(order),
          },
        });
        if (eventError) {
          throw new McpDirectMailError(500, "Approved order is missing its immutable mailing snapshot");
        }
      } else if (!approvalSnapshotMatches(order, existingApproval)) {
        throw new McpDirectMailError(409, "Stored approval does not match the current mailing details");
      }

      return {
        approval: {
          orderId,
          packetSha256: currentHash,
          totalCents,
          mailing: mailingSnapshot(order),
          approved: true,
        },
        reused: true,
        nextAction: "The exact PDF, price, and mailing details are already approved. Prepare checkout.",
      };
    }
    throw new McpDirectMailError(409, "This order was already approved for different immutable details");
  }

  if (order.status !== "draft") {
    throw new McpDirectMailError(409, "Only an unpaid draft order can be approved");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: updated, error } = await supabaseAdmin
    .from("orders")
    .update({
      approved_packet_sha256: currentHash,
      approved_price_cents: totalCents,
    })
    .eq("id", orderId)
    .eq("status", "draft")
    .is("approved_packet_sha256", null)
    .is("approved_price_cents", null)
    .select("id");

  if (error || !updated || updated.length !== 1) {
    throw new McpDirectMailError(409, "The order changed before approval could be recorded");
  }

  const { error: approvalEventError } = await supabaseAdmin.from("order_events").insert({
    order_id: orderId,
    type: DIRECT_APPROVED_EVENT,
    label: "User approved exact direct-mail PDF, price, and mailing details",
    metadata: {
      owner_id: context.user.id,
      packet_sha256: currentHash,
      total_cents: totalCents,
      mailing_snapshot: mailingSnapshot(order),
    },
  });
  if (approvalEventError) {
    throw new McpDirectMailError(
      500,
      "The order was approval-bound but its immutable mailing snapshot could not be recorded",
    );
  }

  return {
    approval: {
      orderId,
      packetSha256: currentHash,
      totalCents,
      mailing: mailingSnapshot(order),
      approved: true,
    },
    reused: false,
    nextAction: "The exact PDF, price, and mailing details are approved. Prepare secure checkout.",
  };
}

export async function prepareDirectPdfCheckout(
  request: Request,
  rawOrderId: unknown,
) {
  const context = await requireAccount(request);
  const orderId =
    typeof rawOrderId === "string" && rawOrderId.trim()
      ? rawOrderId.trim()
      : (() => {
          throw new McpDirectMailError(400, "order_id is required");
        })();

  let order = await requireDirectOrder(orderId, context);
  if (
    !order.approved_packet_sha256 ||
    order.approved_price_cents === null
  ) {
    throw new McpDirectMailError(409, "Approve the exact PDF and price before checkout");
  }

  const currentHash = await orderPdfSha256(order);
  const totalCents = await currentQuote(order);
  if (currentHash !== order.approved_packet_sha256) {
    throw new McpDirectMailError(409, "The prepared PDF no longer matches the approved hash");
  }
  if (totalCents !== order.approved_price_cents) {
    throw new McpDirectMailError(409, "The current price no longer matches the approved price", {
      approvedTotalCents: order.approved_price_cents,
      currentTotalCents: totalCents,
    });
  }
  if (order.status !== "draft") {
    throw new McpDirectMailError(409, "This order is no longer awaiting checkout");
  }

  const stripe = createStripeClient();
  if (order.stripe_session_id) {
    const existing = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (existing.status !== "open" || !existing.url) {
      throw new McpDirectMailError(409, "The existing checkout is no longer open");
    }
    return {
      checkoutUrl: existing.url,
      orderId,
      packetSha256: order.approved_packet_sha256,
      totalCents: order.approved_price_cents,
      reused: true,
    };
  }

  const baseUrl = getMailMyPdfBaseUrl();
  const successUrl = new URL(`/orders/${order.id}`, `${baseUrl}/`);
  successUrl.searchParams.set("token", order.lookup_token);
  successUrl.searchParams.set("paid", "1");
  const cancelUrl = new URL(`/orders/${order.id}`, `${baseUrl}/`);
  cancelUrl.searchParams.set("token", order.lookup_token);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: order.email,
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Mail ${order.page_count}-page PDF · ${order.mail_class ?? "standard"}`,
            },
            unit_amount: order.approved_price_cents,
          },
          quantity: 1,
        },
      ],
      metadata: { orderId: order.id, source: "mcp_direct_pdf" },
      payment_intent_data: {
        description: `MailMyPDF direct PDF mailing · ${order.file_name}`,
      },
    },
    {
      idempotencyKey: `mcp_direct_checkout_${order.id}_${order.approved_packet_sha256.slice(0, 16)}_${order.approved_price_cents}`,
    },
  );

  if (!session.url) {
    throw new McpDirectMailError(502, "Stripe did not return a hosted checkout URL");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id)
    .eq("status", "draft")
    .is("stripe_session_id", null)
    .select("id");

  if (claimError || !claimed || claimed.length !== 1) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    order = await requireDirectOrder(orderId, context);
    if (order.stripe_session_id) {
      const winner = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (winner.status === "open" && winner.url) {
        return {
          checkoutUrl: winner.url,
          orderId,
          packetSha256: order.approved_packet_sha256,
          totalCents: order.approved_price_cents,
          reused: true,
        };
      }
    }
    throw new McpDirectMailError(409, "Another checkout attempt changed this draft");
  }

  await supabaseAdmin.from("order_events").insert({
    order_id: order.id,
    type: DIRECT_CHECKOUT_EVENT,
    label: "Secure hosted checkout created for approved direct-mail PDF",
    metadata: {
      owner_id: context.user.id,
      packet_sha256: order.approved_packet_sha256,
      total_cents: order.approved_price_cents,
    },
  });

  return {
    checkoutUrl: session.url,
    orderId,
    packetSha256: order.approved_packet_sha256,
    totalCents: order.approved_price_cents,
    reused: false,
  };
}
