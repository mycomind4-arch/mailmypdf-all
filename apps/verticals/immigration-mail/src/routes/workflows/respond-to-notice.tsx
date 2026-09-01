import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { workflows } from "../../domain/workflows";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import { saveCorrespondence, createMailingOrder, formatPrice, formatDate } from "@/lib/cases";

export const Route = createFileRoute("/workflows/respond-to-notice")({
  head: () => ({
    meta: [
      { title: "Respond to a Notice — Immigration Mail" },
      { name: "description", content: "Guided workflow to organize a notice, prepare a response, and mail it with proof of delivery." },
    ],
    links: [{ rel: "canonical", href: "https://immigrationmail.com/workflows/respond-to-notice" }],
  }),
  component: RespondToNotice,
});

const STEPS = [
  { id: "intake", label: "Notice" },
  { id: "facts", label: "Facts" },
  { id: "objective", label: "Objective" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
  { id: "documents", label: "Documents" },
  { id: "recipient", label: "Recipient" },
  { id: "mail", label: "Mail" },
  { id: "checkout", label: "Checkout" },
];

const MAIL_OPTIONS = [
  { id: "standard", label: "Standard", price: "$4.99", desc: "3–7 business days · Tracking included" },
  { id: "certified", label: "Certified", price: "$14.94", desc: "Delivery tracking + confirmation · 3–7 days" },
  { id: "registered", label: "Registered", price: "$32.49", desc: "Secure handling + tracking · 5–10 days" },
];

// Prices in cents for database storage
const MAIL_PRICES_CENTS: Record<string, number> = {
  standard: 499,
  certified: 1494,
  registered: 3249,
};

const REVIEW_CHECKS = [
  "I reviewed every factual statement in this draft.",
  "Names, dates, receipt numbers, and addresses are correct.",
  "I reviewed the uploaded notice and official instructions.",
  "I understand Immigration Mail is not providing legal advice.",
];

function RespondToNotice() {
  const definition = workflows["respond-to-notice"];
  const [step, setStep] = useState(0);
  const [noticeName, setNoticeName] = useState("");
  const [agency, setAgency] = useState("");
  const [noticeDate, setNoticeDate] = useState("");
  const [responseDeadline, setResponseDeadline] = useState("");
  const [facts, setFacts] = useState("");
  const [objective, setObjective] = useState("");
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<boolean[]>(REVIEW_CHECKS.map(() => false));
  const [mailType, setMailType] = useState("certified");
  const [recipient, setRecipient] = useState({ name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [done, setDone] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([]);
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMailingId, setSavedMailingId] = useState<string | null>(null);
  const [savedCorrespondenceId, setSavedCorrespondenceId] = useState<string | null>(null);

  const progress = useMemo(() => Math.round((step / (STEPS.length - 1)) * 100), [step]);
  const allChecked = checks.every(Boolean);

  function generateDraft() {
    return `Re: Response to ${noticeName || "[Notice Reference]"}
${agency ? `Agency: ${agency}` : ""}
${noticeDate ? `Notice Date: ${noticeDate}` : ""}
${responseDeadline ? `Response Deadline: ${responseDeadline}` : ""}

Dear Sir or Madam,

I am writing in response to the notice referenced above. ${objective || "[Your objective will appear here.]"}

${facts || "[The facts you provided will appear here.]"}

Please find enclosed the requested documents and information. I respectfully request that you consider this response in a timely manner.

Sincerely,
[Your Name]`;
  }

  function canContinue() {
    switch (step) {
      case 0: return noticeName.trim().length > 0;
      case 1: return facts.trim().length > 0;
      case 2: return objective.trim().length > 0;
      case 4: return allChecked;
      case 6: return !!(recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip);
      default: return true;
    }
  }

  async function next() {
    if (step === 3 && !draft) setDraft(generateDraft());
    if (step === STEPS.length - 1) {
      // Checkout: save to database
      if (user) {
        setSaving(true);
        setSaveError(null);

        // Save correspondence draft
        const corrResult = await saveCorrespondence(user.id, {
          workflow_id: "respond-to-notice",
          title: noticeName || "Response to Notice",
          draft_content: draft || generateDraft(),
          status: "pending",
        });

        if (corrResult.error) {
          setSaveError(corrResult.error);
          setSaving(false);
          return;
        }

        setSavedCorrespondenceId(corrResult.data?.id ?? null);

        // Create mailing order
        const mailResult = await createMailingOrder(user.id, {
          workflow_id: "respond-to-notice",
          correspondence_id: corrResult.data?.id,
          recipient_name: recipient.name,
          recipient_org: recipient.org,
          recipient_address1: recipient.address1,
          recipient_address2: recipient.address2,
          recipient_city: recipient.city,
          recipient_state: recipient.state,
          recipient_zip: recipient.zip,
          mail_method: mailType,
          price_cents: MAIL_PRICES_CENTS[mailType] || 499,
        });

        if (mailResult.error) {
          setSaveError(mailResult.error);
          setSaving(false);
          return;
        }

        setSavedMailingId(mailResult.data?.id ?? null);
        setSaving(false);
      }
      setDone(true);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  if (done) return <Success mailingId={savedMailingId} correspondenceId={savedCorrespondenceId} />;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Stepper */}
        <Stepper current={step} onStep={(i) => setStep(i)} canGoTo={(i) => i <= step} />

        <div className="mt-10 envelope-card p-6 md:p-10">
          {/* Step 0: Intake */}
          {step === 0 && (
            <div>
              <div className="postmark w-fit">1 · Upload / identify</div>
              <h1 className="mt-4 font-serif text-3xl sm:text-4xl">Respond to a notice</h1>
              <p className="mt-3 text-muted-foreground">
                We'll help you organize the notice, confirm the information you provide,
                prepare an editable draft, and move toward mailing. Nothing is sent until you review and approve it.
              </p>
              <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
                <div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div>
                <p className="mt-2">{definition.disclaimer}</p>
              </div>
              <label className="upload-zone mt-6 block">
                <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span className="mt-3 block font-medium text-foreground">Upload notice</span>
                <span className="mt-1 block text-xs text-muted-foreground">PDF, JPG, or PNG · Secure storage</span>
                <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) { setUploadedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size }))] ); } }} />
              </label>

              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-rule/70 bg-paper-deep/40 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 text-ink-soft">
                        <svg className="h-4 w-4 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        {file.name}
                      </span>
                      <button type="button" onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="input-label">Notice name or reference *</label>
                  <input className="input-field" value={noticeName} onChange={(e) => setNoticeName(e.target.value)} placeholder="Example: USCIS RFE received August 2026" />
                </div>
                <div>
                  <label className="input-label">Issuing agency</label>
                  <input className="input-field" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="USCIS, ICE, DOS, etc." />
                </div>
                <div>
                  <label className="input-label">Notice date</label>
                  <input type="date" className="input-field" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Response deadline</label>
                  <input type="date" className="input-field" value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Facts */}
          {step === 1 && (
            <div>
              <div className="postmark w-fit">2 · Your facts</div>
              <h2 className="mt-4 font-serif text-2xl sm:text-3xl">What facts should the response address?</h2>
              <p className="mt-3 text-muted-foreground">Use your own words. Only include information you can verify.</p>
              <textarea className="input-field mt-6 min-h-48" value={facts} onChange={(e) => setFacts(e.target.value)} placeholder="Enter the relevant facts you want included in your response..." />
              <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground">
                <strong>Tip:</strong> Include dates, receipt numbers, case numbers, and any specific requests from the notice.
              </div>
            </div>
          )}

          {/* Step 2: Objective */}
          {step === 2 && (
            <div>
              <div className="postmark w-fit">3 · Your objective</div>
              <h2 className="mt-4 font-serif text-2xl sm:text-3xl">What do you want to accomplish?</h2>
              <p className="mt-3 text-muted-foreground">Describe the outcome you want. This guides the tone and structure of the draft.</p>
              <textarea className="input-field mt-6 min-h-40" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Example: I want to provide the requested documents and explain why one item is missing..." />
            </div>
          )}

          {/* Step 3: Draft */}
          {step === 3 && (
            <div>
              <div className="postmark w-fit">4 · Draft</div>
              <h2 className="mt-4 font-serif text-2xl sm:text-3xl">Your draft letter</h2>
              <p className="mt-3 text-muted-foreground">Review every fact, name, date, and statement. This is editable — change anything.</p>
              <textarea className="input-field mt-6 min-h-72 font-mono text-sm leading-6" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground">
                This draft was generated from your input. It is not legal advice. Review and edit carefully.
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div>
              <div className="postmark w-fit">5 · Review</div>
              <h2 className="mt-4 font-serif text-2xl sm:text-3xl">Review before anything is mailed</h2>
              <p className="mt-3 text-muted-foreground">Please confirm each item below.</p>
              <div className="mt-6 space-y-3">
                {REVIEW_CHECKS.map((item, i) => (
                  <label key={item} className="check-card">
                    <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Documents */}
          {step === 5 && (
            <div>
              <div className="postmark w-fit">6 · Documents</div>
              <h2 className="mt-4 font-serif text-2xl sm:text-3xl">Add supporting documents</h2>
              <p className="mt-3 text-muted-foreground">Attach any documents referenced in your response — forms, evidence, identification, etc.</p>
              <label className="upload-zone mt-6 block">
                <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span className="mt-3 block font-medium text-foreground">Add attachments</span>
                <span className="mt-1 block text-xs text-muted-foreground">Forms, evidence, identification</span>
                <input type="file" accept="application/pdf,image/jpeg,image/png" multiple className="sr-only" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) { setUploadedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size }))] ); } }} />
              </label>
            </div>
          )}

          {/* Step 6: Recipient */}
          {step === 6 && (
            <div>
              <div className="postmark w-fit">7 · Recipient</div>
              <h2 className="mt-4 font-serif text-2xl sm:text-3xl">Where should we send it?</h2>
              <p className="mt-3 text-muted-foreground">Enter the agency's mailing address from the notice.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="input-label">Recipient name *</label><input className="input-field" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} placeholder="USCIS — Texas Service Center" /></div>
                <div className="sm:col-span-2"><label className="input-label">Organization</label><input className="input-field" value={recipient.org} onChange={(e) => setRecipient({ ...recipient, org: e.target.value })} placeholder={agency || "Agency name"} /></div>
                <div className="sm:col-span-2"><label className="input-label">Address line 1 *</label><input className="input-field" value={recipient.address1} onChange={(e) => setRecipient({ ...recipient, address1: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className="input-label">Address line 2</label><input className="input-field" value={recipient.address2} onChange={(e) => setRecipient({ ...recipient, address2: e.target.value })} /></div>
                <div><label className="input-label">City *</label><input className="input-field" value={recipient.city} onChange={(e) => setRecipient({ ...recipient, city: e.target.value })} /></div>
                <div><label className="input-label">State *</label><input className="input-field" value={recipient.state} onChange={(e) => setRecipient({ ...recipient, state: e.target.value })} /></div>
                <div><label className="input-label">ZIP Code *</label><input className="input-field" value={recipient.zip} onChange={(e) => setRecipient({ ...recipient, zip: e.target.value })} /></div>
              </div>
            </div>
          )}

          {/* Step 7: Mail */}
          {step === 7 && (
            <div>
              <div className="postmark w-fit">8 · Mail options</div>
              <h2 className="mt-4 font-serif text-2xl sm:text-3xl">Choose your mail type</h2>
              <p className="mt-3 text-muted-foreground">For immigration correspondence, Certified mail is recommended for proof of timely submission.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {MAIL_OPTIONS.map((opt) => (
                  <div key={opt.id} className={`mail-option ${mailType === opt.id ? "selected" : ""}`} onClick={() => setMailType(opt.id)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-lg">{opt.price}</p>
                        {mailType === opt.id && <svg className="ml-auto h-4 w-4 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 8: Checkout */}
          {step === 8 && (
            <div>
              <div className="postmark w-fit">9 · Checkout</div>
              <h2 className="mt-4 font-serif text-2xl sm:text-3xl">Review and pay</h2>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Mail type</span>
                  <span className="font-medium text-foreground">{MAIL_OPTIONS.find((m) => m.id === mailType)?.label}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-medium text-foreground">{recipient.name || "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-serif text-lg">{MAIL_OPTIONS.find((m) => m.id === mailType)?.price}</span>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground">
                <svg className="inline h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z" /></svg>
                Secure checkout via Stripe is being connected.
              </div>
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {saveError}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button onClick={back} disabled={step === 0} className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30">
              ← Back
            </button>
            <button
              onClick={next}
              disabled={!canContinue() || saving}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:transform-none disabled:shadow-none"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : step === STEPS.length - 1 ? "Pay and send" : "Continue"} →
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-stamp transition-colors">← Back to Immigration Mail</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ── Stepper ─────────────────────────────────────────────────────────── */
function Stepper({ current, onStep, canGoTo }: { current: number; onStep: (i: number) => void; canGoTo: (i: number) => boolean }) {
  return (
    <ol className="workflow-stepper flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => canGoTo(i) && onStep(i)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition-colors ${
                active ? "border-stamp bg-stamp text-accent-foreground"
                  : done ? "border-ink bg-ink text-primary-foreground"
                    : "border-rule bg-card text-muted-foreground"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </button>
            <span className={`hidden text-xs sm:inline ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="w-4 shrink-0 border-t border-dashed border-rule sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Success ─────────────────────────────────────────────────────────── */
function Success({ mailingId, correspondenceId }: { mailingId?: string | null; correspondenceId?: string | null }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6 sm:py-32">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stamp/10">
          <svg className="h-8 w-8 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="mt-6 font-serif text-3xl sm:text-4xl">Your letter has been submitted</h1>
        <p className="mt-3 text-muted-foreground">Your correspondence is being prepared for mailing.</p>

        {mailingId && (
          <div className="mt-6 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-rule/60 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Mailing ID:</span>
              <span className="font-mono font-medium text-foreground">{mailingId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-rule/60 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Tracking:</span>
              <span className="font-mono font-medium text-foreground">— Pending —</span>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          We'll send you a tracking number once your letter enters the USPS system.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center rounded-full border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted">View my mailings</Link>
          <Link to="/workflows/respond-to-notice" className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-stamp">Start another</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
