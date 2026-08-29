const AUTH_KEY = "mailmypdf_business_auth";

async function runCheckoutReturn() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const result = params.get("checkout");
  const sessionId = params.get("session_id");
  if (result !== "success" || !sessionId) return;

  let session: { access_token?: string } | null = null;
  try { session = JSON.parse(localStorage.getItem(AUTH_KEY) || "null") as { access_token?: string } | null; } catch { session = null; }
  if (!session?.access_token) return;

  try {
    const headers = { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Accept: "application/json" };
    const verifyResponse = await fetch("/api/mail/response", { method: "POST", headers, body: JSON.stringify({ stripeSessionId: sessionId }) });
    const verifyPayload = await verifyResponse.json().catch(() => ({}));
    if (!verifyResponse.ok) throw new Error(verifyPayload?.error || `Payment verification failed (${verifyResponse.status}).`);

    if (verifyPayload?.mailingIntentId && (verifyPayload?.status === "paid" || verifyPayload?.readyForTrigger)) {
      const triggerResponse = await fetch("/api/trigger-paid", { method: "POST", headers, body: JSON.stringify({ mailingIntentId: verifyPayload.mailingIntentId }) });
      const triggerPayload = await triggerResponse.json().catch(() => ({}));
      if (!triggerResponse.ok) throw new Error(triggerPayload?.error || `Paid execution queueing failed (${triggerResponse.status}).`);
      window.dispatchEvent(new CustomEvent("mailmypdf:checkout", { detail: { ...verifyPayload, ...triggerPayload } }));
    } else {
      window.dispatchEvent(new CustomEvent("mailmypdf:checkout", { detail: verifyPayload }));
    }

    const clean = new URL(window.location.href);
    clean.searchParams.delete("checkout");
    clean.searchParams.delete("session_id");
    window.history.replaceState({}, "", clean.toString());
  } catch (error) {
    console.error("MailMyPDF Business checkout return failed:", error);
    window.dispatchEvent(new CustomEvent("mailmypdf:checkout", { detail: { error: error instanceof Error ? error.message : "Checkout completion failed." } }));
  }
}

void runCheckoutReturn();
