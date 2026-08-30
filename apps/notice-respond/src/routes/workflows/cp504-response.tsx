import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
  const llmAnalysis = useCombinedAnalysis("cp504-response");
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Stepper, MailOptions, RecipientForm, ReviewChecks, MAIL_OPTIONS } from "@/components/workflow-shell";
import { MailingFunnel, type MailingFunnelState } from "@/components/mailing-funnel";
import { getWorkflowById } from "@/domain/workflow-catalog";
import {
  createWorkflowState, advanceStep, retreatStep, goToStep, canAdvance,
  setUpload, setExtraction, setProcessing, setUserFacts, setUserObjective,
  setDraft, setDraftValidation, setReviewChecks, setMailing,
  type WorkflowState, type DocumentUpload,
} from "@/domain/workflow-runtime";
import { classifyNoticeType, NOTICE_TYPE_META } from "@/domain/notice-type";
import { extractCP504, generateCP504Draft, type CP504Extraction } from "@/domain/cp504";
import { validateDraft } from "@/domain/draft-validator";
import { recommendStrategies, STRATEGY_TYPE_LABELS } from "@/domain/strategy";
import { detectContradictions, contradictionSummary } from "@/domain/contradiction";
import { detectMissingInfo, missingInfoSummary } from "@/domain/missing-info";
// Security
import { classifyContent, validateTextInput, validateFilename, validateFileSize, validateMimeType } from "@/domain/security";

import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { LLMAnalysisPanel } from "@/components/llm-analysis-panel";
import { FAQSection } from "@/components/faq-section";
import { getWorkflowSEO } from "@/domain/workflow-seo";
import { handleDocumentUpload } from "@/platform/upload-handler";
export const Route = createFileRoute("/workflows/cp504-response")({
  head: () => createWorkflowHead("cp504-response"),
  component: CP504Response,
});

function CP504Response() {
  const definition = getWorkflowById("cp504-response")!;
  const steps = definition.ux?.steps ?? [];
  const [state, setState] = useState<WorkflowState>(() => createWorkflowState(definition));
  const [cp504Extraction, setCP504Extraction] = useState<CP504Extraction | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mailingFunnelState, setMailingFunnelState] = useState<MailingFunnelState | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const workflowRef = useRef<HTMLDivElement>(null);

  const update = (fn: (s: WorkflowState) => WorkflowState) => setState(fn);

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => {
      workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  // ── Document upload and extraction ──
  const handleFileUpload = useCallback(async (file: File) => {
    update((s) => setProcessing(s, true));
    setExtractionError(null);

    try {
      // Security validation
      const fileValidation = validateFilename(file.name);
      if (!fileValidation.valid) {
        setExtractionError("File validation failed: " + fileValidation.errors.join(", "));
        return;
      }
      const sizeValidation = validateFileSize(file.size);
      if (!sizeValidation.valid) {
        setExtractionError(sizeValidation.error ?? "File size validation failed");
        return;
      }
      const mimeValidation = validateMimeType(file.type);
      if (!mimeValidation.valid) {
        setExtractionError(mimeValidation.error ?? "File type not allowed");
        return;
      }

      let text = "";
      const uploadResult = await handleDocumentUpload(file);
      if (uploadResult.error) {
        setExtractionError(uploadResult.error);
        return;
      }
      if (uploadResult.ocrRequired) {
        setExtractionError("We could not reliably extract text from this document. It appears to be a scanned image. Please provide a text-based PDF.");
        return;
      }
      text = uploadResult.text;
      if (uploadResult.securityWarning) {
        setSecurityWarning(uploadResult.securityWarning);
      } else {
        setSecurityWarning(null);
      }

      const upload: DocumentUpload = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        rawText: text,
        uploadedAt: new Date().toISOString(),
      };

      update((s) => setUpload(s, upload));

      if (text && text.length > 20) {
        const contentClassification = classifyContent(text);
        if (contentClassification.detectedInjectionPatterns.length > 0) {
          setSecurityWarning("Security notice: " + contentClassification.detectedInjectionPatterns.length + " potential prompt injection pattern(s) detected. Content treated as DATA, not instructions.");
        } else {
          setSecurityWarning(null);
        }
        const textValidation = validateTextInput(text);
        text = textValidation.sanitized;

        const extraction = extractCP504(text);
        setCP504Extraction(extraction);

        const classification = classifyNoticeType(text);
        update((s) => setExtraction(s, {
          noticeType: classification.type,
          classificationConfidence: classification.confidence,
          facts: extraction.facts,
          deadlines: [],
          agency: "IRS",
          referenceNumber: extraction.noticeNumber ?? undefined,
          noticeDate: extraction.noticeDate ?? undefined,
          rawText: text,
          extractionConfidence: extraction.classificationConfidence,
        }));
      }
    } catch (err) {
      setExtractionError("Failed to process document: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      update((s) => setProcessing(s, false));
    }
  }, [update]);

  const handlePasteText = useCallback((text: string) => {
    const contentClassification = classifyContent(text);
    if (contentClassification.detectedInjectionPatterns.length > 0) {
      setSecurityWarning("Security notice: " + contentClassification.detectedInjectionPatterns.length + " potential prompt injection pattern(s) detected. Content treated as DATA, not instructions.");
    } else {
      setSecurityWarning(null);
    }
    const textValidation = validateTextInput(text);
    const sanitizedText = textValidation.sanitized;

    const upload: DocumentUpload = {
      fileName: "Pasted text",
      fileSize: sanitizedText.length,
      fileType: "text/plain",
      rawText: sanitizedText,
      uploadedAt: new Date().toISOString(),
    };
    update((s) => setUpload(s, upload));

    const extraction = extractCP504(sanitizedText);
    setCP504Extraction(extraction);

    const classification = classifyNoticeType(sanitizedText);
    update((s) => setExtraction(s, {
      noticeType: classification.type,
      classificationConfidence: classification.confidence,
      facts: extraction.facts,
      deadlines: [],
      agency: "IRS",
      referenceNumber: extraction.noticeNumber ?? undefined,
      noticeDate: extraction.noticeDate ?? undefined,
      rawText: sanitizedText,
      extractionConfidence: extraction.classificationConfidence,
    }));

    // LLM-powered analysis (alongside deterministic)
    llmAnalysis.analyzeWithLLM(file, text);
    }, [update, llmAnalysis]);

  // ── Draft generation ──
  const handleGenerateDraft = useCallback(() => {
    const draft = generateCP504Draft({
      noticeNumber: cp504Extraction?.noticeNumber ?? "",
      taxYear: cp504Extraction?.taxYear ?? null,
      noticeDate: cp504Extraction?.noticeDate ?? null,
      responseDeadline: cp504Extraction?.responseDeadline ?? null,
      cdpHearingDeadline: cp504Extraction?.cdpHearingDeadline ?? null,
      userFacts: state.userFacts,
      userObjective: state.userObjective,
    });

    update((s) => setDraft(s, draft));

    const validation = validateDraft(draft, state.extractedFacts, definition, {
      expectedNoticeNumber: cp504Extraction?.noticeNumber ?? undefined,
      expectedTaxYear: cp504Extraction?.taxYear ?? undefined,
      expectedDeadline: cp504Extraction?.responseDeadline ?? undefined,
    });
    update((s) => setDraftValidation(s, validation));
  }, [cp504Extraction, state.userFacts, state.userObjective, state.extractedFacts, definition, update]);

  // ── Step navigation ──
  const canContinue = canAdvance(state, definition);

  const next = () => {
    if (state.phase === "draft" && !state.draft) {
      handleGenerateDraft();
    }
    if (state.phase === "checkout" || state.phase === "submitted") return;
    update((s) => advanceStep(s, definition));
  };

  const back = () => update((s) => retreatStep(s, definition));

  // ── Analysis helpers ──
  const contradictions = state.extraction ? detectContradictions(state.extractedFacts, state.evidence) : [];
  const missingInfo = state.extraction ? detectMissingInfo(state.extractedFacts, state.deadline ?? null, state.evidence) : [];
  const strategies = state.extraction ? recommendStrategies(state.extraction.noticeType) : [];

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden border-b border-rule/60">
          <div className="absolute inset-0 bg-gradient-to-b from-paper-deep/40 via-paper to-paper" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 md:py-28">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-stamp transition-colors">Notice Respond</Link>
              <span className="text-rule">/</span>
              <Link to="/workflows" className="hover:text-stamp transition-colors">Workflows</Link>
              <span className="text-rule">/</span>
              <span className="text-ink-soft">CP504 Response</span>
            </nav>
            <div className="postmark w-fit mt-6">IRS Notice · CP504</div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
              Respond to your <span className="italic text-stamp">CP504 notice</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              The IRS is notifying you of its intent to levy. This is urgent — after 30 days, the IRS can seize your property, wages, or bank accounts. Upload the notice, verify the amount, and prepare a response to request a Collection Due Process hearing before enforcement begins.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={startWorkflow}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5"
              >
                Start your response
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3.5 text-sm font-medium transition-colors hover:border-ink/30">
                Browse other notices
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule/60 bg-rule/60 sm:grid-cols-4">
              <KeyFact label="Response window" value="30 days" />
              <KeyFact label="Notice type" value="Intent to Levy" />
              <KeyFact label="Your right" value="CDP Hearing" />
              <KeyFact label="Cost to prepare" value="Free" />
            </div>
          </div>
        </section>

        {/* ── WHAT IS CP504 ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Understanding the notice</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">What is a CP504 notice?</h2>
            <div className="mt-6 space-y-4 text-base leading-7 text-ink-soft">
              <p>A CP504 is an <strong className="text-ink">Intent to Levy</strong> notice. It's the IRS's final warning before seizing your property to satisfy an unpaid tax debt. After 30 days from the notice date, the IRS can levy your bank accounts, garnish your wages, or seize other assets — without further notice.</p>
              <p>You have the right to request a <strong className="text-ink">Collection Due Process (CDP) hearing</strong> by filing Form 12153. This hearing gives you the opportunity to propose alternatives: an installment agreement, an offer in compromise, or to challenge the validity of the debt. Requesting the hearing automatically stops collection action until the IRS makes a determination.</p>
              <p>If you miss the 30-day window, you lose your right to a CDP hearing. You can still request an <strong className="text-ink">Equivalent Hearing</strong> within one year, but the IRS can continue collection during that process. Act immediately — this is the most time-sensitive notice in the IRS collection sequence.</p>
            </div>
            <div className="mt-8 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-stamp">What a CP504 includes</div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {["Notice number and date","Total balance due","Tax years included","30-day deadline for CDP request","Right to Collection Due Process hearing","Levy warning (wages, bank, property)","IRS payment address","Form 12153 reference"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-ink-soft"><span className="text-stamp">▸</span>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">The process</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">How Notice Respond works</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <ProcessStep number="01" title="Upload & analyze" text="Upload the CP504 PDF or paste the text. The system extracts the deadline, balance due, and levy warning — and identifies your right to a Collection Due Process hearing." />
              <ProcessStep number="02" title="Review & draft" text="See the extracted facts and deadline. Add your supporting evidence. Generate a response requesting a CDP hearing or proposing an installment agreement or offer in compromise." />
              <ProcessStep number="03" title="Mail with proof" text="Approve the exact draft. Certified mail provides the tracking number you need as proof of timely CDP request — critical for preserving your hearing rights." />
            </div>
          </div>
        </section>

        {/* ── WORKFLOW ── */}
        <section ref={workflowRef} className="border-b border-rule/60" style={{ scrollMarginTop: "80px" }}>
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            {workflowStarted ? (<>
              <Stepper steps={steps} current={state.step} onStep={(i) => update((s) => goToStep(s, definition, i))} />
              <div className="mt-10 envelope-card p-6 md:p-10">
          {/* ── Step 0: Intro ── */}
          {state.phase === "intro" && (
            <div>
              <div className="postmark w-fit">1 · Start</div>
              <h2 className="mt-4 font-serif text-4xl">Respond to your CP504 notice</h2>
              <p className="mt-3 text-muted-foreground">
                A CP504 is a Notice of Intent to Levy from the IRS. It means the IRS plans to seize your assets (bank accounts, wages, or property) to satisfy an unpaid tax balance. You have 30 days to request a Collection Due Process (CDP) hearing. This workflow helps you organize the notice, verify the balance, and prepare a response.
              </p>
              <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                <div className="font-mono text-xs uppercase tracking-widest">Urgent</div>
                <p className="mt-1">The CP504 has a strict 30-day deadline for requesting a CDP hearing. Do not delay — if you miss this deadline, the IRS can proceed with the levy.</p>
              </div>
              <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
                <div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div>
                <p className="mt-2">{definition.ux?.disclaimerText ?? definition.disclaimer}</p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Upload the CP504 notice", "Review the CDP hearing deadline and levy type", "Verify the balance due", "Add your facts and evidence", "Prepare and mail your response"].map((item, i) => (
                  <div key={i} className="rounded-lg border border-rule/60 p-3 text-sm text-muted-foreground">
                    <span className="font-mono text-xs text-stamp">{i + 1}</span> {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Document ── */}
          {state.phase === "document" && (
            <div>
              <div className="postmark w-fit">2 · Upload</div>
              <h2 className="mt-4 font-serif text-3xl">Upload your CP504 notice</h2>
              <p className="mt-3 text-muted-foreground">Upload a PDF or image of your CP504 notice, or paste the text content directly.</p>
              <label className="upload-zone mt-6 block cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f); }}>
                <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span className="mt-3 block font-medium text-foreground">Upload CP504 notice</span>
                <span className="mt-1 block text-xs text-muted-foreground">PDF, JPG, or PNG · Text is extracted for your review</span>
                <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />
              </label>

              {state.isProcessing && (
                <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-stamp border-t-transparent" />
                    <span className="text-muted-foreground">Processing document…</span>
                  </div>
                </div>
              )}

              {extractionError && (
                <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{extractionError}</div>
              )}

              {securityWarning && (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                  <span className="font-medium">⚠ Security:</span> {securityWarning}
                </div>
              )}

              <div className="mt-6 border-t border-rule/60 pt-4">
                <label className="input-label">Or paste notice text</label>
                <textarea className="input-field mt-2 min-h-32 font-mono text-sm" placeholder="Paste the text content of your CP504 notice here…" onChange={(e) => { if (e.target.value.length > 50) handlePasteText(e.target.value); }} />
              </div>
            </div>
          )}

          {/* ── Step 2: Extraction Review ── */}
          {state.phase === "extraction" && (
            <div>

              {llmAnalysis.llmAnalysis && (
                <LLMAnalysisPanel analysis={llmAnalysis.llmAnalysis} provider={llmAnalysis.llmProvider} />
              )}
              {llmAnalysis.llmLoading && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary animate-pulse">✦ AI is analyzing your document…</div>
              )}
              <div className="postmark w-fit">3 · Review</div>
              <h2 className="mt-4 font-serif text-3xl">Review extracted information</h2>
              <p className="mt-3 text-muted-foreground">We extracted the following from your notice. Verify each item — this information will be used to prepare your response.</p>

              {cp504Extraction && (
                <div className="mt-6 space-y-4">
                  {/* Classification */}
                  <div className="rounded-lg border border-rule/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Document Classification</span>
                      <span className={"rounded-full px-3 py-1 text-xs font-medium " + (cp504Extraction.isCP504 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                        {cp504Extraction.isCP504 ? "CP504 Confirmed" : "Not confirmed"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Confidence: {(cp504Extraction.classificationConfidence * 100).toFixed(0)}%</p>
                  </div>

                  {/* CDP Rights Alert */}
                  {cp504Extraction.cdpRightsNotice && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Collection Due Process Rights Detected</div>
                      <p className="mt-1 text-sm text-amber-800">This notice includes your right to a CDP hearing. You have 30 days from the notice date to request a hearing.</p>
                    </div>
                  )}

                  {/* Levy Type Alert */}
                  {cp504Extraction.levyType && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-destructive">Levy Type</div>
                      <p className="mt-1 text-sm text-destructive">{cp504Extraction.levyType} — assets may be at risk.</p>
                    </div>
                  )}

                  {/* Warnings */}
                  {cp504Extraction.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Warnings</div>
                      <ul className="mt-2 space-y-1">
                        {cp504Extraction.warnings.map((w, i) => (
                          <li key={i} className="text-sm text-amber-800">⚠ {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Extracted Facts */}
                  {cp504Extraction.facts.length > 0 ? (
                    <div className="rounded-lg border border-rule/60 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-stamp">Extracted Facts</div>
                      <dl className="mt-3 space-y-2">
                        {cp504Extraction.facts.map((fact) => (
                          <div key={fact.id} className="border-b border-rule/30 pb-2 last:border-0">
                            <div className="flex items-start justify-between gap-4">
                              <dt className="text-sm font-medium text-foreground">{fact.label}</dt>
                              <dd className="text-sm text-muted-foreground">{fact.value || "—"}</dd>
                            </div>
                            {fact.sourceExcerpt && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Source: "{fact.sourceExcerpt}" · Method: {fact.extractionMethod}</summary>
                              </details>
                            )}
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-rule/60 p-4 text-sm text-muted-foreground">No structured facts were extracted. You can enter facts manually in the next step.</div>
                  )}

                  {/* Contradictions and Missing Info */}
                  {contradictions.length > 0 && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-destructive">Contradictions</div>
                      <ul className="mt-2 space-y-1">
                        {contradictions.map((c, i) => (<li key={i} className="text-sm text-destructive">⚠ {contradictionSummary([c])}</li>))}
                      </ul>
                    </div>
                  )}

                  {missingInfo.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Missing Information</div>
                      <ul className="mt-2 space-y-1">
                        {missingInfo.slice(0, 5).map((m, i) => (<li key={i} className="text-sm text-amber-800">• {m.label}: {m.description}</li>))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!cp504Extraction && !state.isProcessing && (
                <div className="mt-6 rounded-md border border-rule/60 p-4 text-sm text-muted-foreground">No document has been processed yet. Go back to upload your CP504 notice.</div>
              )}
            </div>
          )}

          {/* ── Step 3: Facts ── */}
          {state.phase === "facts" && (
            <div>
              <div className="postmark w-fit">4 · Facts</div>
              <h2 className="mt-4 font-serif text-3xl">Add your facts</h2>
              <p className="mt-3 text-muted-foreground">Enter the facts that support your response. Include information about your financial situation, prior payments, and any disputes about the balance.</p>
              <textarea className="input-field mt-6 min-h-48" value={state.userFacts} onChange={(e) => update((s) => setUserFacts(s, e.target.value))} placeholder="Example: I have been making monthly payments of $X since [date]. The balance shown on the CP504 does not reflect payments made on [dates]. I am requesting a CDP hearing to discuss an installment agreement based on my current financial situation…" />
              <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground">
                <strong>Tip:</strong> Include specific amounts, dates, payment references, and any prior correspondence with the IRS about this balance.
              </div>
            </div>
          )}

          {/* ── Step 4: Objective ── */}
          {state.phase === "objective" && (
            <div>
              <div className="postmark w-fit">5 · Objective</div>
              <h2 className="mt-4 font-serif text-3xl">What do you want the response to accomplish?</h2>
              <p className="mt-3 text-muted-foreground">State your objective clearly. The most common CP504 responses request a CDP hearing, an installment agreement, or dispute the balance.</p>

              {strategies.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Suggested strategies</div>
                  {strategies.slice(0, 4).map((strat) => (
                    <button key={strat.type} onClick={() => update((s) => setUserObjective(s, STRATEGY_TYPE_LABELS[strat.type] + (strat.reason ? ": " + strat.reason : "")))} className="block w-full rounded-lg border border-rule/60 bg-card p-3 text-left text-sm hover:border-stamp/40 transition-colors">
                      <span className="font-medium text-foreground">{STRATEGY_TYPE_LABELS[strat.type]}</span>
                      {strat.reason && <span className="mt-1 block text-xs text-muted-foreground">{strat.reason}</span>}
                    </button>
                  ))}
                </div>
              )}

              <textarea className="input-field mt-6 min-h-40" value={state.userObjective} onChange={(e) => update((s) => setUserObjective(s, e.target.value))} placeholder="Example: I want to request a Collection Due Process hearing to discuss an installment agreement. I believe the balance is incorrect because…" />
            </div>
          )}

          {/* ── Step 5: Draft ── */}
          {state.phase === "draft" && (
            <div>
              <div className="postmark w-fit">6 · Draft</div>
              <h2 className="mt-4 font-serif text-3xl">Your response letter</h2>
              <p className="mt-3 text-muted-foreground">Review every fact, name, date, and statement. This is editable — change anything. We've validated the draft against the extracted facts.</p>

              {state.draftValidation && !state.draftValidation.passed && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Validation findings ({state.draftValidation.errors} errors, {state.draftValidation.warnings} warnings)</div>
                  <ul className="mt-2 space-y-1">
                    {state.draftValidation.findings.filter((f) => !f.passed).map((f, i) => (
                      <li key={i} className={"text-sm " + (f.severity === "error" ? "text-destructive" : "text-amber-800")}>{f.severity === "error" ? "✗" : "⚠"} {f.detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              {state.draftValidation?.passed && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">✓ Draft passed all validation checks.</div>
              )}

              <textarea className="input-field mt-6 min-h-72 font-mono text-sm leading-6" value={state.draft} onChange={(e) => update((s) => setDraft(s, e.target.value))} />
              <button
                onClick={async () => {
                  if (llmAnalysis.llmAnalysis) {
                    const res = await fetch('/api/workflows/draft', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workflowId: 'cp504-response', analysis: llmAnalysis.llmAnalysis, userFacts: state.userFacts, userObjective: state.userObjective, documentText: state.upload?.rawText }),
                    });
                    if (res.ok) { const data = await res.json(); update((s) => setDraft(s, data.draft)); if (data.validation) update((s) => setDraftValidation(s, data.validation)); }
                  }
                }}
                disabled={!llmAnalysis.llmAnalysis}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30"
              >✦ Generate with AI</button>
              <button onClick={handleGenerateDraft} className="mt-4 rounded-full border border-rule px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Regenerate draft</button>
            </div>
          )}

          {/* ── Step 6: Review ── */}
          {state.phase === "review" && (
            <div>
              <div className="postmark w-fit">7 · Review</div>
              <h2 className="mt-4 font-serif text-3xl">Review before anything is mailed</h2>
              <p className="mt-3 text-muted-foreground">Please confirm each item below.</p>
              <ReviewChecks items={definition.ux?.reviewChecks ?? []} checks={state.reviewChecks} setChecks={(fn) => update((s) => setReviewChecks(s, fn(state.reviewChecks)))} />
              {state.reviewChecks.every(Boolean) && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">✓ All checks confirmed. You can proceed to the next step.</div>
              )}
            </div>
          )}

          {/* ── Step 7: Attachments ── */}
          {state.phase === "attachments" && (
            <div>
              <div className="postmark w-fit">8 · Documents</div>
              <h2 className="mt-4 font-serif text-3xl">Add supporting documents</h2>
              <p className="mt-3 text-muted-foreground">Attach any documents referenced in your response — tax returns, payment records, financial statements, prior correspondence, etc.</p>
              <label className="upload-zone mt-6 block cursor-pointer">
                <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span className="mt-3 block font-medium text-foreground">Add attachments</span>
                <span className="mt-1 block text-xs text-muted-foreground">Forms, receipts, evidence, prior correspondence</span>
                <input type="file" accept="application/pdf,image/jpeg,image/png" multiple className="sr-only" />
              </label>
              <div className="mt-4 text-sm text-muted-foreground">Required evidence: {definition.evidence.filter(e => e.required).map(e => e.label).join(", ")}</div>
            </div>
          )}

          {/* ── Step 8: Recipient ── */}
          {state.phase === "recipient" && (
            <div>
              <div className="postmark w-fit">9 · Recipient</div>
              <h2 className="mt-4 font-serif text-3xl">Where should we send it?</h2>
              <p className="mt-3 text-muted-foreground">Enter the IRS mailing address from the CP504 notice. The response address should be printed on the notice.</p>
              {cp504Extraction?.responseAddress && (
                <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground"><strong>Extracted address:</strong> {cp504Extraction.responseAddress}</div>
              )}
              <RecipientForm recipient={state.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }} setRecipient={(fn) => update((s) => setMailing(s, { ...s.mailing ?? { method: "certified", recipient: fn({ name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }), status: "not_started" }, recipient: fn(s.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }) }))} orgPlaceholder="IRS — Department of the Treasury" />
            </div>
          )}

          {/* ── Step 9: Mailing ── */}
          {state.phase === "mailing" && (
            <div>
              <div className="postmark w-fit">10 · Mail</div>
              <h2 className="mt-4 font-serif text-3xl">Choose your mail type</h2>
              <p className="mt-3 text-muted-foreground">For IRS CDP hearing requests, Certified mail is strongly recommended for proof of timely submission.</p>
              <MailOptions selected={state.mailing?.method ?? "certified"} onSelect={(id) => update((s) => setMailing(s, { ...s.mailing ?? { recipient: { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }, status: "not_started" }, method: id }))} />
            </div>
          )}

          {/* ── Step 10: Checkout + Done (MailingFunnel) ── */}
          {(state.phase === "checkout" || state.phase === "submitted") && (
            <MailingFunnel draft={state.draft} workflowId={definition.id} workflowTitle={definition.title} recipient={state.mailing?.recipient ?? null} extractionRef={cp504Extraction?.noticeNumber ?? null} taxYear={cp504Extraction?.taxYear ?? null} mailOptions={definition.ux?.mailOptions ?? MAIL_OPTIONS} disclaimer={definition.ux?.disclaimerText ?? definition.disclaimer} onMailingStateChange={(s) => { setMailingFunnelState(s); if (s.phase === "submitted") { update((st) => setMailing(st, { method: s.method, recipient: s.recipient, status: "submitted", providerOrderId: s.providerOrderId ?? undefined, trackingNumber: s.trackingNumber ?? undefined })); } }} />
          )}

          {/* ── Navigation ── */}
          {state.phase !== "checkout" && state.phase !== "submitted" && (
            <div className="mt-8 flex items-center justify-between">
              <button onClick={back} disabled={state.step === 0} className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30">← Back</button>
              <button onClick={next} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:transform-none disabled:shadow-none">{state.phase === "checkout" ? "Pay and send" : "Continue"} →</button>
            </div>
          )}

        </div>
            </>) : (
              <div className="text-center py-16">
                <button onClick={startWorkflow} className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                  Start your response
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── FAQ ── */}
        {definition.seo?.faq && (
          <section className="border-b border-rule/60">
            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
              <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Questions & answers</div>
              <h2 className="mt-3 font-serif text-2xl">Frequently asked questions</h2>
              <div className="mt-6 space-y-4">
                {definition.seo.faq.map((item, i) => (
                  <div key={i} className="rounded-xl border border-rule bg-card p-5">
                    <h3 className="font-medium text-foreground">{item.question}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── TRUST BAND ── */}
        <section className="border-y border-rule/60 bg-ink text-paper">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="inline-flex items-center gap-0.4rem border border-stamp/40 px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-stamp rounded-full">Trust architecture</div>
            <h2 className="mt-5 font-serif text-3xl text-paper">You stay in control of every step.</h2>
            <p className="mt-4 text-base leading-7 text-paper/70">The notice is the source material. Your facts remain under your control. AI assists — it does not decide. You review the response before approval. Approval applies to the exact draft. Payment is distinct from authorization. Mailing creates a documented record.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <TrustItem title="Your data, your control" text="Documents are processed for extraction. Nothing is shared with third parties." />
              <TrustItem title="Review before send" text="You approve the exact letter. Nothing is mailed without your explicit confirmation." />
              <TrustItem title="Proof of delivery" text="Certified mail provides tracking and delivery confirmation — your proof of timely CDP request." />
            </div>
          </div>
        </section>

        {/* ── RELATED NOTICES ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Related workflows</div>
            <h2 className="mt-3 font-serif text-2xl">Other IRS notice types</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <RelatedCard href="/workflows/cp14-response" title="CP14 — Balance Due" desc="First collection notice for unpaid taxes" />
              <RelatedCard href="/workflows/cp2000-response" title="CP2000 — Proposed Adjustment" desc="Income reporting discrepancy notice" />
              <RelatedCard href="/workflows/cp523-response" title="CP523 — Installment Default" desc="Missed payment plan notice" />
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
