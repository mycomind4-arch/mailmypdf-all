import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { createLetterOrder, createCheckoutForOrder } from "@/lib/orders.functions";
import { getStripe } from "@/lib/stripe";
import { recordsRequestProduct, type RecordsRequestInput, type RecordsRequestAnalysis } from "@/products/records-request";
import { MAIL_CLASS_LABELS, type MailClass } from "@/lib/pricing";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { DocumentUpload, type UploadedFile } from "@/components/document-upload";
import { ProUpsell } from "@/components/pro-upsell";

export const Route = createFileRoute("/records-request")({
  head: () => ({
    meta: [
      { title: "RecordsRequest — File FOIA and Public Records Requests by Mail" },
      { name: "description", content: "File FOIA, state public records, and agency document requests by certified mail. We format the request, you review it, we mail it with proof." },
      { property: "og:title", content: "RecordsRequest — FOIA by Mail" },
      { property: "og:description", content: "File FOIA and public records requests by certified mail. Deadline tracking, proof of submission, follow-up reminders." },
    ],
  }),
  component: RecordsRequestPage,
});

const steps = ["Request", "Review", "Mail"] as const;

type Address = { name: string; line1: string; line2: string; city: string; state: string; postalCode: string };
const emptyAddress: Address = { name: "", line1: "", line2: "", city: "", state: "", postalCode: "" };
function validAddress(a: Address) {
  return !!a.name && !!a.line1 && !!a.city && !!a.state && /^\d{5}(-\d{4})?$/.test(a.postalCode);
}

const emptyInput: RecordsRequestInput = {
  requestType: "",
  agencyName: "",
  agencyAddress: "",
  recordsDescription: "",
  timeFrame: "",
  purpose: "",
  feeWaiver: "",
  expeditedProcessing: "",
  requesterName: "",
  requesterOrg: "",
  contactEmail: "",
  contactPhone: "",
  documentText: "",
};

function RecordsRequestPage() {
  const createLetterOrderFn = useServerFn(createLetterOrder);
  const createCheckoutFn = useServerFn(createCheckoutForOrder);

  const [step, setStep] = useState(0);
  const [input, setInput] = useState<RecordsRequestInput>(emptyInput);
  const [analysis, setAnalysis] = useState<RecordsRequestAnalysis | null>(null);
  const [draft, setDraft] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sender, setSender] = useState<Address>(emptyAddress);
  const [recipient, setRecipient] = useState<Address>(emptyAddress);
  const [mailClass, setMailClass] = useState<MailClass>("certified");
  const [checkout, setCheckout] = useState<{ orderId: string; token: string } | null>(null);

  const set = (key: keyof RecordsRequestInput, value: string) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  async function analyzeAndDraft() {
    if (!input.requestType || !input.agencyName || !input.recordsDescription.trim() || !input.requesterName) {
      setError("Fill in the request type, agency name, records description, and your name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // Step 1: analyze
      const analysisRes = await fetch("/api/v1/records-request/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, documentText }),
      });
      const analysisPayload = await analysisRes.json();
      if (!analysisRes.ok) throw new Error(analysisPayload?.error?.message || "Analysis failed.");
      setAnalysis(analysisPayload.analysis as RecordsRequestAnalysis);

      // Use suggested agency if user left address blank
      if (!input.agencyAddress && analysisPayload.analysis?.suggestedAgency) {
        set("agencyAddress", analysisPayload.analysis.suggestedAgency);
      }

      // Step 2: draft
      const draftRes = await fetch("/api/v1/records-request/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, documentText }),
      });
      const draftPayload = await draftRes.json();
      if (!draftRes.ok) throw new Error(draftPayload?.error?.message || "Draft generation failed.");
      setDraft(draftPayload.draft || "");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function startMail() {
    if (!draft.trim() || !email || !validAddress(sender) || !validAddress(recipient)) {
      setError("Complete the letter, your email, and both addresses before continuing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await createLetterOrderFn({
        data: {
          email,
          sender: { ...sender, line2: sender.line2 || null },
          recipient: { ...recipient, line2: recipient.line2 || null },
          letterText: draft,
          color: false,
          mailClass,
        },
      });
      setCheckout({ orderId: created.orderId, token: created.token });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the mailing order.");
    } finally {
      setBusy(false);
    }
  }

  const fetchClientSecret = useCallback(async () => {
    if (!checkout) throw new Error("Mailing order not ready.");
    const result = await createCheckoutFn({ data: { orderId: checkout.orderId, token: checkout.token } });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Checkout session did not return a client secret.");
    return result.clientSecret;
  }, [checkout, createCheckoutFn]);

  return (
    <div className="min-h-screen"><SiteHeader /><main className="min-h-screen bg-[#f6f4ef] text-[#17201d]">
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[.72fr_1.28fr]">
        {/* Left aside */}
        <aside>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#0891b2]">Records request</p>
          <h1 className="mt-4 font-serif text-5xl leading-none md:text-6xl">
            The government has your records.
            <span className="block text-[#0891b2]">Ask for them.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#17201d]/65">
            {recordsRequestProduct.description}
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Describe what records you need",
              "AI formats a proper FOIA request",
              "You review and edit every word",
              "Mail by certified mail with proof",
            ].map((x, i) => (
              <div key={x} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#0891b2]/30 text-[#0891b2]">{i + 1}</span>
                <span className="pt-1 text-[#17201d]/65">{x}</span>
              </div>
            ))}
          </div>
          {analysis?.statutoryDeadline && (
            <div className="mt-8 rounded-xl border border-[#0891b2]/20 bg-[#ecfeff] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0891b2]">Response deadline</p>
              <p className="mt-1 text-sm font-medium">{analysis.statutoryDeadline}</p>
              {analysis.deadlineNotes && <p className="mt-1 text-xs text-[#17201d]/55">{analysis.deadlineNotes}</p>}
            </div>
          )}
        </aside>

        {/* Right workspace */}
        <section className="overflow-hidden rounded-3xl border border-[#17201d]/10 bg-white shadow-[0_20px_70px_rgba(23,32,29,.08)]">
          {/* Step bar */}
          <div className="border-b border-[#17201d]/10 px-6 py-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[.18em] text-[#0891b2]">Request workspace</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {steps.map((label, i) => (
                <div key={label}>
                  <div className={`h-1 rounded-full ${i <= step ? "bg-[#0891b2]" : "bg-black/10"}`} />
                  <p className={`mt-2 text-[11px] ${i === step ? "font-semibold text-[#17201d]" : "text-[#17201d]/40"}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {/* ── Step 0: Request details ── */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block">
                    <span className="text-sm font-medium">Request type</span>
                    <select
                      value={input.requestType}
                      onChange={(e) => set("requestType", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    >
                      <option value="">Select a request type…</option>
                      {recordsRequestProduct.requestTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Agency name</span>
                    <input
                      type="text"
                      value={input.agencyName}
                      onChange={(e) => set("agencyName", e.target.value)}
                      placeholder="e.g. FBI, EPA, California DOJ"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Agency address</span>
                    <input
                      type="text"
                      value={input.agencyAddress}
                      onChange={(e) => set("agencyAddress", e.target.value)}
                      placeholder="Street, city, state, ZIP (optional)"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium">Records you're requesting</span>
                  <textarea
                    value={input.recordsDescription}
                    onChange={(e) => set("recordsDescription", e.target.value)}
                    placeholder="Describe the records as specifically as possible — dates, subjects, offices, document types, reference numbers…"
                    rows={5}
                    className="mt-2 w-full resize-y rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                  />
                  <span className="mt-1.5 block text-xs text-[#17201d]/45">Be specific. Vague requests get rejected or delayed.</span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Time frame</span>
                    <input
                      type="text"
                      value={input.timeFrame}
                      onChange={(e) => set("timeFrame", e.target.value)}
                      placeholder="e.g. Jan 2023 – Dec 2024"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Your name</span>
                    <input
                      type="text"
                      value={input.requesterName}
                      onChange={(e) => set("requesterName", e.target.value)}
                      placeholder="Full name"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium">Purpose (optional but helps with fee waivers)</span>
                  <input
                    type="text"
                    value={input.purpose}
                    onChange={(e) => set("purpose", e.target.value)}
                    placeholder="e.g. journalism, academic research, personal interest"
                    className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Fee waiver</span>
                    <select
                      value={input.feeWaiver}
                      onChange={(e) => set("feeWaiver", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    >
                      <option value="">Select…</option>
                      {recordsRequestProduct.feeWaiverOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Contact email</span>
                    <input
                      type="email"
                      value={input.contactEmail}
                      onChange={(e) => set("contactEmail", e.target.value)}
                      placeholder="you@example.com"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Organization (optional)</span>
                    <input
                      type="text"
                      value={input.requesterOrg}
                      onChange={(e) => set("requesterOrg", e.target.value)}
                      placeholder="News org, university, nonprofit"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Phone (optional)</span>
                    <input
                      type="tel"
                      value={input.contactPhone}
                      onChange={(e) => set("contactPhone", e.target.value)}
                      placeholder="(555) 555-5555"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                </div>

                {/* Analysis tips/warnings */}
                {analysis && (
                  <div className="space-y-3">
                    {analysis.warnings.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Warnings</p>
                        <ul className="mt-2 space-y-1">
                          {analysis.warnings.map((w, i) => (
                            <li key={i} className="text-sm text-amber-800">• {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.tips.length > 0 && (
                      <div className="rounded-lg border border-[#0891b2]/20 bg-[#ecfeff] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#0891b2]">Tips</p>
                        <ul className="mt-2 space-y-1">
                          {analysis.tips.map((t, i) => (
                            <li key={i} className="text-sm text-[#0891b2]">• {t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <DocumentUpload
                  documentText={documentText}
                  onTextChange={setDocumentText}
                  files={uploadedFiles}
                  onFilesChange={setUploadedFiles}
                  accent={ACCENT}
                />

                <button
                  onClick={analyzeAndDraft}
                  disabled={busy}
                  className="w-full rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Formatting your request…" : "Generate request letter"}
                </button>
              </div>
            )}

            {/* ── Step 1: Review & edit draft ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-serif text-2xl">Your request letter</h2>
                  <p className="mt-1 text-sm text-[#17201d]/55">Edit anything. This is your request — make sure it's right before mailing.</p>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[500px] w-full resize-y rounded-xl border border-[#17201d]/15 bg-white px-4 py-4 font-mono text-sm leading-6"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(0)}
                    className="rounded-full border border-[#17201d]/20 px-5 py-3 text-sm font-semibold hover:border-[#17201d]/40"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={startMail}
                    disabled={busy || !draft.trim()}
                    className="flex-1 rounded-full bg-[#0891b2] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
                  >
                    {busy ? "Preparing checkout…" : "Continue to mailing →"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Mail checkout ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl">Mail your request</h2>
                  <p className="mt-1 text-sm text-[#17201d]/55">Enter addresses and choose your mail class. Certified mail includes tracking and delivery confirmation.</p>
                </div>

                {/* Email */}
                <label className="block">
                  <span className="text-sm font-medium">Email for order confirmation</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                  />
                </label>

                {/* Sender address */}
                <div>
                  <p className="mb-2 text-sm font-medium">Your return address</p>
                  <div className="grid gap-3">
                    <input type="text" placeholder="Full name" value={sender.name} onChange={(e) => setSender({ ...sender, name: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                    <input type="text" placeholder="Street address" value={sender.line1} onChange={(e) => setSender({ ...sender, line1: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                    <input type="text" placeholder="Apt / suite (optional)" value={sender.line2} onChange={(e) => setSender({ ...sender, line2: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" placeholder="City" value={sender.city} onChange={(e) => setSender({ ...sender, city: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                      <input type="text" placeholder="State" maxLength={2} value={sender.state} onChange={(e) => setSender({ ...sender, state: e.target.value.toUpperCase() })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                      <input type="text" placeholder="ZIP" value={sender.postalCode} onChange={(e) => setSender({ ...sender, postalCode: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Recipient address */}
                <div>
                  <p className="mb-2 text-sm font-medium">Agency mailing address</p>
                  <div className="grid gap-3">
                    <input type="text" placeholder="Agency name" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                    <input type="text" placeholder="Street address" value={recipient.line1} onChange={(e) => setRecipient({ ...recipient, line1: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                    <input type="text" placeholder="Suite / office (optional)" value={recipient.line2} onChange={(e) => setRecipient({ ...recipient, line2: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" placeholder="City" value={recipient.city} onChange={(e) => setRecipient({ ...recipient, city: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                      <input type="text" placeholder="State" maxLength={2} value={recipient.state} onChange={(e) => setRecipient({ ...recipient, state: e.target.value.toUpperCase() })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                      <input type="text" placeholder="ZIP" value={recipient.postalCode} onChange={(e) => setRecipient({ ...recipient, postalCode: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Mail class */}
                <div>
                  <p className="mb-2 text-sm font-medium">Mail class</p>
                  <div className="space-y-2">
                    {(Object.keys(MAIL_CLASS_LABELS) as MailClass[]).map((mc) => (
                      <label key={mc} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#17201d]/15 p-3 hover:bg-[#f6f4ef]">
                        <input type="radio" name="mailClass" checked={mailClass === mc} onChange={() => setMailClass(mc)} className="accent-[#0891b2]" />
                        <span className="text-sm">{MAIL_CLASS_LABELS[mc]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="rounded-full border border-[#17201d]/20 px-5 py-3 text-sm font-semibold hover:border-[#17201d]/40"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={startMail}
                    disabled={busy}
                    className="flex-1 rounded-full bg-[#0891b2] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
                  >
                    {busy ? "Starting checkout…" : "Proceed to payment →"}
                  </button>
                </div>

                {/* Stripe embedded checkout */}
                <ProUpsell accent={ACCENT} />

                {checkout && (
                  <div className="mt-6">
                    <EmbeddedCheckoutProvider
                      stripe={getStripe()}
                      options={{ fetchClientSecret }}
                    >
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}

                <p className="text-xs leading-5 text-[#17201d]/45">
                  RecordsRequest helps you format and mail a public records request. It is not legal advice.
                  You are responsible for verifying the agency address and reviewing the request before it is sent.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
      <SiteFooter />
    </div>
  );
}
