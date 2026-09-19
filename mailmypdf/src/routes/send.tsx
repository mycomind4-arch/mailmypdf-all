import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { createOrder, createCheckoutForOrder, previewPdfPricing } from "@/lib/orders.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { trackCheckoutStart } from "@/lib/analytics-events";
import { calculateTotalPrice, MAIL_CLASS_LABELS, type MailClass } from "@/lib/pricing";

export const Route = createFileRoute("/send")({
  head: () => ({
    meta: [
      { title: "Send a letter — MailMyPDF" },
      {
        name: "description",
        content: "Upload a PDF, enter the addresses, and pay to have your letter mailed.",
      },
    ],
  }),
  component: SendPage,
});

type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

const emptyAddress: Address = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
};

const STEPS = ["Upload", "Addresses", "Review", "Pay"] as const;

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function SendPage() {
  const createOrderFn = useServerFn(createOrder);
  const createCheckoutFn = useServerFn(createCheckoutForOrder);
  const previewFn = useServerFn(previewPdfPricing);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<{
    name: string;
    sizeBytes: number;
    pages: number;
    priceCents: number;
  } | null>(null);
  const rawFileRef = useRef<File | null>(null);
  const [email, setEmail] = useState("");
  const [sender, setSender] = useState<Address>(emptyAddress);
  const [recipient, setRecipient] = useState<Address>(emptyAddress);
  const [agreedReviewed, setAgreedReviewed] = useState(false);
  const [agreedContent, setAgreedContent] = useState(false);
  const agreed = agreedReviewed && agreedContent;
  const [color, setColor] = useState(false);
  const [mailClass, setMailClass] = useState<MailClass>("standard");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkout, setCheckout] = useState<{ orderId: string; token: string } | null>(null);

  const priceCents = file ? calculateTotalPrice({ pageCount: file.pages, color, mailClass }) : 0;

  const canGoTo = (i: number): boolean => {
    if (i === 0) return true;
    if (i === 1) return !!file;
    if (i === 2) return !!file && !!email && validAddress(sender) && validAddress(recipient);
    if (i === 3) return canGoTo(2) && agreed;
    return false;
  };

  const startCheckout = async () => {
    if (!file || !rawFileRef.current) {
      setError("Please re-upload your PDF.");
      setStep(0);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const dataBase64 = await fileToBase64(rawFileRef.current);
      const created = await createOrderFn({
        data: {
          email,
          sender: { ...sender, line2: sender.line2 || null },
          recipient: { ...recipient, line2: recipient.line2 || null },
          file: {
            name: file.name,
            sizeBytes: file.sizeBytes,
            dataBase64,
          },
          color,
          mailClass,
        },
      });
      setCheckout({ orderId: created.orderId, token: created.token });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!checkout) throw new Error("Order not ready.");
    const returnUrl = `${window.location.origin}/orders/${checkout.orderId}?token=${checkout.token}&paid=1`;
    const result = await createCheckoutFn({
      data: {
        orderId: checkout.orderId,
        token: checkout.token,
        environment: getStripeEnvironment(),
        returnUrl,
      },
    });
    if ("error" in result) throw new Error(result.error);
    void trackCheckoutStart(checkout.orderId, priceCents, { source: "upload" });
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
            <UploadStep
              file={file}
              onFile={(f, raw) => {
                setError(null);
                setFile(f);
                rawFileRef.current = raw;
              }}
              previewFn={previewFn}
              error={error}
              onError={setError}
              onNext={() => file && setStep(1)}
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
          {step === 2 && file && (
            <ReviewStep
              file={file}
              sender={sender}
              recipient={recipient}
              email={email}
              priceCents={priceCents}
              color={color}
              setColor={setColor}
              mailClass={mailClass}
              setMailClass={setMailClass}
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
          {step === 3 && file && checkout && (
            <PayStep
              priceCents={priceCents}
              fetchClientSecret={fetchClientSecret}
              onBack={() => {
                setCheckout(null);
                setStep(2);
              }}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function validAddress(a: Address): boolean {
  return !!a.name && !!a.line1 && !!a.city && !!a.state && /^\d{5}(-\d{4})?$/.test(a.postalCode);
}

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
                active
                  ? "border-cobalt bg-cobalt text-white"
                  : done
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-card text-muted-foreground"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
            <span className={`text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="flex-1 border-t border-dashed border-rule" />}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------- Step 1: Upload -------------------- */

function UploadStep({
  file,
  onFile,
  previewFn,
  error,
  onError,
  onNext,
}: {
  file: { name: string; sizeBytes: number; pages: number; priceCents: number } | null;
  onFile: (
    f: { name: string; sizeBytes: number; pages: number; priceCents: number } | null,
    raw: File | null,
  ) => void;
  previewFn: (args: {
    data: { sizeBytes: number; dataBase64: string };
  }) => Promise<{ pageCount: number; priceCents: number } | { error: string }>;
  error: string | null;
  onError: (msg: string | null) => void;
  onNext: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      onError("This file isn't a PDF. Please upload a .pdf file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      onError("File is over 10MB. Please upload a smaller PDF.");
      return;
    }
    setParsing(true);
    try {
      const dataBase64 = await fileToBase64(f);
      const result = await previewFn({ data: { sizeBytes: f.size, dataBase64 } });
      if ("error" in result) {
        onError(result.error);
        return;
      }
      onFile(
        { name: f.name, sizeBytes: f.size, pages: result.pageCount, priceCents: result.priceCents },
        f,
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not read this PDF.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <section>
      <h1 className="font-serif text-4xl">Upload your PDF</h1>
      <p className="mt-2 text-muted-foreground">
        PDF only, up to 10 pages and 10MB. Color and black-and-white options available at checkout.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          dragging ? "border-cobalt bg-cobalt/5" : "border-rule bg-card"
        }`}
      >
        <div className="postmark">Drop it here</div>
        <div className="mt-4 font-serif text-2xl">Drag a PDF, or click to browse</div>
        <div className="mt-1 text-sm text-muted-foreground">Maximum 10MB · Maximum 10 pages</div>
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {parsing && !file && (
        <div className="mt-4 rounded-md border border-rule bg-card px-4 py-3 text-sm text-muted-foreground">
          Reading your PDF…
        </div>
      )}

      {file && (
        <div className="envelope-card mt-6 flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <PdfIcon />
            <div>
              <div className="font-serif text-lg">{file.name}</div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {file.pages} page{file.pages === 1 ? "" : "s"} ·{" "}
                {(file.sizeBytes / 1024).toFixed(0)} KB · ${(file.priceCents / 100).toFixed(2)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onFile(null, null)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Remove
          </button>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!file}
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to addresses <Arrow />
        </button>
      </div>
    </section>
  );
}

/* -------------------- Step 2: Addresses -------------------- */

function AddressStep({
  email,
  setEmail,
  sender,
  setSender,
  recipient,
  setRecipient,
  onBack,
  onNext,
  error,
}: {
  email: string;
  setEmail: (v: string) => void;
  sender: Address;
  setSender: (a: Address) => void;
  recipient: Address;
  setRecipient: (a: Address) => void;
  onBack: () => void;
  onNext: () => void;
  error: string | null;
}) {
  return (
    <section>
      <h1 className="font-serif text-4xl">Where's it going?</h1>
      <p className="mt-2 text-muted-foreground">U.S. addresses only in this release.</p>

      <div className="mt-8 envelope-card p-6">
        <Field label="Your email" hint="We'll send your confirmation here.">
          {(id) => (
            <input
              id={id}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClasses}
            />
          )}
        </Field>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <AddressCard title="From" subtitle="Sender" value={sender} onChange={setSender} />
        <AddressCard title="To" subtitle="Recipient" value={recipient} onChange={setRecipient} />
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white hover:bg-cobalt/90"
        >
          Review your letter <Arrow />
        </button>
      </div>
    </section>
  );
}

function AddressCard({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: Address;
  onChange: (a: Address) => void;
}) {
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <div className="envelope-card p-6">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{title}</div>
        <div className="font-serif text-sm italic text-muted-foreground">{subtitle}</div>
      </div>
      <div className="mt-4 space-y-4">
        <Field label="Full name">
          {(id) => (
            <input id={id} value={value.name} onChange={set("name")} className={inputClasses} />
          )}
        </Field>
        <Field label="Address line 1">
          {(id) => (
            <input id={id} value={value.line1} onChange={set("line1")} className={inputClasses} />
          )}
        </Field>
        <Field label="Address line 2 (optional)">
          {(id) => (
            <input id={id} value={value.line2} onChange={set("line2")} className={inputClasses} />
          )}
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City">
            {(id) => (
              <input id={id} value={value.city} onChange={set("city")} className={inputClasses} />
            )}
          </Field>
          <Field label="State">
            {(id) => (
              <input
                id={id}
                value={value.state}
                onChange={set("state")}
                maxLength={2}
                placeholder="CA"
                className={`${inputClasses} uppercase`}
              />
            )}
          </Field>
          <Field label="ZIP">
            {(id) => (
              <input
                id={id}
                value={value.postalCode}
                onChange={set("postalCode")}
                placeholder="94105"
                className={inputClasses}
              />
            )}
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="block">
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      {children(id)}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const inputClasses =
  "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/10";

/* -------------------- Step 3: Review -------------------- */

function ReviewStep({
  file,
  sender,
  recipient,
  email,
  priceCents,
  color,
  setColor,
  mailClass,
  setMailClass,
  agreedReviewed,
  setAgreedReviewed,
  agreedContent,
  setAgreedContent,
  onBack,
  onNext,
  submitting,
  error,
}: {
  file: { name: string; sizeBytes: number; pages: number };
  sender: Address;
  recipient: Address;
  email: string;
  priceCents: number;
  color: boolean;
  setColor: (b: boolean) => void;
  mailClass: MailClass;
  setMailClass: (m: MailClass) => void;
  agreedReviewed: boolean;
  setAgreedReviewed: (b: boolean) => void;
  agreedContent: boolean;
  setAgreedContent: (b: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <section>
      <h1 className="font-serif text-4xl">Please review carefully</h1>
      <p className="mt-2 text-muted-foreground">
        We print and mail the document exactly as submitted. No edits after payment.
      </p>

      <div className="mt-8 envelope-card envelope-card-notch p-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Document
            </div>
            <div className="mt-2 flex items-center gap-3">
              <PdfIcon />
              <div>
                <div className="font-serif text-xl">{file.name}</div>
                <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {file.pages} pages · {color ? "color" : "b/w"}
                </div>
              </div>
            </div>
            <div className="mt-6 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Confirmation email
            </div>
            <div className="mt-1 font-mono text-sm">{email}</div>
          </div>
          <div className="rounded-md bg-paper-deep/60 p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              From
            </div>
            <AddressBlock a={sender} />
            <div className="my-4 border-t border-dashed border-rule" />
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">To</div>
            <AddressBlock a={recipient} />
          </div>
        </div>

        {/* Printing & delivery options */}
        <div className="mt-6 space-y-4 rounded-lg border border-rule bg-card p-6">
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={color}
                onChange={(e) => setColor(e.target.checked)}
                className="h-4 w-4 rounded border-rule accent-cobalt"
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
                    name="mailClassSend"
                    checked={mailClass === mc}
                    onChange={() => setMailClass(mc)}
                    className="h-4 w-4 accent-cobalt"
                  />
                  <span className="text-sm">{MAIL_CLASS_LABELS[mc]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-dashed border-rule pt-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Total</div>
            <div className="font-serif text-4xl">{formatUSD(priceCents)}</div>
          </div>
          <div className="postmark">Includes printing & postage</div>
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-input bg-card p-4 text-sm">
        <input
          type="checkbox"
          checked={agreedReviewed}
          onChange={(e) => setAgreedReviewed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-cobalt"
        />
        <span className="text-muted-foreground">
          I reviewed my document and both addresses. I understand MailMyPDF will print and mail this
          document exactly as submitted, with no edits or refunds after payment.
        </span>
      </label>

      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-input bg-card p-4 text-sm">
        <input
          type="checkbox"
          checked={agreedContent}
          onChange={(e) => setAgreedContent(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-cobalt"
        />
        <span className="text-muted-foreground">
          I agree not to use MailMyPDF to send unlawful, threatening, fraudulent, abusive, or spam
          content, and I'm authorized to send this document.
        </span>
      </label>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!(agreedReviewed && agreedContent) || submitting}
          className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            "Preparing checkout…"
          ) : (
            <>
              Continue to payment <Arrow />
            </>
          )}
        </button>
      </div>
    </section>
  );
}

function AddressBlock({ a }: { a: Address }) {
  return (
    <div className="mt-1 font-mono text-sm leading-relaxed text-foreground">
      <div className="font-serif text-lg not-italic">{a.name || "—"}</div>
      <div>{a.line1}</div>
      {a.line2 && <div>{a.line2}</div>}
      <div>
        {a.city}
        {a.city && ","} {a.state?.toUpperCase()} {a.postalCode}
      </div>
    </div>
  );
}

/* -------------------- Step 4: Pay -------------------- */

function PayStep({
  priceCents,
  fetchClientSecret,
  onBack,
}: {
  priceCents: number;
  fetchClientSecret: () => Promise<string>;
  onBack: () => void;
}) {
  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);
  return (
    <section>
      <div className="postmark mx-auto w-fit">Secure payment</div>
      <h1 className="mt-4 text-center font-serif text-4xl">Pay {formatUSD(priceCents)}</h1>
      <p className="mx-auto mt-2 max-w-md text-center text-muted-foreground">
        Card details are collected and processed by our payment provider — MailMyPDF never sees
        them.
      </p>

      <div className="envelope-card mx-auto mt-8 max-w-2xl overflow-hidden p-2">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to review
        </button>
      </div>
    </section>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

function PdfIcon() {
  return (
    <div className="flex h-12 w-10 items-center justify-center rounded-sm border border-rule bg-paper-deep font-mono text-[10px] tracking-widest text-cobalt">
      PDF
    </div>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8h10m0 0L9 4m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
