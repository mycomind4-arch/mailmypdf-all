import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { createLetterOrder, createCheckoutForOrder, previewLetterPricing } from "@/lib/orders.functions";
import { getStripe } from "@/lib/stripe";
import { calculateTotalPrice, MAIL_CLASS_LABELS, mailClassSurchargeLabel, type MailClass } from "@/lib/pricing";

export const Route = createFileRoute("/future-self")({
  head: () => ({
    meta: [
      { title: "Write a letter to your future self — MailMyPDF" },
      { name: "description", content: "Write a letter today and have it delivered to yourself up to 5 years from now. Color printing and certified mail available." },
    ],
  }),
  component: FutureSelfPage,
});

type Address = { name: string; line1: string; line2: string; city: string; state: string; postalCode: string };
const emptyAddress: Address = { name: "", line1: "", line2: "", city: "", state: "", postalCode: "" };

function formatUSD(cents: number): string { return `$${(cents / 100).toFixed(2)}`; }
function validAddress(a: Address): boolean { return !!a.name && !!a.line1 && !!a.city && !!a.state && /^\d{5}(-\d{4})?$/.test(a.postalCode); }

const MAIL_CLASSES: MailClass[] = ["standard", "certified", "registered"];
const MAIL_CLASS_PRICES: Record<MailClass, string> = {
  standard: mailClassSurchargeLabel("standard"),
  certified: mailClassSurchargeLabel("certified"),
  registered: mailClassSurchargeLabel("registered"),
};

function FutureSelfPage() {
  const createLetterOrderFn = useServerFn(createLetterOrder);
  const createCheckoutFn = useServerFn(createCheckoutForOrder);
  const previewFn = useServerFn(previewLetterPricing);

  const [step, setStep] = useState(0);
  const [letterText, setLetterText] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [email, setEmail] = useState("");
  const [sender, setSender] = useState<Address>(emptyAddress);
  const [recipient, setRecipient] = useState<Address>(emptyAddress);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkout, setCheckout] = useState<{ orderId: string; token: string } | null>(null);

  // Pricing state — server-validated
  const [pageCount, setPageCount] = useState(1);
  const [color, setColor] = useState(false);
  const [mailClass, setMailClass] = useState<MailClass>("standard");
  const [priceCents, setPriceCents] = useState(499);

  // Server-side page estimation (matches what the server will actually charge)
  const estimatePricing = async () => {
    if (!letterText.trim()) {
      setPageCount(1);
      setPriceCents(calculateTotalPrice({ pageCount: 1, color, mailClass }));
      return;
    }
    try {
      const result = await previewFn({ data: { letterText, color, mailClass } });
      if ("error" in result) return;
      setPageCount(result.pageCount);
      setPriceCents(result.priceCents);
    } catch { /* keep last good estimate */ }
  };

  // Recalculate when color/mailClass changes (no server call needed — just recompute)
  const recomputePrice = (newColor: boolean, newMailClass: MailClass) => {
    setPriceCents(calculateTotalPrice({ pageCount, color: newColor, mailClass: newMailClass }));
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 5);
  const maxDateStr = maxDate.toISOString().slice(0, 10);
  const minDate = new Date();
  minDate.setMonth(minDate.getMonth() + 1);
  const minDateStr = minDate.toISOString().slice(0, 10);

  const startCheckout = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const scheduledIso = new Date(deliveryDate).toISOString();
      const created = await createLetterOrderFn({
        data: {
          email,
          sender: { ...sender, line2: sender.line2 || null },
          recipient: { ...recipient, line2: recipient.line2 || null },
          letterText,
          color,
          mailClass,
          scheduledDeliveryDate: scheduledIso,
        },
      });
      setCheckout({ orderId: created.orderId, token: created.token });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!checkout) throw new Error("Order not ready.");
    const result = await createCheckoutFn({ data: { orderId: checkout.orderId, token: checkout.token } });
    if ("error" in result) throw new Error(result.error);
    return result.clientSecret ?? "";
  }, [checkout, createCheckoutFn]);

  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        {step === 0 && (
          <section>
            <div className="postmark w-fit">Future Self</div>
            <h1 className="mt-4 font-serif text-4xl">Letter to your future self</h1>
            <p className="mt-2 text-muted-foreground">
              Write a letter today. We'll print and mail it to you on the date you choose — up to 5 years from now.
            </p>

            <div className="mt-8">
              <label className="block text-sm font-medium mb-2">When should it arrive?</label>
              <input
                type="date"
                min={minDateStr}
                max={maxDateStr}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-rule bg-card px-4 py-2.5 text-sm focus:border-stamp focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">Choose any date up to 5 years in the future.</p>
            </div>

            <div className="mt-8">
              <label className="block text-sm font-medium mb-2">Your letter</label>
              <textarea
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
                onBlur={estimatePricing}
                placeholder="Dear future me,&#10;&#10;Right now I'm...&#10;&#10;I hope by the time you read this...&#10;&#10;Love,&#10;[Your name]"
                className="h-[400px] w-full resize-none rounded-lg border border-rule bg-card p-6 font-serif text-base leading-relaxed shadow-sm focus:border-stamp focus:outline-none focus:ring-2 focus:ring-stamp/20"
              />
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {letterText.trim() ? `~${pageCount} page${pageCount === 1 ? "" : "s"}` : "Start typing to estimate pages"}
                </span>
                <span className="font-medium">{formatUSD(priceCents)}</span>
              </div>
            </div>

            {/* Color + delivery options */}
            <div className="mt-6 rounded-lg border border-rule bg-card p-5 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={color}
                  onChange={(e) => {
                    setColor(e.target.checked);
                    recomputePrice(e.target.checked, mailClass);
                  }}
                  className="h-4 w-4 accent-stamp"
                />
                <span className="text-sm font-medium">Color printing</span>
                <span className="text-xs text-muted-foreground">+$0.15 per page</span>
              </label>

              <div>
                <div className="text-sm font-medium mb-2">Delivery speed</div>
                <div className="space-y-2">
                  {MAIL_CLASSES.map((mc) => (
                    <label key={mc} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="mailClass"
                        checked={mailClass === mc}
                        onChange={() => {
                          setMailClass(mc);
                          recomputePrice(color, mc);
                        }}
                        className="h-4 w-4 accent-stamp"
                      />
                      <span className="text-sm">{MAIL_CLASS_LABELS[mc]}</span>
                      {MAIL_CLASS_PRICES[mc] && (
                        <span className="text-xs text-muted-foreground">{MAIL_CLASS_PRICES[mc]}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setSender(recipient); setStep(1); }}
              disabled={!letterText.trim() || !deliveryDate}
              className="mt-6 w-full rounded-full bg-primary py-3 text-center text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            >
              Continue to addresses →
            </button>
          </section>
        )}

        {step === 1 && (
          <section>
            <h1 className="font-serif text-4xl">Your address</h1>
            <p className="mt-2 text-muted-foreground">Where should we send your letter when the time comes?</p>

            {error && <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

            <div className="mt-8">
              <label className="block text-sm font-medium">Your email <span className="text-destructive">*</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 w-full rounded-lg border border-rule bg-card px-4 py-2.5 text-sm focus:border-stamp focus:outline-none" />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Delivery address</h3>
              <p className="mt-1 text-xs text-muted-foreground">This is where your letter will be mailed on {deliveryDate}.</p>
              <div className="mt-3 space-y-3">
                <input value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} placeholder="Full name" className="w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
                <input value={recipient.line1} onChange={(e) => setRecipient({ ...recipient, line1: e.target.value })} placeholder="Street address" className="w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
                <input value={recipient.line2} onChange={(e) => setRecipient({ ...recipient, line2: e.target.value })} placeholder="Apt / Suite (optional)" className="w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
                <div className="flex gap-2">
                  <input value={recipient.city} onChange={(e) => setRecipient({ ...recipient, city: e.target.value })} placeholder="City" className="flex-1 rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
                  <input value={recipient.state} onChange={(e) => setRecipient({ ...recipient, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="ST" maxLength={2} className="w-16 rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
                </div>
                <input value={recipient.postalCode} onChange={(e) => setRecipient({ ...recipient, postalCode: e.target.value })} placeholder="ZIP code" className="w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
              </div>
            </div>

            {/* Return address = same address (it's to yourself) */}
            <div className="mt-6 flex items-center gap-2">
              <input type="checkbox" id="sameAddr" checked onChange={() => setSender(recipient)} className="h-4 w-4 accent-stamp" />
              <label htmlFor="sameAddr" className="text-sm text-muted-foreground">Return address is the same (it's a letter to yourself)</label>
            </div>

            {/* Price summary */}
            <div className="mt-8 rounded-lg border border-rule bg-card p-6">
              <div className="flex justify-between text-sm"><span>Delivery date</span><span>{deliveryDate}</span></div>
              <div className="mt-1 flex justify-between text-sm"><span>Pages</span><span>{pageCount}</span></div>
              <div className="mt-1 flex justify-between text-sm"><span>Color</span><span>{color ? "Yes" : "No (B&W)"}</span></div>
              <div className="mt-1 flex justify-between text-sm"><span>Delivery</span><span>{MAIL_CLASS_LABELS[mailClass]}</span></div>
              <div className="mt-3 border-t border-rule pt-3 flex justify-between text-base font-medium"><span>Total</span><span>{formatUSD(priceCents)}</span></div>
            </div>

            <label className="mt-6 flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-stamp" />
              <span className="text-sm text-muted-foreground">I understand my letter will be stored securely and mailed on the date I chose. I've reviewed the content.</span>
            </label>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(0)} className="rounded-full border border-rule px-6 py-2.5 text-sm font-medium transition-colors hover:border-ink">← Back</button>
              <button onClick={startCheckout} disabled={!agreed || !email || !validAddress(recipient) || submitting} className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0">
                {submitting ? "Preparing..." : `Pay ${formatUSD(priceCents)} →`}
              </button>
            </div>
          </section>
        )}

        {step === 2 && checkout && (
          <section>
            <h1 className="font-serif text-4xl">Payment</h1>
            <p className="mt-2 text-muted-foreground">Secure checkout via Stripe — {formatUSD(priceCents)}</p>
            <div className="mt-8">
              <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
            <button onClick={() => setStep(1)} className="mt-6 rounded-full border border-rule px-6 py-2.5 text-sm font-medium transition-colors hover:border-ink">← Back</button>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
