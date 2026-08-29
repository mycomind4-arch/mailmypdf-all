import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
  const llmAnalysis = useCombinedAnalysis("cp523-response");
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
import { extractCP523, generateCP523Draft, type CP523Extraction } from "@/domain/cp523";
import { validateDraft } from "@/domain/draft-validator";
import { recommendStrategies, STRATEGY_TYPE_LABELS } from "@/domain/strategy";
import { detectContradictions, contradictionSummary } from "@/domain/contradiction";
import { detectMissingInfo, missingInfoSummary } from "@/domain/missing-info";
// Security
import { classifyContent, validateTextInput, validateFilename, validateFileSize, validateMimeType } from "@/domain/security";
// Import the domain pack (registers with factory)
import "@/domain/cp523-packs";

import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { LLMAnalysisPanel } from "@/components/llm-analysis-panel";
import { FAQSection } from "@/components/faq-section";
import { getWorkflowSEO } from "@/domain/workflow-seo";
export const Route = createFileRoute("/workflows/cp523-response")({
  head: () => createWorkflowHead("cp523-response"),
  component: CP523Response,
});

function CP523Response() {
  const definition = getWorkflowById("cp523-response")!;
  const steps = definition.ux?.steps ?? [];
  const [state, setState] = useState<WorkflowState>(() => createWorkflowState(definition));
  const [cp523Extraction, setCP523Extraction] = useState<CP523Extraction | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mailingFunnelState, setMailingFunnelState] = useState<MailingFunnelState | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const workflowRef = useRef<HTMLDivElement>(null);

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => {
      workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const update = (fn: (s: WorkflowState) => WorkflowState) => setState(fn);

  // ── Document upload and extraction ──
  const handleFileUpload = useCallback(async (file: File) => {
    update((s) => setProcessing(s, true));
    setExtractionError(null);

    try {
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
      if (file.type === "application/pdf") {
        try {
          const buffer = await file.arrayBuffer();
          const decoder = new TextDecoder("latin1");
          const raw = decoder.decode(buffer);
          const textMatches = raw.match(/\(([^)]+)\)/g);
          if (textMatches) {
            text = textMatches.map(m => m.slice(1, -1)).join(" ");
          }
        } catch { text = ""; }
      } else if (file.type.startsWith("image/")) {
        text = "";
      } else {
        text = await file.text();
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

        const extraction = extractCP523(text);
        setCP523Extraction(extraction);

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

    const extraction = extractCP523(sanitizedText);
    setCP523Extraction(extraction);

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
    const draft = generateCP523Draft({
      noticeNumber: cp523Extraction?.noticeNumber ?? "",
      taxYearsCovered: cp523Extraction?.taxYearsCovered ?? [],
      noticeDate: cp523Extraction?.noticeDate ?? null,
      responseDeadline: cp523Extraction?.responseDeadline ?? null,
      cdpHearingDeadline: cp523Extraction?.cdpHearingDeadline ?? null,
      terminationDate: cp523Extraction?.terminationDate ?? null,
      installmentAgreementNumber: cp523Extraction?.installmentAgreementNumber ?? null,
      defaultReason: cp523Extraction?.defaultReason ?? null,
      userFacts: state.userFacts,
      userObjective: state.userObjective,
    });

    update((s) => setDraft(s, draft));

    const validation = validateDraft(draft, state.extractedFacts, definition, {
      expectedNoticeNumber: cp523Extraction?.noticeNumber ?? undefined,
      expectedDeadline: cp523Extraction?.responseDeadline ?? undefined,
    });
    update((s) => setDraftValidation(s, validation));
  }, [cp523Extraction, state.userFacts, state.userObjective, state.extractedFacts, definition, update]);

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
              <span className="text-ink-soft">CP523 Response</span>
            </nav>
            <div className="postmark w-fit mt-6">IRS Notice · CP523</div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
              Respond to your <span className="italic text-stamp">CP523 notice</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              The IRS is proposing to terminate your installment agreement because you missed a payment. You have the right to appeal before the agreement is cancelled. Upload the notice, verify the default details, and prepare a response to request reinstatement.
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
              <KeyFact label="Notice type" value="Default Warning" />
              <KeyFact label="Your right" value="Appeal (CAP)" />
              <KeyFact label="Cost to prepare" value="Free" />
            </div>
          </div>
        </section>

        {/* ── WHAT IS CP523 ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Understanding the notice</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">What is a CP523 notice?</h2>
            <div className="mt-6 space-y-4 text-base leading-7 text-ink-soft">
              <p>A CP523 is an <strong className="text-ink">Installment Agreement Default Notice</strong>. The IRS sends it when you've missed a payment on your installment agreement (Form 9465). The notice proposes to terminate the agreement — and with it, the protections that kept collection actions at bay.</p>
              <p>You have the right to <strong className="text-ink">appeal the proposed termination</strong> by requesting a Collection Appeals Program (CAP) hearing. This is faster than a CDP hearing and can result in the agreement being reinstated, modified, or continued. You must request the appeal within 30 days of the notice.</p>
              <p>If the agreement is terminated, the IRS can resume full collection activity — levies, liens, and wage garnishment. Any unpaid balance becomes immediately due. Responding promptly is critical: if you can make the missed payment, the IRS will often reinstate the agreement without a formal appeal.</p>
            </div>
            <div className="mt-8 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-stamp">What a CP523 includes</div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {["Notice number and date","Installment agreement details","Missed payment information","Total remaining balance","30-day appeal deadline","Right to CAP appeal","IRS response address","Reinstatement instructions"].map((item) => (
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
              <ProcessStep number="01" title="Upload & analyze" text="Upload the CP523 PDF or paste the text. The system extracts the notice details, missed payment info, and remaining balance — and identifies your right to appeal." />
              <ProcessStep number="02" title="Review & draft" text="See the extracted facts. Add your explanation for the missed payment and any supporting evidence. Generate a response requesting reinstatement or a CAP appeal." />
              <ProcessStep number="03" title="Mail with proof" text="Approve the exact draft. Certified mail provides proof of timely appeal — essential for preserving your rights before the 30-day deadline expires." />
            </div>
          </div>
        </section>

        {/* ── WORKFLOW ── */}
        <section ref={workflowRef} className="border-b border-rule/60" style={{ scrollMarginTop: "80px" }}>
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            {workflowStarted ? (<>
              {securityWarning && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                  {securityWarning}
                </div>
              )}
              <Stepper steps={steps} current={state.phase} />

        {/* Document upload */}
        {state.phase === "document" && (
          <div className="mt-6 space-y-4">
            <div
              className="rounded-lg border-2 border-dashed border-border p-8 text-center"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <p className="text-sm text-muted-foreground">Click to upload your CP523 notice (PDF, image, or text)</p>
            </div>

            {state.processing && <p className="text-sm text-muted-foreground">Processing…</p>}
            {extractionError && <p className="text-sm text-red-600">{extractionError}</p>}

            {cp523Extraction && (
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <h3 className="font-semibold">Extracted Information</h3>
                {cp523Extraction.noticeNumber && <p className="text-sm">Notice: {cp523Extraction.noticeNumber}</p>}
                {cp523Extraction.noticeDate && <p className="text-sm">Date: {cp523Extraction.noticeDate}</p>}
                {cp523Extraction.balanceDue && <p className="text-sm">Balance Due: {cp523Extraction.balanceDue}</p>}
                {cp523Extraction.totalDue && <p className="text-sm">Total Due: {cp523Extraction.totalDue}</p>}
                {cp523Extraction.installmentAgreementNumber && <p className="text-sm">IA Number: {cp523Extraction.installmentAgreementNumber}</p>}
                {cp523Extraction.defaultReason && <p className="text-sm">Default Reason: {cp523Extraction.defaultReason}</p>}
                {cp523Extraction.terminationDate && <p className="text-sm">Termination Date: {cp523Extraction.terminationDate}</p>}
                {cp523Extraction.cdpRightsNotice && <p className="text-sm text-amber-600">CDP hearing rights detected</p>}
                {cp523Extraction.passportCertification && <p className="text-sm text-amber-600">Passport certification detected</p>}
                {cp523Extraction.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {cp523Extraction.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-600">{w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <textarea
              className="w-full rounded-lg border p-3 text-sm"
              placeholder="Or paste the notice text here…"
              rows={5}
              onChange={(e) => {
                if (e.target.value.length > 50) handlePasteText(e.target.value);
              }}
            />
          </div>
        )}

        {/* Facts */}
        {state.phase === "facts" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Your Facts</h2>
            <p className="text-sm text-muted-foreground">What facts are relevant to your response? Include any payment history, installment agreement details, or corrections.</p>
            <textarea
              className="w-full rounded-lg border p-3 text-sm"
              rows={6}
              value={state.userFacts ?? ""}
              onChange={(e) => update((s) => setUserFacts(s, e.target.value))}
            />
          </div>
        )}

        {/* Objective */}
        {state.phase === "objective" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Your Objective</h2>
            <p className="text-sm text-muted-foreground">What do you want to achieve? (e.g., reinstate the installment agreement, request a CDP hearing, dispute the balance)</p>
            <textarea
              className="w-full rounded-lg border p-3 text-sm"
              rows={4}
              value={state.userObjective ?? ""}
              onChange={(e) => update((s) => setUserObjective(s, e.target.value))}
            />
          </div>
        )}

        {/* Draft */}
        {state.phase === "draft" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Response Draft</h2>
            {state.draft ? (
              <pre className="whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm">{state.draft}</pre>
            ) : (
              <>
              <button
                onClick={async () => {
                  if (llmAnalysis.llmAnalysis) {
                    const res = await fetch('/api/workflows/draft', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workflowId: 'cp523-response', analysis: llmAnalysis.llmAnalysis, userFacts: state.userFacts, userObjective: state.userObjective, documentText: state.upload?.rawText }),
                    });
                    if (res.ok) { const data = await res.json(); update((s) => setDraft(s, data.draft)); if (data.validation) update((s) => setDraftValidation(s, data.validation)); }
                  }
                }}
                disabled={!llmAnalysis.llmAnalysis}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30"
              >✦ Generate with AI</button>
              <button onClick={handleGenerateDraft} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Generate Draft</button>
              </>
            )}
          </div>
        )}

        {/* Review */}
        {state.phase === "review" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Review</h2>
            <ReviewChecks
              checks={definition.ux?.reviewChecks ?? []}
              onChange={(checked) => update((s) => setReviewChecks(s, checked))}
            />
          </div>
        )}

        {/* Attachments / Recipient / Mailing / Checkout / Done */}
        {state.phase === "attachments" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Attachments</h2>
            <p className="text-sm text-muted-foreground">Attach supporting documents: installment agreement, payment records, tax returns, Form 433-F.</p>
          </div>
        )}
        {state.phase === "recipient" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Recipient</h2>
            <RecipientForm onChange={(recipient) => update((s) => setMailing(s, { recipient }))} />
          </div>
        )}
        {state.phase === "mailing" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Mail Options</h2>
            <MailOptions options={definition.ux?.mailOptions ?? MAIL_OPTIONS} onSelect={(option) => update((s) => setMailing(s, { mailOption: option }))} />
          </div>
        )}
        {state.phase === "checkout" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Checkout</h2>
            <MailingFunnel state={mailingFunnelState} onChange={setMailingFunnelState} />
          </div>
        )}
        {state.phase === "done" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Complete</h2>
            <p className="text-sm text-muted-foreground">Your response has been prepared. Review and confirm before mailing.</p>
          </div>
        )}

              {/* Navigation */}
              <div className="mt-8 flex justify-between">
                <button onClick={back} className="rounded-lg border px-4 py-2 text-sm">Back</button>
                <button onClick={next} disabled={!canContinue} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
                  {state.phase === "done" ? "Finish" : "Continue"}
                </button>
              </div>

              {/* Disclaimer */}
              <p className="mt-8 text-xs text-muted-foreground">{definition.ux?.disclaimerText ?? definition.disclaimer}</p>
            </> ) : (
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
              <TrustItem title="Proof of delivery" text="Certified mail provides tracking and delivery confirmation — your proof of timely appeal." />
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
              <RelatedCard href="/workflows/cp504-response" title="CP504 — Intent to Levy" desc="Urgent notice before enforcement action" />
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
