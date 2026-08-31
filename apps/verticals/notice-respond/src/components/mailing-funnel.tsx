import { useCallback, useEffect, useRef, useState } from "react";
import { MAIL_OPTIONS, type MailOption } from "@/components/workflow-shell";
import { useAuth } from "@/lib/auth";

export interface MailingRecipient {
  name: string;
  org: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}

export interface MailingFunnelProps {
  draft: string;
  workflowId: string;
  workflowTitle: string;
  recipient?: MailingRecipient | null;
  extractionRef?: string | null;
  taxYear?: string | null;
  mailOptions?: MailOption[];
  disclaimer?: string;
  onMailingStateChange?: (state: MailingFunnelState) => void;
}

export interface MailingFunnelState {
  phase: "review" | "recipient" | "method" | "checkout" | "submitting" | "submitted" | "error";
  recipient: MailingRecipient;
  method: string;
  providerOrderId: string | null;
  trackingNumber: string | null;
  error: string | null;
}

const DEFAULT_RECIPIENT: MailingRecipient = {
  name: "",
  org: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
};

export function MailingFunnel({
  draft,
  workflowId,
  workflowTitle,
  recipient,
  extractionRef,
  taxYear,
  mailOptions = MAIL_OPTIONS,
  disclaimer,
  onMailingStateChange,
}: MailingFunnelProps) {
  const { accessToken, user } = useAuth();
  const [phase, setPhase] = useState<MailingFunnelState["phase"]>("review");
  const [mailRecipient, setMailRecipient] = useState<MailingRecipient>(recipient ?? DEFAULT_RECIPIENT);
  const [method, setMethod] = useState("certified");
  const [providerOrderId, setProviderOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processedCheckout = useRef(false);

  const notifyParent = useCallback((updates: Partial<MailingFunnelState>) => {
    onMailingStateChange?.({
      phase,
      recipient: mailRecipient,
      method,
      providerOrderId,
      trackingNumber,
      error,
      ...updates,
    });
  }, [phase, mailRecipient, method, providerOrderId, trackingNumber, error, onMailingStateChange]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([draft], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `response-${workflowId}-${extractionRef ?? "draft"}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [draft, workflowId, extractionRef]);

  const submitPaidMailing = useCallback(async (stripeSessionId: string) => {
    if (!accessToken) throw new Error("Your MailMyPDF Account session is unavailable. Sign in again before mailing.");
    setPhase("submitting");
    setError(null);
    notifyParent({ phase: "submitting" });

    const response = await fetch("/api/mail/response", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ stripeSessionId }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error ?? `Mailing submission failed (${response.status}).`);

    setProviderOrderId(payload.providerOrderId ?? null);
    setTrackingNumber(payload.trackingNumber ?? null);
    setPhase("submitted");
    notifyParent({
      phase: "submitted",
      providerOrderId: payload.providerOrderId ?? null,
      trackingNumber: payload.trackingNumber ?? null,
    });

    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url.toString());
  }, [accessToken, notifyParent]);

  useEffect(() => {
    if (processedCheckout.current || !accessToken || !user) return;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("checkout");
    const sessionId = params.get("session_id");
    if (result === "cancelled") {
      processedCheckout.current = true;
      setPhase("checkout");
      setError("Checkout was cancelled. Nothing has been mailed or charged through Notice Respond.");
      return;
    }
    if (result !== "success" || !sessionId) return;
    processedCheckout.current = true;
    void submitPaidMailing(sessionId).catch((cause) => {
      const message = cause instanceof Error ? cause.message : "Unable to complete the paid mailing.";
      setError(message);
      setPhase("error");
      notifyParent({ phase: "error", error: message });
    });
  }, [accessToken, user, submitPaidMailing, notifyParent]);

  const beginCheckout = useCallback(async () => {
    if (!accessToken || !user) {
      setError("Sign in with your MailMyPDF Account before purchasing mailing.");
      setPhase("error");
      return;
    }
    setPhase("submitting");
    setError(null);
    notifyParent({ phase: "submitting" });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          draft,
          workflowId,
          workflowTitle,
          mailingMethod: method,
          recipient: mailRecipient,
          matterReference: extractionRef ?? workflowId,
          matterType: "notice-respond",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload?.error ?? `Unable to start checkout (${response.status}).`);
      window.location.assign(payload.checkoutUrl);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to start checkout.";
      setError(message);
      setPhase("error");
      notifyParent({ phase: "error", error: message });
    }
  }, [accessToken, user, draft, workflowId, workflowTitle, method, mailRecipient, extractionRef, notifyParent]);

  const selectedOption = mailOptions.find((option) => option.id === method) ?? mailOptions[0];

  if (phase === "review") {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border-2 border-stamp/30 bg-stamp/5 p-6">
          <h3 className="font-serif text-2xl text-foreground">Your response is ready to mail</h3>
          <p className="mt-2 text-sm text-muted-foreground">Review the response, then use our authenticated Stripe → MailMyPDF checkout to pay and submit it with tracking.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => setPhase("recipient")} className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp">Mail this response</button>
            <button onClick={handleDownload} className="inline-flex items-center justify-center rounded-full border border-input px-6 py-3 text-sm font-medium">Download instead</button>
          </div>
        </div>
        <div className="rounded-lg border border-rule/60 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-stamp">Response Draft Preview</div>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">{draft.slice(0, 800)}{draft.length > 800 ? "\n…(truncated)" : ""}</pre>
        </div>
        {disclaimer && <div className="rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-xs text-muted-foreground">{disclaimer}</div>}
      </div>
    );
  }

  if (phase === "recipient") {
    return (
      <div className="space-y-6">
        <div className="postmark w-fit">Recipient</div>
        <h2 className="font-serif text-3xl">Where should we send it?</h2>
        {extractionRef && <div className="rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground"><strong>Notice reference:</strong> {extractionRef}{taxYear && <span> · <strong>Tax year:</strong> {taxYear}</span>}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <input className="input-field sm:col-span-2" value={mailRecipient.name} onChange={(e) => setMailRecipient({ ...mailRecipient, name: e.target.value })} placeholder="Recipient name *" />
          <input className="input-field sm:col-span-2" value={mailRecipient.org} onChange={(e) => setMailRecipient({ ...mailRecipient, org: e.target.value })} placeholder="Organization" />
          <input className="input-field sm:col-span-2" value={mailRecipient.address1} onChange={(e) => setMailRecipient({ ...mailRecipient, address1: e.target.value })} placeholder="Address line 1 *" />
          <input className="input-field sm:col-span-2" value={mailRecipient.address2} onChange={(e) => setMailRecipient({ ...mailRecipient, address2: e.target.value })} placeholder="Address line 2" />
          <input className="input-field" value={mailRecipient.city} onChange={(e) => setMailRecipient({ ...mailRecipient, city: e.target.value })} placeholder="City *" />
          <input className="input-field" value={mailRecipient.state} onChange={(e) => setMailRecipient({ ...mailRecipient, state: e.target.value })} placeholder="State *" />
          <input className="input-field" value={mailRecipient.zip} onChange={(e) => setMailRecipient({ ...mailRecipient, zip: e.target.value })} placeholder="ZIP *" />
        </div>
        <div className="flex justify-between"><button onClick={() => setPhase("review")} className="text-sm text-muted-foreground">← Back</button><button onClick={() => setPhase("method")} disabled={!mailRecipient.name || !mailRecipient.address1 || !mailRecipient.city || !mailRecipient.state || !mailRecipient.zip} className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-30">Continue →</button></div>
      </div>
    );
  }

  if (phase === "method") {
    return (
      <div className="space-y-6">
        <div className="postmark w-fit">Mail type</div>
        <h2 className="font-serif text-3xl">Choose your mail type</h2>
        <div className="space-y-3">{mailOptions.map((option) => <button key={option.id} onClick={() => setMethod(option.id)} className={`flex w-full items-center justify-between rounded-lg border p-4 text-left ${method === option.id ? "border-stamp bg-stamp/5" : "border-rule/60"}`}><div><span className="font-medium">{option.label}</span><span className="mt-1 block text-xs text-muted-foreground">{option.desc}</span></div><span className="font-serif text-lg">{option.price}</span></button>)}</div>
        <div className="flex justify-between"><button onClick={() => setPhase("recipient")} className="text-sm text-muted-foreground">← Back</button><button onClick={() => setPhase("checkout")} className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">Continue →</button></div>
      </div>
    );
  }

  if (phase === "checkout") {
    return (
      <div className="space-y-6">
        <div className="postmark w-fit">Checkout</div>
        <h2 className="font-serif text-3xl">Review and pay</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm"><span className="text-muted-foreground">Mail type</span><span className="font-medium">{selectedOption?.label}</span></div>
          <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm"><span className="text-muted-foreground">Recipient</span><span className="font-medium">{mailRecipient.name}</span></div>
          <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm"><span className="text-muted-foreground">Address</span><span className="font-medium">{mailRecipient.address1}</span></div>
          <div className="flex items-center justify-between rounded-lg border-2 border-stamp/40 bg-stamp/5 px-4 py-3 text-sm"><span className="text-muted-foreground">Total</span><span className="font-serif text-lg">{selectedOption?.price}</span></div>
        </div>
        <p className="text-xs text-muted-foreground">Stripe payment is completed before MailMyPDF submission. Returning from Stripe triggers a server-side payment verification and idempotent mailing request.</p>
        {disclaimer && <div className="rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-xs text-muted-foreground">{disclaimer}</div>}
        {error && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        <div className="flex justify-between"><button onClick={() => setPhase("method")} className="text-sm text-muted-foreground">← Back</button><button onClick={beginCheckout} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp">Pay and send →</button></div>
      </div>
    );
  }

  if (phase === "submitting") return <div className="space-y-6 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-stamp border-t-transparent" /><h2 className="font-serif text-2xl">Processing your mailing…</h2><p className="text-sm text-muted-foreground">Verifying payment and submitting the response through MailMyPDF.</p></div>;

  if (phase === "submitted") return <div className="space-y-6 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stamp/10"><svg className="h-8 w-8 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div><h2 className="font-serif text-3xl">Your response has been mailed</h2><p className="text-sm text-muted-foreground">Your {workflowTitle} response has been submitted through MailMyPDF.</p><div className="inline-flex items-center gap-2 rounded-lg border border-rule/60 px-4 py-3 text-sm"><span className="text-muted-foreground">Order ID:</span><span className="font-mono font-medium">{providerOrderId ?? "—"}</span></div><div className="inline-flex items-center gap-2 rounded-lg border border-rule/60 px-4 py-3 text-sm"><span className="text-muted-foreground">Tracking:</span><span className="font-mono font-medium">{trackingNumber ?? "— Pending —"}</span></div></div>;

  return <div className="space-y-6"><div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6"><h2 className="font-serif text-2xl text-destructive">Mailing submission failed</h2><p className="mt-2 text-sm text-muted-foreground">{error}</p><p className="mt-2 text-xs text-muted-foreground">Your response draft remains available. No additional mailing is attempted automatically after a failure.</p></div><div className="flex flex-col gap-3 sm:flex-row"><button onClick={() => setPhase("checkout")} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Retry checkout</button><button onClick={handleDownload} className="rounded-full border border-input px-6 py-3 text-sm font-medium">Download instead</button></div></div>;
}
