import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { createLetterOrder, createCheckoutForOrder, previewLetterPricing } from "@/lib/orders.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { MAIL_CLASS_LABELS, calculateTotalPrice, type MailClass } from "@/lib/pricing";
import { letterTemplates } from "@/lib/templates";
import { trackTemplateSelected, trackLetterCreated, trackCheckoutStart } from "@/lib/analytics-events";

export const Route = createFileRoute("/write")({
  validateSearch: (search: Record<string, unknown>) => ({
    template: typeof search.template === "string" ? search.template : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Write a letter online — MailMyPDF" },
      { name: "description", content: "Type your letter online. We print and mail it for you — no printer needed." },
    ],
  }),
  component: WritePage,
});

type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

const emptyAddress: Address = { name: "", line1: "", line2: "", city: "", state: "", postalCode: "" };
const STEPS = ["Write", "Addresses", "Review", "Pay"] as const;

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function validAddress(a: Address): boolean {
  return !!a.name && !!a.line1 && !!a.city && !!a.state && /^\d{5}(-\d{4})?$/.test(a.postalCode);
}

function WritePage() {
  const createLetterOrderFn = useServerFn(createLetterOrder);
  const createCheckoutFn = useServerFn(createCheckoutForOrder);
  const previewFn = useServerFn(previewLetterPricing);
  const { template: templateSearch } = Route.useSearch();

  const [step, setStep] = useState(0);
  const [letterText, setLetterText] = useState(() => {
    if (templateSearch) {
      void trackTemplateSelected(templateSearch, "unknown");
      const tmpl = letterTemplates.find((t) => t.id === templateSearch);
      return tmpl?.bodyText ?? "";
    }
    return "";
  });
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [pageCount, setPageCount] = useState(1);
  const [color, setColor] = useState(false);
  const [mailClass, setMailClass] = useState<MailClass>("standard");
  const [email, setEmail] = useState("");
  const [sender, setSender] = useState<Address>(emptyAddress);
  const [recipient, setRecipient] = useState<Address>(emptyAddress);
  const [agreedReviewed, setAgreedReviewed] = useState(false);
  const [agreedContent, setAgreedContent] = useState(false);
  const agreed = agreedReviewed && agreedContent;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkout, setCheckout] = useState<{ orderId: string; token: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAI, setShowAI] = useState(false);

  const priceCents = calculateTotalPrice({ pageCount, color, mailClass });

  const canGoTo = (i: number): boolean => {
    if (i === 0) return true;
    if (i === 1) return letterText.trim().length > 0;
    if (i === 2) return letterText.trim().length > 0 && !!email && validAddress(sender) && validAddress(recipient);
    if (i === 3) return canGoTo(2) && agreed;
    return false;
  };

  const estimatePricing = async () => {
    if (!letterText.trim()) return;
    try {
      const result = await previewFn({ data: { letterText } });
      if (!("error" in result)) {
        setPageCount(result.pageCount);
      }
    } catch { /* ignore — will re-estimate on submit */ }
  };

  const runAI = async (action: "generate" | "improve" | "formal" | "friendly" | "firm" | "shorten" | "expand", prompt?: string) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, prompt, currentText: letterText }),
      });
      const result = await res.json();
      if (result.error) {
        setAiError(result.error);
      } else {
        setLetterText(result.text);
        if (templateId) setTemplateId(undefined);
        // Re-estimate pricing (non-critical — don't let preview errors block the AI result)
        try {
          const preview = await previewFn({ data: { letterText: result.text } });
          if (!("error" in preview)) setPageCount(preview.pageCount);
        } catch { /* pricing preview is best-effort */ }
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI assistance failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const startCheckout = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createLetterOrderFn({
        data: {
          email,
          sender: { ...sender, line2: sender.line2 || null },
          recipient: { ...recipient, line2: recipient.line2 || null },
          letterText,
          templateId,
          color,
          mailClass,
        },
      });
      setCheckout({ orderId: created.orderId, token: created.token });
      void trackLetterCreated("write", { template_id: templateId });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!checkout) throw new Error("Order not ready.");
    const result = await createCheckoutFn({
      data: { orderId: checkout.orderId, token: checkout.token },
    });
    if ("error" in result) throw new Error(result.error);
    void trackCheckoutStart(checkout.orderId, priceCents, { source: "write" });
    if (!result.clientSecret) throw new Error("Checkout session did not return a client secret.");
    return result.clientSecret;
  }, [checkout, createCheckoutFn]);

  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Stepper current={step} onStep={(i) => canGoTo(i) && setStep(i)} />

        <div className="mt-10">
          {step === 0 && (
            <WriteStep
              letterText={letterText}
              setLetterText={setLetterText}
              templateId={templateId}
              setTemplateId={setTemplateId}
              pageCount={pageCount}
              color={color}
              setColor={setColor}
              mailClass={mailClass}
              setMailClass={setMailClass}
              priceCents={priceCents}
              onEstimate={estimatePricing}
              onNext={() => setStep(1)}
              aiLoading={aiLoading}
              aiError={aiError}
              aiPrompt={aiPrompt}
              setAiPrompt={setAiPrompt}
              showAI={showAI}
              setShowAI={setShowAI}
              onAIAction={runAI}
            />
          )}
          {step === 1 && (
            <AddressStep
              email={email}
              setEmail={setEmail}
              sender={sender}
              setSender={setSender}
              recipient={recipient}
              setRecipient={setRecipient}
              onBack={() => setStep(0)}
              onNext={() => {
                if (!email || !validAddress(sender) || !validAddress(recipient)) {
                  setError("Please complete all required fields.");
                  return;
                }
                setError(null);
                setStep(2);
              }}
              error={error}
            />
          )}
          {step === 2 && (
            <ReviewStep
              letterText={letterText}
              sender={sender}
              recipient={recipient}
              email={email}
              pageCount={pageCount}
              color={color}
              mailClass={mailClass}
              priceCents={priceCents}
              agreedReviewed={agreedReviewed}
              setAgreedReviewed={setAgreedReviewed}
              agreedContent={agreedContent}
              setAgreedContent={setAgreedContent}
              onBack={() => setStep(1)}
              onNext={startCheckout}
              submitting={submitting}
              error={error}
            />
          )}
          {step === 3 && checkout && (
            <PayStep
              priceCents={priceCents}
              fetchClientSecret={fetchClientSecret}
              onBack={() => { setCheckout(null); setStep(2); }}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/* -------------------- Stepper -------------------- */

function Stepper({ current, onStep }: { current: number; onStep: (i: number) => void }) {
  return (
    <ol className="flex items-center justify-between gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => onStep(i)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-colors ${
                active ? "border-stamp bg-stamp text-accent-foreground"
                  : done ? "border-ink bg-ink text-primary-foreground"
                    : "border-rule bg-card text-muted-foreground"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
            <span className={`text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="flex-1 border-t border-dashed border-rule" />}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------- Step 1: Write -------------------- */

type AIAction = "generate" | "improve" | "formal" | "friendly" | "firm" | "shorten" | "expand";

function WriteStep(props: {
  letterText: string;
  setLetterText: (s: string) => void;
  templateId?: string;
  setTemplateId: (id: string | undefined) => void;
  pageCount: number;
  color: boolean;
  setColor: (b: boolean) => void;
  mailClass: MailClass;
  setMailClass: (m: MailClass) => void;
  priceCents: number;
  onEstimate: () => void;
  onNext: () => void;
  aiLoading: boolean;
  aiError: string | null;
  aiPrompt: string;
  setAiPrompt: (s: string) => void;
  showAI: boolean;
  setShowAI: (b: boolean) => void;
  onAIAction: (action: AIAction, prompt?: string) => void;
}) {
  return (
    <section>
      <h1 className="font-serif text-4xl">Write your letter</h1>
      <div className="flex items-center justify-between">
        <p className="mt-2 text-muted-foreground">
          Type your letter below. We'll print it on professional paper and mail it for you.
          Need inspiration? <a href="/templates" className="text-cobalt underline">Browse templates</a>.
        </p>
        <button
          type="button"
          onClick={() => props.setShowAI(!props.showAI)}
          className={`ml-4 shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            props.showAI
              ? "bg-stamp text-accent-foreground"
              : "border border-stamp text-cobalt hover:bg-cobalt/8"
          }`}
        >
          ✦ AI Assist
        </button>
      </div>

      {props.showAI && (
        <div className="mt-6 rounded-lg border border-cobalt/25 bg-stamp/5 p-5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-cobalt">✦ AI Letter Assistant</h3>
            {props.aiLoading && <span className="text-xs text-muted-foreground animate-pulse">Writing...</span>}
          </div>
          
          {props.aiError && (
            <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{props.aiError}</p>
          )}

          {/* Generate from prompt */}
          <div className="mt-3">
            <label className="text-xs font-medium text-muted-foreground">Describe your letter and let AI write it:</label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={props.aiPrompt}
                onChange={(e) => props.setAiPrompt(e.target.value)}
                placeholder="e.g., A demand letter for unpaid rent of $2,400"
                className="flex-1 rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && props.aiPrompt.trim() && !props.aiLoading) {
                    props.onAIAction("generate", props.aiPrompt);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => props.onAIAction("generate", props.aiPrompt)}
                disabled={!props.aiPrompt.trim() || props.aiLoading}
                className="shrink-0 rounded-full bg-stamp px-5 py-2 text-xs font-medium text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-3">
            <label className="text-xs font-medium text-muted-foreground">Or improve your existing letter:</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {([
                ["improve", "✎ Improve"],
                ["formal", "🎩 More formal"],
                ["friendly", "😊 More friendly"],
                ["firm", "💪 More firm"],
                ["shorten", "✂️ Shorten"],
                ["expand", "📝 Expand"],
              ] as [AIAction, string][]).map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => props.onAIAction(action)}
                  disabled={!props.letterText.trim() || props.aiLoading}
                  className="rounded-full border border-rule bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-stamp disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <textarea
        value={props.letterText}
        onChange={(e) => {
          props.setLetterText(e.target.value);
          if (props.templateId) props.setTemplateId(undefined);
        }}
        onBlur={props.onEstimate}
        placeholder="Dear [Recipient],&#10;&#10;Start writing your letter here... or use ✦ AI Assist above to generate a draft&#10;&#10;Sincerely,&#10;[Your name]"
        className="mt-8 h-[480px] w-full resize-none rounded-lg border border-rule bg-card p-6 font-serif text-base leading-relaxed shadow-sm focus:border-stamp focus:outline-none focus:ring-2 focus:ring-stamp/20"
      />

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {props.letterText.trim() ? `~${props.pageCount} page${props.pageCount === 1 ? "" : "s"}` : "Start typing to estimate pages"}
        </span>
        <span className="font-medium">{formatUSD(props.priceCents)}</span>
      </div>

      {/* Options */}
      <div className="mt-6 space-y-4 rounded-lg border border-rule bg-card p-6">
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={props.color}
              onChange={(e) => props.setColor(e.target.checked)}
              className="h-4 w-4 rounded border-rule accent-stamp"
            />
            <span className="text-sm font-medium">Color printing</span>
            <span className="text-xs text-muted-foreground">+$0.15 per page</span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Delivery speed</label>
          <div className="space-y-2">
            {(["standard", "certified", "registered"] as MailClass[]).map((mc) => (
              <label key={mc} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="mailClass"
                  checked={props.mailClass === mc}
                  onChange={() => props.setMailClass(mc)}
                  className="h-4 w-4 accent-stamp"
                />
                <span className="text-sm">{MAIL_CLASS_LABELS[mc]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={props.onNext}
        disabled={!props.letterText.trim()}
        className="mt-8 w-full rounded-full bg-primary py-3 text-center text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
      >
        Continue to addresses →
      </button>
    </section>
  );
}

/* -------------------- Step 2: Addresses -------------------- */

function AddressStep(props: {
  email: string; setEmail: (s: string) => void;
  sender: Address; setSender: (a: Address) => void;
  recipient: Address; setRecipient: (a: Address) => void;
  onBack: () => void; onNext: () => void; error: string | null;
}) {
  return (
    <section>
      <h1 className="font-serif text-4xl">Addresses</h1>
      <p className="mt-2 text-muted-foreground">Where is this letter going, and who is it from?</p>

      {props.error && <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{props.error}</p>}

      <div className="mt-8">
        <label className="block text-sm font-medium">Your email <span className="text-destructive">*</span></label>
        <input
          type="email" value={props.email} onChange={(e) => props.setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-lg border border-rule bg-card px-4 py-2.5 text-sm focus:border-stamp focus:outline-none"
        />
        <p className="mt-1 text-xs text-muted-foreground">We send your order confirmation and tracking link here.</p>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <AddressForm title="From (sender)" address={props.sender} setAddress={props.setSender} />
        <AddressForm title="To (recipient)" address={props.recipient} setAddress={props.setRecipient} />
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={props.onBack} className="rounded-full border border-rule px-6 py-2.5 text-sm font-medium transition-colors hover:border-ink">← Back</button>
        <button onClick={props.onNext} className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5">Review your letter →</button>
      </div>
    </section>
  );
}

function AddressForm({ title, address, setAddress }: { title: string; address: Address; setAddress: (a: Address) => void }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="mt-3 space-y-3">
        <input value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} placeholder="Full name" className="w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
        <input value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="Street address" className="w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
        <input value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Apt / Suite (optional)" className="w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
        <div className="flex gap-2">
          <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" className="flex-1 rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
          <input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="ST" maxLength={2} className="w-16 rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
        </div>
        <input value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} placeholder="ZIP code" className="w-full rounded-lg border border-rule bg-card px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
      </div>
    </div>
  );
}

/* -------------------- Step 3: Review -------------------- */

function ReviewStep(props: {
  letterText: string; sender: Address; recipient: Address; email: string;
  pageCount: number; color: boolean; mailClass: MailClass; priceCents: number;
  agreedReviewed: boolean; setAgreedReviewed: (b: boolean) => void;
  agreedContent: boolean; setAgreedContent: (b: boolean) => void;
  onBack: () => void; onNext: () => void; submitting: boolean; error: string | null;
}) {
  return (
    <section>
      <h1 className="font-serif text-4xl">Review & pay</h1>

      <div className="mt-8 space-y-6">
        <div className="rounded-lg border border-rule bg-card p-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Letter preview</h3>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap font-serif text-sm leading-relaxed text-foreground">{props.letterText}</pre>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-rule bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">From</h3>
            <p className="mt-2 text-sm">{props.sender.name}<br />{props.sender.line1}<br />{props.sender.line2 ? <>{props.sender.line2}<br /></> : null}{props.sender.city}, {props.sender.state} {props.sender.postalCode}</p>
          </div>
          <div className="rounded-lg border border-rule bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">To</h3>
            <p className="mt-2 text-sm">{props.recipient.name}<br />{props.recipient.line1}<br />{props.recipient.line2 ? <>{props.recipient.line2}<br /></> : null}{props.recipient.city}, {props.recipient.state} {props.recipient.postalCode}</p>
          </div>
        </div>

        <div className="rounded-lg border border-rule bg-card p-6">
          <div className="flex justify-between text-sm"><span>Pages</span><span>{props.pageCount}</span></div>
          <div className="mt-1 flex justify-between text-sm"><span>Color</span><span>{props.color ? "Yes" : "No (B&W)"}</span></div>
          <div className="mt-1 flex justify-between text-sm"><span>Delivery</span><span>{MAIL_CLASS_LABELS[props.mailClass]}</span></div>
          <div className="mt-3 border-t border-rule pt-3 flex justify-between text-base font-medium"><span>Total</span><span>{formatUSD(props.priceCents)}</span></div>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={props.agreedReviewed} onChange={(e) => props.setAgreedReviewed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-rule accent-stamp" />
            <span className="text-sm text-muted-foreground">I've reviewed the letter content and addresses — everything is correct.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={props.agreedContent} onChange={(e) => props.setAgreedContent(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-rule accent-stamp" />
            <span className="text-sm text-muted-foreground">I understand MailMyPDF prints and mails exactly what I wrote. I'm responsible for the content.</span>
          </label>
        </div>

        {props.error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{props.error}</p>}
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={props.onBack} disabled={props.submitting} className="rounded-full border border-rule px-6 py-2.5 text-sm font-medium transition-colors hover:border-ink">← Back</button>
        <button onClick={props.onNext} disabled={!(props.agreedReviewed && props.agreedContent) || props.submitting} className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0">
          {props.submitting ? "Preparing checkout..." : `Pay ${formatUSD(props.priceCents)} →`}
        </button>
      </div>
    </section>
  );
}

/* -------------------- Step 4: Pay -------------------- */

function PayStep({ priceCents, fetchClientSecret, onBack }: { priceCents: number; fetchClientSecret: () => Promise<string>; onBack: () => void }) {
  const stripePromise = getStripe();
  const options = { fetchClientSecret };

  return (
    <section>
      <h1 className="font-serif text-4xl">Payment</h1>
      <p className="mt-2 text-muted-foreground">Secure checkout via Stripe — {formatUSD(priceCents)}</p>

      <div className="mt-8">
        <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>

      <button onClick={onBack} className="mt-6 rounded-full border border-rule px-6 py-2.5 text-sm font-medium transition-colors hover:border-ink">← Back</button>
    </section>
  );
}

