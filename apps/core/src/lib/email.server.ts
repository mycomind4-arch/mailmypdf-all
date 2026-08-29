import { getConfig } from "@/config";
import { flags } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";

// Server-only email helpers. Safe to no-op when RESEND_API_KEY is not
// configured — every send is idempotent via an order_events marker row.

const RESEND_API_BASE = "https://api.resend.com/emails";

/**
 * Get the configured sender address for transactional emails.
 * Falls back to a sensible default if not explicitly configured.
 */
function getFromAddress(): string {
  const config = getConfig();
  // Use environment variable override, then config, then default
  const fromEnv = process.env.RESEND_FROM_ADDRESS;
  if (fromEnv) return fromEnv;
  return config.email.fromAddress;
}

/**
 * Get the configured support email address.
 */
function getSupportEmail(): string {
  const config = getConfig();
  const supportEnv = process.env.RESEND_SUPPORT_EMAIL;
  if (supportEnv) return supportEnv;
  return config.email.supportEmail;
}

function appOrigin(fallback?: string): string {
  const config = getConfig();
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    fallback ||
    config.urls.appBaseUrl
  );
}

function trackingUrl(origin: string, orderId: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/orders/${orderId}?token=${encodeURIComponent(token)}`;
}

async function alreadySent(
  admin: any,
  orderId: string,
  type: string,
): Promise<boolean> {
  const { data } = await admin
    .from("order_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", type)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function logEvent(
  admin: any,
  orderId: string,
  type: string,
  label: string,
  metadata?: Record<string, unknown>,
) {
  await admin.from("order_events").insert({
    order_id: orderId,
    type,
    label,
    metadata: metadata ?? null,
  });
}

function isConfigured(): boolean {
  return flags.isEmailEnabled();
}

async function sendViaResend(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const from = getFromAddress();
    const res = await fetch(RESEND_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getConfig().email.resendApiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function paymentHtml(o: {
  orderId: string;
  recipientCity: string;
  recipientState: string;
  priceCents: number;
  trackUrl: string;
}) {
  const support = getSupportEmail();
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:24px;color:#1c1917">
  <h1 style="font-size:22px;margin:0 0 8px">Payment received</h1>
  <p>Thanks — we've received your payment for order <strong>#${o.orderId.slice(0, 8).toUpperCase()}</strong>.</p>
  <p>Your letter to ${o.recipientCity}, ${o.recipientState} is now in the mailing queue. You can track its status here:</p>
  <p><a href="${o.trackUrl}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">View order status</a></p>
  <p style="font-size:12px;color:#666">Keep this link private — it's the only way back into your order.</p>
  <p style="font-size:12px;color:#666">Amount charged: $${(o.priceCents / 100).toFixed(2)}</p>
  <p style="font-size:12px;color:#666">Questions? Reply to this email or contact ${support}.</p>
</div>`;
}

function mailedHtml(o: {
  orderId: string;
  recipientCity: string;
  recipientState: string;
  trackUrl: string;
}) {
  const support = getSupportEmail();
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:24px;color:#1c1917">
  <h1 style="font-size:22px;margin:0 0 8px">Your letter has been mailed</h1>
  <p>Order <strong>#${o.orderId.slice(0, 8).toUpperCase()}</strong> was handed to USPS and is on its way to ${o.recipientCity}, ${o.recipientState}.</p>
  <p>Domestic first-class letters typically arrive in 3–7 business days.</p>
  <p><a href="${o.trackUrl}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">View order status</a></p>
  <p style="font-size:12px;color:#666">Questions? Contact ${support}.</p>
</div>`;
}

export async function sendPaymentConfirmationEmail(
  admin: any,
  orderId: string,
  requestOrigin?: string,
): Promise<void> {
  if (await alreadySent(admin, orderId, "email.payment_confirmation_sent")) return;

  const { data: order } = await admin
    .from("orders")
    .select("email, lookup_token, recipient_city, recipient_state, price_cents")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  if (!isConfigured()) {
    console.warn(
      "[email] RESEND_API_KEY not configured — skipping payment confirmation email for order",
      orderId,
    );
    await logEvent(admin, orderId, "email.skipped", "Payment email skipped (email not configured)", {
      kind: "payment_confirmation",
    });
    return;
  }

  const trackUrl = trackingUrl(appOrigin(requestOrigin), orderId, order.lookup_token);
  const result = await sendViaResend({
    to: order.email,
    subject: "Payment received — MailMyPDF",
    html: paymentHtml({
      orderId,
      recipientCity: order.recipient_city,
      recipientState: order.recipient_state,
      priceCents: order.price_cents,
      trackUrl,
    }),
  });

  if (result.ok) {
    await logEvent(admin, orderId, "email.payment_confirmation_sent", "Payment confirmation email sent");
  } else {
    logger.error("Payment confirmation email failed", { error: result.error, orderId });
    await logEvent(admin, orderId, "email.failed", "Payment confirmation email failed", {
      error: result.error,
    });
  }
}

export async function sendMailedEmail(admin: any, orderId: string): Promise<void> {
  if (await alreadySent(admin, orderId, "email.mailed_sent")) return;

  const { data: order } = await admin
    .from("orders")
    .select("email, lookup_token, recipient_city, recipient_state")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  if (!isConfigured()) {
    console.warn("[email] RESEND_API_KEY not configured — skipping mailed email for order", orderId);
    await logEvent(admin, orderId, "email.skipped", "Mailed email skipped (email not configured)", {
      kind: "mailed",
    });
    return;
  }

  const trackUrl = trackingUrl(appOrigin(), orderId, order.lookup_token);
  const result = await sendViaResend({
    to: order.email,
    subject: "Your MailMyPDF letter has been mailed",
    html: mailedHtml({
      orderId,
      recipientCity: order.recipient_city,
      recipientState: order.recipient_state,
      trackUrl,
    }),
  });

  if (result.ok) {
    await logEvent(admin, orderId, "email.mailed_sent", "Mailed notification email sent");
  } else {
    logger.error("Mailed email failed", { error: result.error, orderId });
    await logEvent(admin, orderId, "email.failed", "Mailed email failed", { error: result.error });
  }
}

export async function sendOrderRecoveryEmail(
  admin: any,
  email: string,
  orders: Array<{
    id: string;
    lookup_token: string;
    file_name: string;
    recipient_city: string;
    recipient_state: string;
    status: string;
    created_at: string;
  }>,
): Promise<void> {
  if (!isConfigured()) {
    logger.warn("Resend API key not configured — cannot send recovery email", { email });
    return;
  }
  const origin = appOrigin();
  const support = getSupportEmail();
  const rows = orders
    .map((o) => {
      const url = trackingUrl(origin, o.id, o.lookup_token);
      const when = new Date(o.created_at).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee">
          <div style="font-weight:600">#${o.id.slice(0, 8).toUpperCase()} · ${o.file_name}</div>
          <div style="font-size:12px;color:#666">To ${o.recipient_city}, ${o.recipient_state} · ${when} · ${o.status.replace(/_/g, " ")}</div>
          <div style="margin-top:6px"><a href="${url}" style="color:#b91c1c">Track this order →</a></div>
        </td>
      </tr>`;
    })
    .join("");
  const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:24px;color:#1c1917">
    <h1 style="font-size:22px;margin:0 0 8px">Your MailMyPDF orders</h1>
    <p>Here are the tracking links for the ${orders.length} order${orders.length === 1 ? "" : "s"} on this email address. Keep them private.</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="font-size:12px;color:#666;margin-top:20px">If you didn't request this, you can safely ignore it. Questions? Contact ${support}.</p>
  </div>`;
  const result = await sendViaResend({
    to: email,
    subject: `Your MailMyPDF order links (${orders.length})`,
    html,
  });
  if (!result.ok) logger.error("Recovery email failed", { error: result.error, email });
}

export function emailIsConfigured(): boolean {
  return flags.isEmailEnabled();
}
