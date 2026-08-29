import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
  const llmAnalysis = useCombinedAnalysis("irs-notice");
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Stepper, MailOptions, RecipientForm, ReviewChecks, MAIL_OPTIONS } from "@/components/workflow-shell";
import { getWorkflowById } from "@/domain/workflow-catalog";
import {
  createWorkflowState, advanceStep, retreatStep, goToStep, canAdvance,
  setUserFacts, setUserObjective, setDraft, setReviewChecks, setMailing,
  type WorkflowState,
} from "@/domain/workflow-runtime";
import { validateDraft } from "@/domain/draft-validator";
import { extractFromText } from "@/platform/notice-extraction";
import { createFact } from "@/domain/fact";

import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { LLMAnalysisPanel } from "@/components/llm-analysis-panel";
import { FAQSection } from "@/components/faq-section";
import { getWorkflowSEO } from "@/domain/workflow-seo";
export const Route = createFileRoute("/workflows/irs-notice")({
  head: () => createWorkflowHead("irs-notice"),
  component: IRSNotice,
});

// IRS notice-specific form fields (not in the generic runtime)
interface IRSFormFields {
  noticeNumber: string;
  noticeType: string;
  noticeDate: string;
  responseDeadline: string;
  taxYear: string;
}

function IRSNotice() {
  const definition = getWorkflowById("irs-notice");
  const steps = definition?.ux?.steps ?? [];
  const [state, setState] = useState<WorkflowState>(() => createWorkflowState(definition));
  const [formFields, setFormFields] = useState<IRSFormFields>({
    noticeNumber: "", noticeType: "", noticeDate: "", responseDeadline: "", taxYear: "",
  });
  const update = (fn: (s: WorkflowState) => WorkflowState) => setState(fn);

  // ── Draft generation ──
  const generateDraft = useCallback(() => {
    const f = formFields;
    const lines = [
      `Re: Response to IRS Notice ${f.noticeNumber || "[Notice Number]"}`,
      f.noticeType ? `Notice Type: ${f.noticeType}` : "",
      f.taxYear ? `Tax Year: ${f.taxYear}` : "",
      f.noticeDate ? `Notice Date: ${f.noticeDate}` : "",
      f.responseDeadline ? `Response Deadline: ${f.responseDeadline}` : "",
      "",
      "Dear Sir or Madam,",
      "",
      `I am writing in response to the notice referenced above. ${state.userObjective || "[Your objective will appear here.]"}`,
      "",
      state.userFacts || "[The facts you provided will appear here.]",
      "",
      "Please find enclosed the requested information and documentation. I respectfully request that you consider this response in a timely manner.",
      "",
      "Sincerely,",
      "[Your Name]",
    ];
    const draft = lines.filter((l) => l !== "").join("\n");
    update((s) => setDraft(s, draft));
    
    // Run validation
    const facts: ReturnType<typeof createFact>[] = [];
    if (f.noticeNumber) facts.push(createFact("Notice Number", f.noticeNumber, "user-provided", "high", { sourceExcerpt: f.noticeNumber, extractionMethod: "manual_entry" }));
    if (f.taxYear) facts.push(createFact("Tax Year", f.taxYear, "user-provided", "high", { sourceExcerpt: f.taxYear, extractionMethod: "manual_entry" }));
    if (f.responseDeadline) facts.push(createFact("Response Deadline", f.responseDeadline, "user-provided", "high", { sourceExcerpt: f.responseDeadline, extractionMethod: "manual_entry" }));
    
    const validation = validateDraft(draft, facts, definition, {
      expectedNoticeNumber: f.noticeNumber || undefined,
      expectedTaxYear: f.taxYear || undefined,
      expectedDeadline: f.responseDeadline || undefined,
    });
    update((s) => setDraftValidation(s, validation));
  }, [formFields, state.userFacts, state.userObjective, definition, update]);

  // Need to import setDraftValidation
  const setDraftValidationLocal = (validation: any) => update((s) => ({ ...s, draftValidation: validation, lastUpdated: new Date().toISOString() }));

  const next = () => {
    if (state.phase === "draft" && !state.draft) {
      generateDraft();
    }
    update((s) => advanceStep(s, definition));
  };
  const back = () => update((s) => retreatStep(s, definition));

  const [workflowStarted, setWorkflowStarted] = useState(false);
  const workflowRef = useRef<HTMLDivElement>(null);
  const stepOk = canAdvance(state, definition);

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => {
      workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  if (state.phase === "submitted" || state.phase === "done") {
    return (
      <div className="min-h-screen command-center">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stamp/10">
            <svg className="h-8 w-8 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="mt-6 font-serif text-4xl">Your IRS response is ready</h1>
          <p className="mt-3 text-muted-foreground">Your response has been prepared for mailing through MailMyPDF.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/" className="inline-flex items-center rounded-full border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted">Back to home</Link>
            <Link to="/workflows/irs-notice" className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-stamp">Start another</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-rule/60">
          <div className="absolute inset-0 bg-gradient-to-b from-paper-deep/40 via-paper to-paper" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 md:py-28">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-stamp transition-colors">Notice Respond</Link>
              <span className="text-rule">/</span>
              <Link to="/workflows" className="hover:text-stamp transition-colors">Workflows</Link>
              <span className="text-rule">/</span>
              <span className="text-ink-soft">IRS Notice</span>
            </nav>
            <div className="postmark w-fit mt-6">IRS Notice</div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
              Respond to your <span className="italic text-stamp">IRS notice</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              You received an IRS notice that doesn't fit a specific workflow. Upload it, extract the key details, and prepare a documented response with your facts and supporting evidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={startWorkflow} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                Start your response
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
              <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3.5 text-sm font-medium transition-colors hover:border-ink/30">Browse other notices</Link>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule/60 bg-rule/60 sm:grid-cols-4">
              <KeyFact label="Notice type" value="Any IRS" />
              <KeyFact label="Jurisdiction" value="Federal" />
              <KeyFact label="Recommended mail" value="Certified" />
              <KeyFact label="Cost to prepare" value="Free" />
            </div>
          </div>
        </section>

        {/* WHAT IS */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Understanding the notice</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">What is an IRS notice?</h2>
            <div className="mt-6 space-y-4 text-base leading-7 text-ink-soft">
              <p>The IRS sends hundreds of different notice types, each with a unique CP or LT number. Common ones include CP2000 (proposed adjustment), CP14 (balance due), CP504 (intent to levy), and LT11 (levy). This workflow handles any IRS notice not covered by a specific workflow.</p>
              <p>IRS notices have strict response deadlines, typically 30 to 60 days. Missing the deadline can result in automatic adjustments, additional penalties, or collection actions. Most notices include appeal rights and instructions for responding.</p>
              <p>A documented response addresses the specific notice type, provides supporting evidence, and clearly states your position. Responding early gives you the most options and prevents escalation to more serious collection actions.</p>
            </div>
            <div className="mt-8 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-stamp">What an IRS notice includes</div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Notice number (CP/LT)</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Tax year(s) affected</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Amount due or adjustment</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Response deadline</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Appeal rights</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>IRS response address</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Payment instructions</li>
                <li className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>Required documentation</li>
              </ul>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">The process</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">How Notice Respond works</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <ProcessStep number="01" title="Upload & analyze" text="Upload the IRS notice PDF or paste the text. AI extracts the notice number, deadline, amount, and tax year — and identifies what needs your attention." />
              <ProcessStep number="02" title="Review & draft" text="Add your facts and supporting evidence. Generate a professional response letter addressing the specific notice type and your position." />
              <ProcessStep number="03" title="Mail with proof" text="Approve the exact draft. Certified mail provides tracking and delivery confirmation — your record of timely response to the IRS." />
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section ref={workflowRef} className="border-b border-rule/60" style={{ scrollMarginTop: "80px" }}>
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            {workflowStarted ? (<>
              <Stepper steps={steps} current={state.step} onStep={(i) => update((s) => goToStep(s, definition, i))} />

        <div className="mt-10 envelope-card p-6 md:p-10">
          {/* Step 0: Intro */}
          {state.phase === "intro" && (
            <div>
              <div className="postmark w-fit">1 · Start</div>
              <h2 className="mt-4 font-serif text-4xl">Respond to an IRS notice</h2>
              <p className="mt-3 text-muted-foreground">We'll help you organize the notice, confirm the information, prepare an editable draft, and move toward mailing. Nothing is sent until you review and approve it.</p>
              <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
                <div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div>
                <p className="mt-2">{definition?.ux?.disclaimerText ?? definition?.disclaimer}</p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Upload or identify the notice", "Confirm your facts and objective", "Review and edit the draft", "Choose mailing and send"].map((item, i) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-ink-soft">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper-deep font-mono text-xs text-muted-foreground">{i + 1}</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Document */}
          {state.phase === "document" && (
            <div>

              {llmAnalysis.llmAnalysis && (
                <LLMAnalysisPanel analysis={llmAnalysis.llmAnalysis} provider={llmAnalysis.llmProvider} />
              )}
              {llmAnalysis.llmLoading && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary animate-pulse">✦ AI is analyzing your document…</div>
              )}
              <div className="postmark w-fit">2 · Notice</div>
              <h2 className="mt-4 font-serif text-3xl">Start with the notice</h2>
              <p className="mt-3 text-muted-foreground">Upload the IRS notice when document processing is connected, or identify it here so the workflow can begin.</p>
              <label className="upload-zone mt-6 block cursor-pointer">
                <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span className="mt-3 block font-medium text-foreground">Upload IRS notice</span>
                <span className="mt-1 block text-xs text-muted-foreground">PDF, JPG, or PNG · Secure storage</span>
                <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  if (text && text.length > 20) {
                    const extraction = extractFromText(text);
                    if (extraction.referenceNumber) setFormFields((f) => ({ ...f, noticeNumber: extraction.referenceNumber }));
                    if (extraction.noticeDate) setFormFields((f) => ({ ...f, noticeDate: extraction.noticeDate }));
                  }
                }} />
              </label>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div><label className="input-label">Notice number *</label><input className="input-field" value={formFields.noticeNumber} onChange={(e) => setFormFields((f) => ({ ...f, noticeNumber: e.target.value }))} placeholder="CP2000, CP14, etc." /></div>
                <div><label className="input-label">Notice type</label><input className="input-field" value={formFields.noticeType} onChange={(e) => setFormFields((f) => ({ ...f, noticeType: e.target.value }))} placeholder="Underreported income, balance due, etc." /></div>
                <div><label className="input-label">Notice date</label><input type="date" className="input-field" value={formFields.noticeDate} onChange={(e) => setFormFields((f) => ({ ...f, noticeDate: e.target.value }))} /></div>
                <div><label className="input-label">Response deadline</label><input type="date" className="input-field" value={formFields.responseDeadline} onChange={(e) => setFormFields((f) => ({ ...f, responseDeadline: e.target.value }))} /></div>
                <div><label className="input-label">Tax year</label><input className="input-field" value={formFields.taxYear} onChange={(e) => setFormFields((f) => ({ ...f, taxYear: e.target.value }))} placeholder="2024" /></div>
              </div>
            </div>
          )}

          {/* Step 2: Facts */}
          {state.phase === "facts" && (
            <div>
              <div className="postmark w-fit">3 · Facts</div>
              <h2 className="mt-4 font-serif text-3xl">What facts should the response address?</h2>
              <p className="mt-3 text-muted-foreground">Use your own words. Only include information you can verify.</p>
              <textarea className="input-field mt-6 min-h-48" value={state.userFacts} onChange={(e) => update((s) => setUserFacts(s, e.target.value))} placeholder="Enter the relevant facts you want included in your response..." />
              <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground"><strong>Tip:</strong> Include dates, amounts, notice numbers, and specific requests from the IRS notice.</div>
            </div>
          )}

          {/* Step 3: Objective */}
          {state.phase === "objective" && (
            <div>
              <div className="postmark w-fit">4 · Objective</div>
              <h2 className="mt-4 font-serif text-3xl">What do you want the response to accomplish?</h2>
              <textarea className="input-field mt-6 min-h-40" value={state.userObjective} onChange={(e) => update((s) => setUserObjective(s, e.target.value))} placeholder="Example: I want to explain the discrepancy in my 2024 income reporting and provide corrected documentation..." />
            </div>
          )}

          {/* Step 4: Draft */}
          {state.phase === "draft" && (
            <div>
              <div className="postmark w-fit">5 · Draft</div>
              <h2 className="mt-4 font-serif text-3xl">Your response letter</h2>
              <p className="mt-3 text-muted-foreground">Review every fact, name, date, and statement. This is editable — change anything.</p>
              {state.draftValidation && !state.draftValidation.passed && state.draftValidation.errors > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Validation findings ({state.draftValidation.errors} errors, {state.draftValidation.warnings} warnings)</div>
                  <ul className="mt-2 space-y-1">
                    {state.draftValidation.findings.filter((f) => !f.passed && f.severity === "error").map((f, i) => (
                      <li key={i} className="text-sm text-amber-800">✗ {f.detail}</li>
                    ))}
                  </ul>
                </div>
              )}
              {state.draftValidation?.passed && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">✓ Draft passed validation checks.</div>
              )}
              <textarea className="input-field mt-6 min-h-72 font-mono text-sm leading-6" value={state.draft} onChange={(e) => update((s) => setDraft(s, e.target.value))} />
              <button onClick={generateDraft} className="mt-4 rounded-full border border-rule px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Regenerate draft</button>
            </div>
          )}

          {/* Step 5: Review */}
          {state.phase === "review" && (
            <div>
              <div className="postmark w-fit">6 · Review</div>
              <h2 className="mt-4 font-serif text-3xl">Review before anything is mailed</h2>
              <p className="mt-3 text-muted-foreground">Please confirm each item below.</p>
              <ReviewChecks items={definition?.ux?.reviewChecks ?? []} checks={state.reviewChecks} setChecks={(fn) => update((s) => setReviewChecks(s, fn(state.reviewChecks)))} />
              {state.reviewChecks.every(Boolean) && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">✓ All checks confirmed. You can proceed.</div>
              )}
            </div>
          )}

          {/* Step 6: Attachments */}
          {state.phase === "attachments" && (
            <div>
              <div className="postmark w-fit">7 · Documents</div>
              <h2 className="mt-4 font-serif text-3xl">Add supporting documents</h2>
              <p className="mt-3 text-muted-foreground">Attach any documents referenced in your response — forms, receipts, prior correspondence, etc.</p>
              <label className="upload-zone mt-6 block cursor-pointer">
                <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span className="mt-3 block font-medium text-foreground">Add attachments</span>
                <span className="mt-1 block text-xs text-muted-foreground">Forms, receipts, evidence, prior correspondence</span>
                <input type="file" accept="application/pdf,image/jpeg,image/png" multiple className="sr-only" />
              </label>
            </div>
          )}

          {/* Step 7: Recipient */}
          {state.phase === "recipient" && (
            <div>
              <div className="postmark w-fit">8 · Recipient</div>
              <h2 className="mt-4 font-serif text-3xl">Where should we send it?</h2>
              <p className="mt-3 text-muted-foreground">Enter the IRS mailing address from the notice.</p>
              <RecipientForm
                recipient={state.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }}
                setRecipient={(fn) => update((s) => setMailing(s, {
                  ...s.mailing ?? { method: "certified", status: "not_started" },
                  recipient: fn(s.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }),
                }))}
                orgPlaceholder="IRS — Department of the Treasury"
              />
            </div>
          )}

          {/* Step 8: Mailing */}
          {state.phase === "mailing" && (
            <div>
              <div className="postmark w-fit">9 · Mail</div>
              <h2 className="mt-4 font-serif text-3xl">Choose your mail type</h2>
              <p className="mt-3 text-muted-foreground">For IRS responses, Certified mail is recommended for proof of timely submission.</p>
              <MailOptions selected={state.mailing?.method ?? "certified"} onSelect={(id) => update((s) => setMailing(s, {
                ...s.mailing ?? { recipient: { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }, status: "not_started" },
                method: id,
              }))} />
            </div>
          )}

          {/* Step 9: Checkout */}
          {state.phase === "checkout" && (
            <div>
              <div className="postmark w-fit">10 · Checkout</div>
              <h2 className="mt-4 font-serif text-3xl">Review and pay</h2>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Mail type</span>
                  <span className="font-medium">{MAIL_OPTIONS.find((m) => m.id === (state.mailing?.method ?? "certified"))?.label}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-medium">{state.mailing?.recipient.name || "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Notice number</span>
                  <span className="font-medium">{formFields.noticeNumber || "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border-2 border-stamp/40 bg-stamp/5 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-serif text-lg">{MAIL_OPTIONS.find((m) => m.id === (state.mailing?.method ?? "certified"))?.price}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">By proceeding, you confirm that you have reviewed the response draft and all information. Your mailing will be prepared through the MailMyPDF integration.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <button onClick={back} disabled={state.step === 0} className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30">← Back</button>
            <button onClick={next} disabled={!stepOk} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:transform-none disabled:shadow-none">
              {state.phase === "checkout" ? "Pay and send" : "Continue"} →
            </button>
          </div>
        </div>
            </>) : (
              <div className="text-center py-16">
                <button onClick={startWorkflow} className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                  Start your response
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* TRUST BAND */}
        <section className="border-y border-rule/60 bg-ink text-paper">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="inline-flex items-center gap-0.4rem border border-stamp/40 px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-stamp rounded-full">Trust architecture</div>
            <h2 className="mt-5 font-serif text-3xl text-paper">You stay in control of every step.</h2>
            <p className="mt-4 text-base leading-7 text-paper/70">The notice is the source material. Your facts remain under your control. AI assists — it does not decide. You review the response before approval. Approval applies to the exact draft. Payment is distinct from authorization. Mailing creates a documented record.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <TrustItem title="Your data, your control" text="Documents are processed for extraction. Nothing is shared with third parties." />
              <TrustItem title="Review before send" text="You approve the exact letter. Nothing is mailed without your explicit confirmation." />
              <TrustItem title="Proof of delivery" text="Certified mail provides tracking and delivery confirmation — your record of timely response." />
            </div>
          </div>
        </section>

        {/* RELATED */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Related workflows</div>
            <h2 className="mt-3 font-serif text-2xl">Specific IRS notice types</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <RelatedCard href="/workflows/cp2000-response" title="CP2000 - Proposed Adjustment" desc="Income reporting discrepancy notice" />
              <RelatedCard href="/workflows/cp14-response" title="CP14 - Balance Due" desc="First IRS collection notice" />
              <RelatedCard href="/workflows/cp504-response" title="CP504 - Intent to Levy" desc="Urgent notice before enforcement action" />
            </div>
            <div className="mt-6"><Link to="/workflows" className="text-sm text-stamp hover:text-ink transition-colors">Browse all notice types →</Link></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper p-3 text-center">
      <div className="font-serif text-lg text-ink">{value}</div>
      <div className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div>
      <div className="font-mono text-xs font-semibold text-stamp">{number}</div>
      <h3 className="mt-2 font-serif text-xl text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{text}</p>
    </div>
  );
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-paper/15 p-4">
      <h3 className="font-medium text-paper">{title}</h3>
      <p className="mt-1.5 text-sm text-paper/60">{text}</p>
    </div>
  );
}

function RelatedCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link to={href} className="block rounded-lg border border-rule/60 bg-card p-4 transition-colors hover:border-stamp/40">
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}
