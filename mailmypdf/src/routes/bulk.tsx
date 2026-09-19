import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getStripe } from "@/lib/stripe";
import { calculateTotalPrice, MAIL_CLASS_LABELS, type MailClass } from "@/lib/pricing";
import { previewBulkOrder, createBulkOrder, createBulkCheckout } from "@/lib/bulk-orders.functions";

export const Route = createFileRoute("/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk Mail — MailMyPDF" },
      { name: "description", content: "Upload one PDF and a CSV of recipients. We'll print and mail each letter individually. One checkout, one price." },
    ],
  }),
  component: BulkPage,
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

const STEPS = ["Upload PDF", "Recipients", "Sender & Options", "Review & Pay"] as const;

function formatUSD(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function BulkPage() {
  const previewBulkFn = useServerFn(previewBulkOrder);
  const createBulkFn = useServerFn(createBulkOrder);
  const createBulkCheckoutFn = useServerFn(createBulkCheckout);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<{ name: string; sizeBytes: number; pages: number } | null>(null);
  const rawFileRef = useRef<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvName, setCsvName] = useState("");
  const [email, setEmail] = useState("");
  const [sender, setSender] = useState<Address>(emptyAddress);
  const [color, setColor] = useState(false);
  const [mailClass, setMailClass] = useState<MailClass>("standard");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<{
    rows: any[];
    totalCents: number;
    recipientCount: number;
  } | null>(null);
  const [checkout, setCheckout] = useState<{ clientSecret: string } | null>(null);

  const perLetterPrice = file ? calculateTotalPrice({ pageCount: file.pages, color, mailClass }) : 0;

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError("PDF must be under 10MB.");
      return;
    }
    rawFileRef.current = f;
    // Estimate page count (rough — real validation happens server-side)
    const pages = await estimatePages(f);
    setFile({ name: f.name, sizeBytes: f.size, pages });
    setError(null);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setCsvText(text);
    setCsvName(f.name);
    setError(null);
  };

  const loadSampleCsv = () => {
    const sample = `name,line1,line2,city,state,postalCode
John Smith,123 Main St,,Springfield,IL,62701
Jane Doe,456 Oak Ave,Apt 2,Boston,MA,02101
ACME Corp,789 Business Blvd,Suite 100,Austin,TX,78701`;
    setCsvText(sample);
    setCsvName("sample.csv");
  };

  const runPreview = async () => {
    if (!file || !csvText) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await previewBulkFn({
        data: { csvText, pageCount: file.pages, color, mailClass },
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setPreview(result);
        setStep(2);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const startBulkCheckout = async () => {
    if (!file || !rawFileRef.current || !csvText) {
      setError("Missing PDF or recipient list.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const dataBase64 = await fileToBase64(rawFileRef.current);
      const created = await createBulkFn({
        data: {
          email,
          sender: { ...sender, line2: sender.line2 || null },
          file: { name: file.name, sizeBytes: file.sizeBytes, dataBase64 },
          csvText,
          color,
          mailClass,
        },
      });
      if ("error" in created) {
        setError(created.error);
        setSubmitting(false);
        return;
      }
      const checkoutResult = await createBulkCheckoutFn({
        data: {
          bulkOrderId: created.bulkOrderId,
          orderIds: created.orderIds,
          token: created.token,
          totalCents: created.totalCents,
          email,
          fileName: file.name,
        },
      });
      if ("error" in checkoutResult) {
        setError(checkoutResult.error);
        setSubmitting(false);
      } else {
        setCheckout({ clientSecret: checkoutResult.clientSecret });
        setStep(3);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!checkout?.clientSecret) throw new Error("No checkout session");
    return checkout.clientSecret;
  }, [checkout]);

  const canGoTo = (i: number): boolean => {
    if (i === 0) return true;
    if (i === 1) return !!file && !!csvText;
    if (i === 2) return !!file && !!csvText && !!email && validAddress(sender);
    if (i === 3) return canGoTo(2) && !!preview;
    return false;
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-serif text-4xl font-bold">Bulk Mail</h1>
        <p className="mt-2 text-muted-foreground">
          Upload one PDF and a CSV of recipients. We'll print and mail each letter individually — one checkout, one price.
        </p>

        {/* Step indicator */}
        <div className="mt-8 flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm ${i <= step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px w-4 bg-border" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Step 0: Upload PDF */}
        {step === 0 && (
          <div className="mt-8 space-y-4">
            <div className="envelope-card p-6">
              <h2 className="font-serif text-xl font-bold">Upload your PDF</h2>
              <p className="mt-1 text-sm text-muted-foreground">One PDF will be mailed to every recipient. Max 10MB.</p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="mt-4 w-full rounded-md border border-input bg-transparent p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              />
              {file && (
                <div className="mt-3 text-sm">
                  <span className="font-medium">{file.name}</span> · {file.pages} page{file.pages === 1 ? "" : "s"} · {(file.sizeBytes / 1024).toFixed(0)} KB
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => file && setStep(1)}
                disabled={!file}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cobalt/90 disabled:opacity-50"
              >
                Next: Recipients →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Recipients CSV */}
        {step === 1 && (
          <div className="mt-8 space-y-4">
            <div className="envelope-card p-6">
              <h2 className="font-serif text-xl font-bold">Recipient list (CSV)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a CSV with columns: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">name, line1, line2, city, state, postalCode</code>
                (line2 is optional). Max 200 recipients.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="mt-4 w-full rounded-md border border-input bg-transparent p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              />
              {csvName && (
                <div className="mt-3 text-sm">
                  <span className="font-medium">{csvName}</span>
                </div>
              )}
              <div className="mt-3">
                <button onClick={loadSampleCsv} className="text-xs text-primary underline">
                  Load sample CSV
                </button>
              </div>
              {csvText && (
                <div className="mt-4 max-h-48 overflow-auto rounded-md border border-border bg-muted/30 p-3">
                  <pre className="text-xs">{csvText.slice(0, 2000)}{csvText.length > 2000 ? "\n..." : ""}</pre>
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent">
                ← Back
              </button>
              <button
                onClick={runPreview}
                disabled={!csvText || submitting}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cobalt/90 disabled:opacity-50"
              >
                {submitting ? "Validating..." : "Preview recipients →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Sender & Options */}
        {step === 2 && (
          <div className="mt-8 space-y-4">
            {preview && (
              <div className="envelope-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Recipient preview ({preview.recipientCount})</h3>
                  <span className="text-sm font-medium text-cobalt">{formatUSD(preview.totalCents)} total</span>
                </div>
                <div className="mt-3 max-h-40 overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-1">#</th>
                        <th className="pb-1">Name</th>
                        <th className="pb-1">Address</th>
                        <th className="pb-1 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 50).map((r: any) => (
                        <tr key={r.index} className="border-b border-border/50">
                          <td className="py-1 text-muted-foreground">{r.index + 1}</td>
                          <td className="py-1">{r.recipient.name}</td>
                          <td className="py-1 text-muted-foreground">{r.recipient.line1}, {r.recipient.city}, {r.recipient.state} {r.recipient.postalCode}</td>
                          <td className="py-1 text-right">{formatUSD(r.priceCents)}</td>
                        </tr>
                      ))}
                      {preview.rows.length > 50 && (
                        <tr><td colSpan={4} className="py-2 text-center text-muted-foreground">+ {preview.rows.length - 50} more...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="envelope-card p-6 space-y-4">
              <h2 className="font-serif text-xl font-bold">Sender & options</h2>

              <div>
                <label className="text-sm font-medium">Your email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Sender name</label>
                  <input value={sender.name} onChange={(e) => setSender({ ...sender, name: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Sender address</label>
                  <input value={sender.line1} onChange={(e) => setSender({ ...sender, line1: e.target.value })} placeholder="Street address" className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">Apt / Suite</label>
                  <input value={sender.line2} onChange={(e) => setSender({ ...sender, line2: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <input value={sender.city} onChange={(e) => setSender({ ...sender, city: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">State</label>
                  <input value={sender.state} onChange={(e) => setSender({ ...sender, state: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium">ZIP</label>
                  <input value={sender.postalCode} onChange={(e) => setSender({ ...sender, postalCode: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Mail class</label>
                  <select value={mailClass} onChange={(e) => setMailClass(e.target.value as MailClass)} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                    <option value="standard">Standard (3-7 days)</option>
                    <option value="certified">Certified (+$9.95 each)</option>
                    <option value="registered">Registered (+$27.50 each)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Color printing</label>
                  <select value={color ? "yes" : "no"} onChange={(e) => setColor(e.target.value === "yes")} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                    <option value="no">Black & white</option>
                    <option value="yes">Color (+$0.15/page)</option>
                  </select>
                </div>
              </div>

              {file && preview && (
                <div className="rounded-md bg-muted/30 p-4 text-sm">
                  <div className="flex justify-between"><span>Letters</span><span>{preview.recipientCount} × {formatUSD(perLetterPrice)}</span></div>
                  <div className="mt-1 flex justify-between font-medium"><span>Total</span><span className="text-cobalt">{formatUSD(preview.totalCents)}</span></div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent">
                ← Back
              </button>
              <button
                onClick={startBulkCheckout}
                disabled={!canGoTo(2) || submitting || !preview}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cobalt/90 disabled:opacity-50"
              >
                {submitting ? "Creating orders..." : `Pay ${preview ? formatUSD(preview.totalCents) : ""} →`}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Checkout */}
        {step === 3 && checkout && (
          <div className="mt-8">
            <div className="envelope-card p-6">
              <h2 className="font-serif text-xl font-bold">Complete your bulk order</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview?.recipientCount} letter{preview?.recipientCount === 1 ? "" : "s"} · {preview ? formatUSD(preview.totalCents) : ""} total
              </p>
              <div className="mt-4">
                <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function validAddress(a: Address): boolean {
  return !!a.name && !!a.line1 && !!a.city && a.state.length === 2 && /^\d{5}(-\d{4})?$/.test(a.postalCode);
}

async function estimatePages(file: File): Promise<number> {
  // Quick estimate — actual page count validated server-side
  // Most PDFs are ~50KB per page
  return Math.max(1, Math.ceil(file.size / 50_000));
}
