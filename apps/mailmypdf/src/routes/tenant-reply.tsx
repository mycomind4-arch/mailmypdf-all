import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { createLetterOrder, createCheckoutForOrder } from "@/lib/orders.functions";
import { getStripe } from "@/lib/stripe";
import { tenantReplyProduct, type TenantReplyInput, type TenantReplyAnalysis } from "@/products/tenant-reply";
import { MAIL_CLASS_LABELS, type MailClass } from "@/lib/pricing";
import { ProUpsell } from "@/components/pro-upsell";
import { DocumentUpload, type UploadedFile } from "@/components/document-upload";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/tenant-reply")({
  head: () => ({
    meta: [
      { title: "TenantReply — Respond to Your Landlord | MailMyPDF" },
      { name: "description", content: "Got a notice from your landlord? Draft a formal response, document your position, and mail it certified with proof of delivery." },
      { property: "og:title", content: "TenantReply — Respond to Your Landlord" },
      { property: "og:description", content: "Draft a formal response to your landlord. Certified mail with proof of delivery." },
    ],
  }),
  component: TenantReplyPage,
});

const steps = ["Notice", "Review", "Mail"] as const;

type Address = { name: string; line1: string; line2: string; city: string; state: string; postalCode: string };
const emptyAddress: Address = { name: "", line1: "", line2: "", city: "", state: "", postalCode: "" };
function validAddress(a: Address) {
  return !!a.name && !!a.line1 && !!a.city && !!a.state && /^\d{5}(-\d{4})?$/.test(a.postalCode);
}

const emptyInput: TenantReplyInput = {
  noticeType: "",
  landlordName: "",
  landlordAddress: "",
  noticeDate: "",
  responseDeadline: "",
  noticeSummary: "",
  tenantPosition: "",
  evidenceItems: "",
  leaseStartDate: "",
  leaseEndDate: "",
  monthlyRent: "",
  tenantName: "",
  tenantAddress: "",
  tenantEmail: "",
  tenantPhone: "",
  additionalNotes: "",
  documentText: "",
};

const ACCENT = "#b45309";
const ACCENT_LIGHT = "#fefce8";

function TenantReplyPage() {
  const createLetterOrderFn = useServerFn(createLetterOrder);
  const createCheckoutFn = useServerFn(createCheckoutForOrder);

  const [step, setStep] = useState(0);
  const [input, setInput] = useState<TenantReplyInput>(emptyInput);
  const [analysis, setAnalysis] = useState<TenantReplyAnalysis | null>(null);
  const [draft, setDraft] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [documentText, setDocumentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sender, setSender] = useState<Address>(emptyAddress);
  const [recipient, setRecipient] = useState<Address>(emptyAddress);
  const [mailClass, setMailClass] = useState<MailClass>("certified");
  const [checkout, setCheckout] = useState<{ orderId: string; token: string } | null>(null);

  const set = (key: keyof TenantReplyInput, value: string) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  async function analyzeAndDraft() {
    if (!input.noticeType || !input.landlordName || !input.noticeSummary.trim() || !input.tenantPosition.trim() || !input.tenantName) {
      setError("Fill in the notice type, landlord name, notice summary, your position, and your name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const analysisRes = await fetch("/api/v1/tenant-reply/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, documentText }),
      });
      const analysisPayload = await analysisRes.json();
      if (!analysisRes.ok) throw new Error(analysisPayload?.error?.message || "Analysis failed.");
      setAnalysis(analysisPayload.analysis as TenantReplyAnalysis);

      const draftRes = await fetch("/api/v1/tenant-reply/draft", {
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
          <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{ color: ACCENT }}>Tenant response</p>
          <h1 className="mt-4 font-serif text-5xl leading-none md:text-6xl">
            Respond to your landlord.
            <span className="block" style={{ color: ACCENT }}>In writing. On the record.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#17201d]/65">
            {tenantReplyProduct.description}
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Describe the notice you received",
              "AI drafts a formal response letter",
              "You review and edit every word",
              "Mail certified with proof of delivery",
            ].map((x, i) => (
              <div key={x} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold" style={{ borderColor: ACCENT + "40", color: ACCENT }}>{i + 1}</span>
                <span className="pt-1 text-[#17201d]/65">{x}</span>
              </div>
            ))}
          </div>

          {analysis?.deadlineInfo && (
            <div className={`mt-8 rounded-xl border p-4 ${analysis.deadlinePassed ? "border-red-200 bg-red-50" : "border-[#b45309]/20"}`} style={!analysis.deadlinePassed ? { background: ACCENT_LIGHT } : {}}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>Response deadline</p>
              <p className="mt-1 text-sm font-medium">
                {analysis.deadlineInfo}
                {analysis.deadlinePassed && <span className="text-red-600"> — deadline passed</span>}
              </p>
              {!analysis.deadlinePassed && (
                <p className="mt-1 text-xs text-[#17201d]/55">Mail your response as soon as possible.</p>
              )}
            </div>
          )}

          {analysis?.rightsSummary && (
            <div className="mt-4 rounded-xl border border-[#17201d]/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>Your rights</p>
              <p className="mt-1 text-xs text-[#17201d]/65">{analysis.rightsSummary}</p>
              <p className="mt-2 text-[11px] text-[#17201d]/40">Not legal advice. Consult a local tenant rights organization for jurisdiction-specific guidance.</p>
            </div>
          )}

          {analysis && analysis.checklistItems.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#17201d]/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>Documents to include</p>
              <ul className="mt-2 space-y-1.5">
                {analysis.checklistItems.map((item, i) => (
                  <li key={i} className="text-xs text-[#17201d]/65">☐ {item}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis?.suggestedAction && (
            <div className="mt-4 rounded-xl border border-[#17201d]/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>Suggested action</p>
              <p className="mt-1 text-xs text-[#17201d]/65">{analysis.suggestedAction}</p>
            </div>
          )}
        </aside>

        {/* Right workspace */}
        <section className="overflow-hidden rounded-3xl border border-[#17201d]/10 bg-white shadow-[0_20px_70px_rgba(23,32,29,.08)]">
          {/* Step bar */}
          <div className="border-b border-[#17201d]/10 px-6 py-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[.18em]" style={{ color: ACCENT }}>Response workspace</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {steps.map((label, i) => (
                <div key={label}>
                  <div className="h-1 rounded-full" style={{ background: i <= step ? ACCENT : "rgba(0,0,0,.10)" }} />
                  <p className={`mt-2 text-[11px] ${i === step ? "font-semibold text-[#17201d]" : "text-[#17201d]/40"}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {/* ── Step 0: Notice details ── */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block">
                    <span className="text-sm font-medium">What type of notice did you receive?</span>
                    <select
                      value={input.noticeType}
                      onChange={(e) => set("noticeType", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    >
                      <option value="">Select a notice type…</option>
                      {tenantReplyProduct.noticeTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Landlord / property manager name</span>
                    <input
                      type="text"
                      value={input.landlordName}
                      onChange={(e) => set("landlordName", e.target.value)}
                      placeholder="e.g. ABC Management LLC"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Landlord's address</span>
                    <input
                      type="text"
                      value={input.landlordAddress}
                      onChange={(e) => set("landlordAddress", e.target.value)}
                      placeholder="Street, city, state, ZIP"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Date you received the notice</span>
                    <input
                      type="date"
                      value={input.noticeDate}
                      onChange={(e) => set("noticeDate", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Response deadline (if any)</span>
                    <input
                      type="date"
                      value={input.responseDeadline}
                      onChange={(e) => set("responseDeadline", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium">What does the notice say?</span>
                  <textarea
                    value={input.noticeSummary}
                    onChange={(e) => set("noticeSummary", e.target.value)}
                    placeholder="Summarize the notice — what is the landlord asking, demanding, or notifying you about? Include any specific amounts, dates, or violations mentioned."
                    rows={4}
                    className="mt-2 w-full resize-y rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Your position / response</span>
                  <textarea
                    value={input.tenantPosition}
                    onChange={(e) => set("tenantPosition", e.target.value)}
                    placeholder="What's your side? Do you agree, disagree, or partially agree? What do you want to happen? Be specific — this becomes the core of your response letter."
                    rows={4}
                    className="mt-2 w-full resize-y rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Evidence / documents you're including</span>
                  <textarea
                    value={input.evidenceItems}
                    onChange={(e) => set("evidenceItems", e.target.value)}
                    placeholder="List what you're enclosing — e.g. photos of the issue, repair requests, rent receipts, lease copy, email correspondence…"
                    rows={3}
                    className="mt-2 w-full resize-y rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-medium">Lease start date</span>
                    <input
                      type="date"
                      value={input.leaseStartDate}
                      onChange={(e) => set("leaseStartDate", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Lease end date</span>
                    <input
                      type="date"
                      value={input.leaseEndDate}
                      onChange={(e) => set("leaseEndDate", e.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Monthly rent</span>
                    <input
                      type="text"
                      value={input.monthlyRent}
                      onChange={(e) => set("monthlyRent", e.target.value)}
                      placeholder="e.g. $1,800"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Your full name</span>
                    <input
                      type="text"
                      value={input.tenantName}
                      onChange={(e) => set("tenantName", e.target.value)}
                      placeholder="Full legal name"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Your email</span>
                    <input
                      type="email"
                      value={input.tenantEmail}
                      onChange={(e) => set("tenantEmail", e.target.value)}
                      placeholder="you@example.com"
                      className="mt-2 w-full rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                    />
                  </label>
                </div>

                <DocumentUpload
                  documentText={documentText}
                  onTextChange={setDocumentText}
                  files={uploadedFiles}
                  onFilesChange={setUploadedFiles}
                  accent={ACCENT}
                />

                <label className="block">
                  <span className="text-sm font-medium">Anything else? (optional)</span>
                  <textarea
                    value={input.additionalNotes}
                    onChange={(e) => set("additionalNotes", e.target.value)}
                    placeholder="Additional context, prior communication, special circumstances…"
                    rows={2}
                    className="mt-2 w-full resize-y rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm"
                  />
                </label>

                {/* Analysis warnings/tips */}
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
                      <div className="rounded-lg border border-[#b45309]/20 p-4" style={{ background: ACCENT_LIGHT }}>
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>Tips</p>
                        <ul className="mt-2 space-y-1">
                          {analysis.tips.map((t, i) => (
                            <li key={i} className="text-sm" style={{ color: ACCENT }}>• {t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={analyzeAndDraft}
                  disabled={busy}
                  className="w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: ACCENT }}
                >
                  {busy ? "Drafting your response…" : "Generate response letter"}
                </button>
              </div>
            )}

            {/* ── Step 1: Review & edit draft ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-serif text-2xl">Your response letter</h2>
                  <p className="mt-1 text-sm text-[#17201d]/55">Edit anything. This is your letter — make sure it's right before mailing.</p>
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
                    className="flex-1 rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
                    style={{ background: ACCENT }}
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
                  <h2 className="font-serif text-2xl">Mail your response</h2>
                  <p className="mt-1 text-sm text-[#17201d]/55">Enter addresses and choose your mail class. Certified mail includes tracking and delivery confirmation.</p>
                </div>

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
                  <p className="mb-2 text-sm font-medium">Landlord's mailing address</p>
                  <div className="grid gap-3">
                    <input type="text" placeholder="Recipient name" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} className="rounded-lg border border-[#17201d]/15 bg-white px-3 py-3 text-sm" />
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
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(Object.keys(MAIL_CLASS_LABELS) as MailClass[]).map((mc) => (
                      <button
                        key={mc}
                        onClick={() => setMailClass(mc)}
                        className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${mailClass === mc ? "border-[#b45309] bg-[#fefce8]" : "border-[#17201d]/15 hover:border-[#17201d]/30"}`}
                      >
                        <span className="block font-medium">{MAIL_CLASS_LABELS[mc]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <ProUpsell accent={ACCENT} />

                {checkout ? (
                  <div className="rounded-xl border border-[#17201d]/10 p-4">
                    <EmbeddedCheckoutProvider
                      stripe={getStripe()}
                      options={{ fetchClientSecret }}
                    >
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                ) : (
                  <button
                    onClick={startMail}
                    disabled={busy || !email || !validAddress(sender) || !validAddress(recipient)}
                    className="w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: ACCENT }}
                  >
                    {busy ? "Preparing…" : "Start checkout →"}
                  </button>
                )}
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
