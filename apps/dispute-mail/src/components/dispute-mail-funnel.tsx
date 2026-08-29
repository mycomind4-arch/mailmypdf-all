import { PRICES } from "@mailmypdf/pricing";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export interface DisputeMailFunnelProps {
  workflowId: string;
  workflowTitle: string;
  draft: string;
  documentId: string;
  caseId?: string | null;
  draftValidated: boolean;
  humanApproved: boolean;
  recipientComplete?: boolean;
}

const OPTIONS = [
  { id: "standard", label: "Standard", price: `$${(PRICES.standard / 100).toFixed(2)}`, cents: PRICES.standard, detail: "3–7 business days · Tracking included" },
  { id: "certified", label: "Certified", price: `$${(PRICES.certified / 100).toFixed(2)}`, cents: PRICES.certified, detail: "Delivery tracking + confirmation" },
  { id: "registered", label: "Registered", price: `$${(PRICES.registered / 100).toFixed(2)}`, cents: PRICES.registered, detail: "Secure handling + tracking" },
] as const;

export function DisputeMailFunnel({ workflowId, workflowTitle, draft, documentId, caseId, draftValidated, humanApproved }: DisputeMailFunnelProps) {
  const { accessToken, user } = useAuth();
  const [method, setMethod] = useState("certified");
  const [approved, setApproved] = useState(humanApproved);
  const [recipient, setRecipient] = useState({ name: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = Boolean(recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip);
  const selected = OPTIONS.find((item) => item.id === method) ?? OPTIONS[1];
  const canCheckout = Boolean(accessToken && user && draftValidated && approved && complete);

  const beginCheckout = async () => {
    if (!canCheckout || !accessToken) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          workflowId,
          workflowTitle,
          caseId: caseId ?? null,
          draftContent: draft,
          documentId,
          mailingMethod: method,
          recipient,
          matterReference: workflowId,
          matterType: "dispute-mail",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload?.error || `Unable to start secure checkout (${response.status}).`);
      window.location.assign(payload.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start checkout.");
      setBusy(false);
    }
  };

  return <div className="card mt-7 p-7"><div className="eyebrow">APPROVAL + MAILING</div><h2 className="mt-2 heading-lg">Review, approve, and mail</h2><p className="mt-2 text-body">The dispute engine must pass validation and you must explicitly approve the draft before payment can begin.</p>
    <div className="mt-5 rounded-xl border border-rule bg-card p-4"><label className="flex items-start gap-3 text-sm text-ink-soft"><input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} className="mt-1" disabled={!draftValidated} /><span><strong className="text-ink">I approve this response for mailing.</strong><br />I reviewed the facts, evidence, requested outcome, recipient, and generated draft.</span></label></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><input className="input-field sm:col-span-2" placeholder="Recipient name *" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} /><input className="input-field sm:col-span-2" placeholder="Address line 1 *" value={recipient.address1} onChange={(e) => setRecipient({ ...recipient, address1: e.target.value })} /><input className="input-field sm:col-span-2" placeholder="Address line 2" value={recipient.address2} onChange={(e) => setRecipient({ ...recipient, address2: e.target.value })} /><input className="input-field" placeholder="City *" value={recipient.city} onChange={(e) => setRecipient({ ...recipient, city: e.target.value })} /><input className="input-field" placeholder="State *" value={recipient.state} onChange={(e) => setRecipient({ ...recipient, state: e.target.value })} /><input className="input-field" placeholder="ZIP *" value={recipient.zip} onChange={(e) => setRecipient({ ...recipient, zip: e.target.value })} /></div>
    <div className="mt-5 space-y-3">{OPTIONS.map((option) => <button type="button" key={option.id} onClick={() => setMethod(option.id)} className={`mail-option flex w-full items-center justify-between ${method === option.id ? "selected" : ""}`}><span><span className="block font-semibold text-ink">{option.label}</span><span className="mt-1 block text-xs text-ink-soft">{option.detail}</span></span><span className="font-serif text-lg text-ink">{option.price}</span></button>)}</div>
    {error && <div className="mt-4 alert alert-danger">{error}</div>}
    <div className="mt-5 flex items-center justify-between"><span className="text-sm text-ink-soft">Total: <strong className="text-ink">{selected.price}</strong></span><button type="button" onClick={beginCheckout} disabled={!canCheckout || busy} className="btn-amber disabled:opacity-50">{busy ? "Opening checkout…" : "Pay and send"}</button></div>
    {!draftValidated && <p className="mt-3 text-xs" style={{ color: "var(--color-danger)" }}>Mailing is blocked until the draft passes validation.</p>}
  </div>;
}
