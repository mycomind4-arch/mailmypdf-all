import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
  const llmAnalysis = useCombinedAnalysis("cp14-response");
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
import { extractCP14, generateCP14Draft, type CP14Extraction } from "@/domain/cp14";
import { validateDraft } from "@/domain/draft-validator";
import { recommendStrategies, STRATEGY_TYPE_LABELS } from "@/domain/strategy";
import { detectContradictions, contradictionSummary } from "@/domain/contradiction";
import { detectMissingInfo, missingInfoSummary } from "@/domain/missing-info";

// Gold-standard CP14 intelligence
import { analyzeCP14Discrepancies, type CP14DiscrepancyResult } from "@/domain/cp14-discrepancy";
import { buildCP14EvidenceChecklist, type CP14EvidenceChecklistResult } from "@/domain/cp14-evidence";
import { generateCP14Strategy, CP14_STRATEGY_POSITION_LABELS, type CP14ResponseStrategy } from "@/domain/cp14-strategy";
import { validateCP14Draft } from "@/domain/cp14-validation";
import { createCP14Case, setCP14CaseAnalysis, setCP14CaseStrategy, setCP14CaseDraft, setCP14CaseValidation, setCP14CaseUserInput, setCP14CaseResearch, type CP14Case } from "@/domain/cp14-case";
import { getCP14ResearchPack } from "@/domain/cp14-research";

// Security
import { classifyContent, validateTextInput, validateFilename, validateFileSize, validateMimeType } from "@/domain/security";

// Draft provenance
import { buildDraftProvenance, type DraftProvenance } from "@/domain/draft-provenance";

// Wire CP14 domain packs into factory registry
import "@/domain/cp14-packs";

import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { LLMAnalysisPanel } from "@/components/llm-analysis-panel";
import { FAQSection } from "@/components/faq-section";
import { getWorkflowSEO } from "@/domain/workflow-seo";
import { handleDocumentUpload } from "@/platform/upload-handler";
export const Route = createFileRoute("/workflows/cp14-response")({
  head: () => createWorkflowHead("cp14-response"),
  component: CP14Response,
});

function CP14Response() {
  const definition = getWorkflowById("cp14-response")!;
  const steps = definition.ux?.steps ?? [];
  const [state, setState] = useState<WorkflowState>(() => createWorkflowState(definition));
  const [cp14Extraction, setCP14Extraction] = useState<CP14Extraction | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mailingFunnelState, setMailingFunnelState] = useState<MailingFunnelState | null>(null);

  // Gold-standard state
  const [cp14Case, setCP14Case] = useState<CP14Case | null>(null);
  const [discrepancyResult, setDiscrepancyResult] = useState<CP14DiscrepancyResult | null>(null);
  const [evidenceChecklist, setEvidenceChecklist] = useState<CP14EvidenceChecklistResult | null>(null);
  const [cp14Strategy, setCP14Strategy] = useState<CP14ResponseStrategy | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [draftProvenance, setDraftProvenance] = useState<DraftProvenance | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const workflowRef = useRef<HTMLDivElement>(null);

  const update = (fn: (s: WorkflowState) => WorkflowState) => setState(fn);

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => {
      workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  // ── Build the gold-standard CP14 pipeline from extraction ──
  const buildGoldStandardPipeline = useCallback((extraction: CP14Extraction) => {
    // 1. Create case model
    let case_ = createCP14Case(extraction);

    // 2. Run discrepancy analysis
    const discrepancies = analyzeCP14Discrepancies({ extraction });
    setDiscrepancyResult(discrepancies);

    // 3. Build evidence checklist
    const checklist = buildCP14EvidenceChecklist({
      extraction,
      discrepancies: discrepancies.discrepancies,
      findings: discrepancies.findings,
    });
    setEvidenceChecklist(checklist);

    // 4. Attach analysis to case
    case_ = setCP14CaseAnalysis(case_, {
      discrepancies: discrepancies.discrepancies,
      findings: discrepancies.findings,
      evidence: checklist.items,
    });

    // 5. Attach research
    const researchPack = getCP14ResearchPack();
    case_ = setCP14CaseResearch(case_, researchPack);

    // 6. Generate strategy
    const strategy = generateCP14Strategy({
      discrepancies: discrepancies.discrepancies,
      findings: discrepancies.findings,
      evidence: checklist.items,
      hasDeadline: !!(extraction.paymentDeadline ?? extraction.responseDeadline),
      extractionConfident: extraction.isCP14,
      installmentOption: extraction.installmentOption,
    });
    setCP14Strategy(strategy);
    case_ = setCP14CaseStrategy(case_, strategy);

    setCP14Case(case_);
  }, []);

  // ── Document upload and extraction ──
  const handleFileUpload = useCallback(async (file: File) => {
    update((s) => setProcessing(s, true));
    setExtractionError(null);

    try {
      // Security validation on the file itself
      const fileValidation = validateFilename(file.name);
      if (!fileValidation.valid) {
        setExtractionError(`File validation failed: ${fileValidation.errors.join(", ")}`);
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

      // Security check on extracted text
      if (text && text.length > 20) {
        const contentClassification = classifyContent(text);
        if (contentClassification.detectedInjectionPatterns.length > 0) {
          setSecurityWarning(`Security notice: ${contentClassification.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected in document content. The content will be treated as DATA, not instructions.`);
        } else {
          setSecurityWarning(null);
        }
        const textValidation = validateTextInput(text);
        text = textValidation.sanitized;

        // Run CP14 extraction
        const extraction = extractCP14(text);
        setCP14Extraction(extraction);

        // Build gold-standard pipeline
        buildGoldStandardPipeline(extraction);

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
      setExtractionError(`Failed to process document: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      update((s) => setProcessing(s, false));
    }
  }, [update, buildGoldStandardPipeline]);

  const handlePasteText = useCallback((text: string) => {
    // Security validation on pasted text
    const contentClassification = classifyContent(text);
    if (contentClassification.detectedInjectionPatterns.length > 0) {
      setSecurityWarning(`Security notice: ${contentClassification.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected in document content. The content will be treated as DATA, not instructions.`);
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

    const extraction = extractCP14(sanitizedText);
    setCP14Extraction(extraction);

    // Build gold-standard pipeline
    buildGoldStandardPipeline(extraction);

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
    }, [update, buildGoldStandardPipeline, llmAnalysis]);

  // ── Draft generation (uses two-pass validation) ──
  const handleGenerateDraft = useCallback(() => {
    const draft = generateCP14Draft({
      noticeNumber: cp14Extraction?.noticeNumber ?? "",
      taxYear: cp14Extraction?.taxYear ?? null,
      noticeDate: cp14Extraction?.noticeDate ?? null,
      responseDeadline: cp14Extraction?.paymentDeadline ?? cp14Extraction?.responseDeadline ?? null,
      balanceDue: cp14Extraction?.balanceDue ?? null,
      totalDue: cp14Extraction?.totalDue ?? null,
      userFacts: state.userFacts,
      userObjective: state.userObjective,
    });

    update((s) => setDraft(s, draft));

    // Use two-pass CP14 validation if we have a case model
    if (cp14Case && cp14Extraction) {
      // Rebuild strategy with user facts/objective now available
      let case_ = setCP14CaseUserInput(cp14Case, state.userFacts, state.userObjective);
      if (discrepancyResult) {
        const strategy = generateCP14Strategy({
          discrepancies: discrepancyResult.discrepancies,
          findings: discrepancyResult.findings,
          evidence: evidenceChecklist?.items ?? [],
          userFacts: state.userFacts,
          userObjective: state.userObjective,
          hasDeadline: !!(cp14Extraction.paymentDeadline ?? cp14Extraction.responseDeadline),
          extractionConfident: cp14Extraction.isCP14,
          installmentOption: cp14Extraction.installmentOption,
        });
        setCP14Strategy(strategy);
        case_ = setCP14CaseStrategy(case_, strategy);
      }
      case_ = setCP14CaseDraft(case_, { content: draft, wordCount: draft.split(/\s+/).length, unresolvedPlaceholders: [] });

      // Run the two-pass validation
      const cp14Validation = validateCP14Draft(case_);
      case_ = setCP14CaseValidation(case_, cp14Validation);
      setCP14Case(case_);

      // Bridge CP14ValidationResult → DraftValidationResult for WorkflowState
      const allFindings = cp14Validation.allFindings.map(f => ({
        check: f.check,
        passed: f.passed,
        detail: f.detail,
        severity: f.severity === "block" ? "error" as const : f.severity,
      }));
      const bridgedValidation = {
        findings: allFindings,
        passed: cp14Validation.passed,
        errors: cp14Validation.errors + cp14Validation.blocks,
        warnings: cp14Validation.warnings,
      };
      update((s) => setDraftValidation(s, bridgedValidation));

      // Build draft provenance
      const provenance = buildDraftProvenance(draft, state.extractedFacts, []);
      setDraftProvenance(provenance);
    } else {
      // Fallback: generic validation
      const validation = validateDraft(draft, state.extractedFacts, definition, {
        expectedNoticeNumber: cp14Extraction?.noticeNumber ?? undefined,
        expectedTaxYear: cp14Extraction?.taxYear ?? undefined,
        expectedDeadline: cp14Extraction?.responseDeadline ?? undefined,
        expectedAmounts: [cp14Extraction?.balanceDue, cp14Extraction?.totalDue].filter(Boolean) as string[],
      });
      update((s) => setDraftValidation(s, validation));

      const provenance = buildDraftProvenance(draft, state.extractedFacts, []);
      setDraftProvenance(provenance);
    }
  }, [cp14Case, cp14Extraction, state.userFacts, state.userObjective, state.extractedFacts, definition, update, discrepancyResult, evidenceChecklist]);

  // ── Step navigation ──
  const canContinue = canAdvance(state, definition);

  const next = () => {
    if (state.phase === "draft" && !state.draft) {
      handleGenerateDraft();
    }
    if (state.phase === "checkout" || state.phase === "submitted") {
      return;
    }
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
              <span className="text-ink-soft">CP14 Response</span>
            </nav>
            <div className="postmark w-fit mt-6">IRS Notice · CP14</div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
              Respond to your <span className="italic text-stamp">CP14 notice</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              The IRS sent you a Balance Due notice showing unpaid taxes plus penalties and interest. Upload the notice, verify the balance, and prepare a documented response — whether you're paying, requesting an installment agreement, or disputing the amount.
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
              <KeyFact label="Notice type" value="Balance Due" />
              <KeyFact label="Includes" value="Tax + penalties + interest" />
              <KeyFact label="Recommended mail" value="Certified" />
              <KeyFact label="Cost to prepare" value="Free" />
            </div>
          </div>
        </section>

        {/* ── WHAT IS CP14 ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Understanding the notice</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">What is a CP14 notice?</h2>
            <div className="mt-6 space-y-4 text-base leading-7 text-ink-soft">
              <p>A CP14 is the <strong className="text-ink">first balance due notice</strong> the IRS sends when you have unpaid taxes. It shows the tax amount owed for a specific tax year, plus any accrued penalties and interest. This is the IRS's initial communication about an outstanding balance — it is a bill, and it requires action.</p>
              <p>You have several response options: pay the full balance, request an <strong className="text-ink">Installment Agreement</strong> (Form 9465) to pay over time, request a short-term extension, or dispute the amount if you believe it's incorrect. Ignoring the notice leads to escalating collection actions — CP501, CP503, CP504, and eventually a <strong className="text-ink">Notice of Federal Tax Lien</strong> or levy.</p>
              <p>Responding early gives you the most options. The IRS is generally more flexible with taxpayers who initiate contact than those who wait for enforcement. An installment agreement can stop collection actions and reduce the failure-to-pay penalty rate from 0.5% to 0.25% per month.</p>
            </div>
            <div className="mt-8 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-stamp">What a CP14 includes</div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {["Notice number and date","Tax year and balance due","Penalties (failure-to-pay, failure-to-file)","Interest accrued to date","Payment options and instructions","IRS payment address","Your taxpayer account summary","Due date for payment"].map((item) => (
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
              <ProcessStep number="01" title="Upload & analyze" text="Upload the CP14 PDF or paste the text. The system extracts the notice number, balance due, tax year, penalties, and interest — then flags what needs your attention." />
              <ProcessStep number="02" title="Review & draft" text="See the extracted facts alongside your records. Add your supporting evidence. Generate a professional response letter addressing your payment plan request, dispute, or payment confirmation." />
              <ProcessStep number="03" title="Mail with proof" text="Approve the exact draft. Choose Certified mail for proof of timely delivery. MailMyPDF prints, stamps, and ships — you keep the tracking number as proof of response." />
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
              <h2 className="mt-4 font-serif text-4xl">Respond to your CP14 notice</h2>
              <p className="mt-3 text-muted-foreground">
                A CP14 is a Balance Due notice from the IRS. It tells you that you have an unpaid balance on your tax account for a specific tax year, showing the tax amount plus any penalties and interest. This workflow helps you organize the notice, verify the balance, and prepare a response — whether you're paying, requesting an installment agreement, or disputing the amount.
              </p>
              <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
                <div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div>
                <p className="mt-2">{definition.ux?.disclaimerText ?? definition.disclaimer}</p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Upload the CP14 notice", "Review extracted facts and balance due", "Add your facts and supporting records", "Generate and review the response draft", "Approve and mail with proof of delivery"].map((item, i) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-ink-soft">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper-deep font-mono text-xs text-muted-foreground">{i + 1}</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Document Upload ── */}
          {state.phase === "document" && (
            <div>
              <div className="postmark w-fit">2 · Upload</div>
              <h2 className="mt-4 font-serif text-3xl">Upload your CP14 notice</h2>
              <p className="mt-3 text-muted-foreground">Upload the CP14 notice PDF, or paste the notice text below. We'll extract key information for your review.</p>

              <label className="upload-zone mt-6 block cursor-pointer">
                <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span className="mt-3 block font-medium text-foreground">Upload CP14 notice</span>
                <span className="mt-1 block text-xs text-muted-foreground">PDF, JPG, or PNG · Text is extracted for your review</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
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
                <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  {extractionError}
                </div>
              )}

              {securityWarning && (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                  <span className="font-medium">⚠ Security:</span> {securityWarning}
                </div>
              )}

              <div className="mt-6 border-t border-rule/60 pt-4">
                <label className="input-label">Or paste notice text</label>
                <textarea
                  className="input-field mt-2 min-h-32 font-mono text-sm"
                  placeholder="Paste the text content of your CP14 notice here…"
                  onChange={(e) => {
                    if (e.target.value.length > 50) {
                      handlePasteText(e.target.value);
                    }
                  }}
                />
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

              {cp14Extraction && (
                <div className="mt-6 space-y-4">
                  {/* Classification */}
                  <div className="rounded-lg border border-rule/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Document Classification</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${cp14Extraction.isCP14 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {cp14Extraction.isCP14 ? "CP14 Confirmed" : "Not confirmed"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Confidence: {(cp14Extraction.classificationConfidence * 100).toFixed(0)}%</p>
                  </div>

                  {/* Security warning (persistent in extraction view) */}
                  {securityWarning && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                      <span className="font-medium">⚠ Security:</span> {securityWarning}
                    </div>
                  )}

                  {/* Warnings */}
                  {cp14Extraction.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Warnings</div>
                      <ul className="mt-2 space-y-1">
                        {cp14Extraction.warnings.map((w, i) => (
                          <li key={i} className="text-sm text-amber-800">⚠ {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Extracted Facts */}
                  {cp14Extraction.facts.length > 0 ? (
                    <div className="rounded-lg border border-rule/60 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-stamp">Extracted Facts</div>
                      <dl className="mt-3 space-y-2">
                        {cp14Extraction.facts.map((fact) => (
                          <div key={fact.id} className="border-b border-rule/30 pb-2 last:border-0">
                            <div className="flex items-start justify-between gap-4">
                              <dt className="text-sm font-medium text-foreground">{fact.label}</dt>
                              <dd className="text-sm text-muted-foreground">{fact.value || "—"}</dd>
                            </div>
                            {fact.sourceExcerpt && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                  Source: "{fact.sourceExcerpt}" · Method: {fact.extractionMethod}
                                </summary>
                              </details>
                            )}
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-rule/60 p-4 text-sm text-muted-foreground">
                      No structured facts were extracted. You can enter facts manually in the next step.
                    </div>
                  )}

                  {/* CP14 Discrepancy Analysis */}
                  {discrepancyResult && discrepancyResult.discrepancies.length > 0 && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-destructive">Discrepancy Analysis</div>
                      <ul className="mt-2 space-y-2">
                        {discrepancyResult.discrepancies.map((d, i) => (
                          <li key={i} className="text-sm text-destructive">
                            <span className="font-medium">{d.type.replace(/_/g, " ")}:</span> {d.description}
                            {d.difference && <span className="ml-1">(difference: {d.difference})</span>}
                            <ul className="mt-1 ml-4 space-y-0.5 text-xs text-muted-foreground">
                              <li><strong>Evidence needed:</strong> {d.evidenceNeeded.join("; ")}</li>
                              <li><strong>Confidence:</strong> {d.confidence}</li>
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* CP14 Findings */}
                  {discrepancyResult && discrepancyResult.findings.length > 0 && (
                    <div className="rounded-lg border border-rule/60 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-stamp">Findings ({discrepancyResult.totalIssues} total)</div>
                      <ul className="mt-2 space-y-1">
                        {discrepancyResult.findings.map((f, i) => (
                          <li key={i} className="text-sm">
                            <span className={`font-medium ${f.severity === "critical" ? "text-destructive" : f.severity === "high" ? "text-amber-700" : "text-muted-foreground"}`}>
                              [{f.severity}]
                            </span>{" "}
                            <span className="text-foreground">{f.statement}</span>
                            {f.recommendedAction && (
                              <span className="block text-xs text-muted-foreground mt-0.5">→ {f.recommendedAction}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Evidence Checklist */}
                  {evidenceChecklist && evidenceChecklist.items.length > 0 && (
                    <div className="rounded-lg border border-rule/60 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-stamp">Evidence Checklist</div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Required: {evidenceChecklist.requiredCount} · Missing: {evidenceChecklist.missingCount} · Ready: {evidenceChecklist.ready ? "✓" : "✗"}
                      </div>
                      <ul className="mt-2 space-y-1">
                        {evidenceChecklist.items.map((item, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className={item.state === "missing" ? "text-amber-600" : item.state === "provided" ? "text-emerald-600" : "text-muted-foreground"}>
                              {item.state === "missing" ? "○" : "●"}
                            </span>
                            <div>
                              <span className="font-medium text-foreground">{item.label}</span>
                              <span className="ml-2 text-xs text-muted-foreground">({item.requirement})</span>
                              <p className="text-xs text-muted-foreground">{item.purpose}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Deadline Analysis */}
                  {cp14Case && (
                    <div className="rounded-lg border border-rule/60 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-stamp">Deadline Analysis</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-foreground">
                          {cp14Case.deadline.parsed ?? "No deadline found"}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          cp14Case.deadline.certainty === "confirmed" ? "bg-emerald-50 text-emerald-700" :
                          cp14Case.deadline.certainty === "derived" ? "bg-amber-50 text-amber-700" :
                          cp14Case.deadline.certainty === "missing" ? "bg-red-50 text-red-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {cp14Case.deadline.certainty}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Source: {cp14Case.deadline.source}</p>
                    </div>
                  )}

                  {/* Contradictions and Missing Info */}
                  {contradictions.length > 0 && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-destructive">Contradictions</div>
                      <ul className="mt-2 space-y-1">
                        {contradictions.map((c, i) => (
                          <li key={i} className="text-sm text-destructive">⚠ {contradictionSummary([c])}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {missingInfo.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Missing Information</div>
                      <ul className="mt-2 space-y-1">
                        {missingInfo.slice(0, 5).map((m, i) => (
                          <li key={i} className="text-sm text-amber-800">• {m.label}: {m.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!cp14Extraction && !state.isProcessing && (
                <div className="mt-6 rounded-md border border-rule/60 p-4 text-sm text-muted-foreground">
                  No document has been processed yet. Go back to upload your CP14 notice.
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Facts ── */}
          {state.phase === "facts" && (
            <div>
              <div className="postmark w-fit">4 · Facts</div>
              <h2 className="mt-4 font-serif text-3xl">Add your facts</h2>
              <p className="mt-3 text-muted-foreground">Enter the facts that support your response. Only include information you can verify with your records.</p>
              <textarea
                className="input-field mt-6 min-h-48"
                value={state.userFacts}
                onChange={(e) => update((s) => setUserFacts(s, e.target.value))}
                placeholder="Example: I paid the balance of $X on [date] via [payment method]. The payment was processed and my account shows $0 balance. / I have an installment agreement (Form 9465) approved on [date] for $X/month. / The balance appears incorrect because I filed an amended return (1040-X) on [date] correcting the amount…"
              />
              <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground">
                <strong>Tip:</strong> Include specific amounts, dates, payment confirmations, and form numbers. Reference the documents you'll attach as evidence.
              </div>
            </div>
          )}

          {/* ── Step 4: Objective ── */}
          {state.phase === "objective" && (
            <div>
              <div className="postmark w-fit">5 · Objective</div>
              <h2 className="mt-4 font-serif text-3xl">What do you want the response to accomplish?</h2>
              <p className="mt-3 text-muted-foreground">State your objective clearly. This guides the response strategy.</p>

              {/* CP14-specific strategy (discrepancy-aware) */}
              {cp14Strategy && (
                <div className="mt-4 rounded-lg border border-rule/60 bg-card p-4">
                  <div className="font-mono text-xs uppercase tracking-widest text-stamp">Response Strategy</div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-foreground">Position: {CP14_STRATEGY_POSITION_LABELS[cp14Strategy.position]}</span>
                    <span className="ml-2 text-xs text-muted-foreground">Confidence: {cp14Strategy.confidence}</span>
                  </div>
                  {cp14Strategy.issues.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-muted-foreground">Issues to address:</div>
                      <ul className="mt-1 space-y-0.5">
                        {cp14Strategy.issues.map((issue, i) => (
                          <li key={i} className="text-sm text-foreground">• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cp14Strategy.requestedActions.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-muted-foreground">Recommended actions:</div>
                      <ul className="mt-1 space-y-0.5">
                        {cp14Strategy.requestedActions.map((action, i) => (
                          <li key={i} className="text-sm text-foreground">• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cp14Strategy.riskFlags.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-amber-700">Risk flags:</div>
                      <ul className="mt-1 space-y-0.5">
                        {cp14Strategy.riskFlags.map((risk, i) => (
                          <li key={i} className="text-sm text-amber-800">⚠ {risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={() => update((s) => setUserObjective(s, CP14_STRATEGY_POSITION_LABELS[cp14Strategy.position] + (cp14Strategy.requestedActions.length > 0 ? `: ${cp14Strategy.requestedActions[0]}` : "")))}
                    className="mt-3 rounded-full border border-rule px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Use this strategy
                  </button>
                </div>
              )}

              {/* Generic strategy suggestions (fallback) */}
              {strategies.length > 0 && !cp14Strategy && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Suggested strategies based on the notice type</div>
                  {strategies.slice(0, 4).map((strat) => (
                    <button
                      key={strat.type}
                      onClick={() => update((s) => setUserObjective(s, STRATEGY_TYPE_LABELS[strat.type] + (strat.reason ? `: ${strat.reason}` : "")))}
                      className="block w-full rounded-lg border border-rule/60 bg-card p-3 text-left text-sm hover:border-stamp/40 transition-colors"
                    >
                      <span className="font-medium text-foreground">{STRATEGY_TYPE_LABELS[strat.type]}</span>
                      {strat.reason && <span className="mt-1 block text-xs text-muted-foreground">{strat.reason}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Research sources */}
              {cp14Case?.research.sources && cp14Case.research.sources.length > 0 && (
                <div className="mt-4 rounded-lg border border-rule/60 p-4">
                  <div className="font-mono text-xs uppercase tracking-widest text-stamp">Authoritative Sources</div>
                  <ul className="mt-2 space-y-1">
                    {cp14Case.research.sources.slice(0, 5).map((source, i) => (
                      <li key={i} className="text-sm">
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {source.title}
                        </a>
                        <span className="ml-1 text-xs text-muted-foreground">— {source.organization}</span>
                      </li>
                    ))}
                  </ul>
                  {cp14Case.research.knownFacts.length > 0 && (
                    <div className="mt-3 border-t border-rule/30 pt-2">
                      <div className="text-xs font-medium text-muted-foreground">Key facts from IRS sources:</div>
                      <ul className="mt-1 space-y-1">
                        {cp14Case.research.knownFacts.slice(0, 4).map((fact, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            <span className="font-medium">"{fact.fact}"</span>
                            {fact.interpretation && <span className="block italic">{fact.interpretation}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <textarea
                className="input-field mt-6 min-h-40"
                value={state.userObjective}
                onChange={(e) => update((s) => setUserObjective(s, e.target.value))}
                placeholder="Example: I am paying the balance in full and have enclosed a check for the total amount due. / I am requesting an installment agreement because I cannot pay in full. / I am disputing the balance because I already paid it…"
              />
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
                  <div className="font-mono text-xs uppercase tracking-widest text-amber-700">
                    Validation findings ({state.draftValidation.errors} errors, {state.draftValidation.warnings} warnings)
                  </div>
                  <ul className="mt-2 space-y-1">
                    {state.draftValidation.findings.filter((f) => !f.passed).map((f, i) => (
                      <li key={i} className={`text-sm ${f.severity === "error" ? "text-destructive" : "text-amber-800"}`}>
                        {f.severity === "error" ? "✗" : "⚠"} {f.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {state.draftValidation?.passed && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  ✓ Draft passed all validation checks.
                </div>
              )}

              <textarea
                className="input-field mt-6 min-h-72 font-mono text-sm leading-6"
                value={state.draft}
                onChange={(e) => update((s) => setDraft(s, e.target.value))}
              />

              {/* Draft provenance */}
              {draftProvenance && (
                <div className="mt-4 rounded-lg border border-rule/60 p-4">
                  <div className="font-mono text-xs uppercase tracking-widest text-stamp">Draft Provenance</div>
                  <div className="mt-2 flex gap-4 text-xs">
                    <span className="text-emerald-600">✓ Supported: {draftProvenance.supported}</span>
                    <span className="text-amber-600">⚠ Unsupported: {draftProvenance.unsupported}</span>
                    <span className="text-destructive">✗ Blocking: {draftProvenance.blocking}</span>
                    <span className={draftProvenance.safeForApproval ? "text-emerald-600" : "text-destructive"}>
                      {draftProvenance.safeForApproval ? "✓ Safe for approval" : "✗ Not safe for approval"}
                    </span>
                  </div>
                  {draftProvenance.assertions.filter(a => a.support === "unsupported" || a.support === "placeholder").length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {draftProvenance.assertions.filter(a => a.support === "unsupported" || a.support === "placeholder").map((a, i) => (
                        <li key={i} className={`text-sm ${a.blocking ? "text-destructive" : "text-amber-700"}`}>
                          {a.blocking ? "✗" : "⚠"} {a.reason ?? a.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <button
                onClick={async () => {
                  if (llmAnalysis.llmAnalysis) {
                    const res = await fetch('/api/workflows/draft', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workflowId: 'cp14-response', analysis: llmAnalysis.llmAnalysis, userFacts: state.userFacts, userObjective: state.userObjective, documentText: state.upload?.rawText }),
                    });
                    if (res.ok) { const data = await res.json(); update((s) => setDraft(s, data.draft)); if (data.validation) update((s) => setDraftValidation(s, data.validation)); }
                  }
                }}
                disabled={!llmAnalysis.llmAnalysis}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30"
              >✦ Generate with AI</button>
              <button
                onClick={handleGenerateDraft}
                className="mt-4 rounded-full border border-rule px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Regenerate draft
              </button>
            </div>
          )}

          {/* ── Step 6: Review ── */}
          {state.phase === "review" && (
            <div>
              <div className="postmark w-fit">7 · Review</div>
              <h2 className="mt-4 font-serif text-3xl">Review before anything is mailed</h2>
              <p className="mt-3 text-muted-foreground">Please confirm each item below.</p>
              <ReviewChecks
                items={definition.ux?.reviewChecks ?? []}
                checks={state.reviewChecks}
                setChecks={(fn) => update((s) => setReviewChecks(s, fn(state.reviewChecks)))}
              />
              {state.reviewChecks.every(Boolean) && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  ✓ All checks confirmed. You can proceed to the next step.
                </div>
              )}
            </div>
          )}

          {/* ── Step 7: Attachments ── */}
          {state.phase === "attachments" && (
            <div>
              <div className="postmark w-fit">8 · Documents</div>
              <h2 className="mt-4 font-serif text-3xl">Add supporting documents</h2>
              <p className="mt-3 text-muted-foreground">Attach any documents referenced in your response — payment confirmations, return transcripts, installment forms, prior correspondence, etc.</p>
              <label className="upload-zone mt-6 block cursor-pointer">
                <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span className="mt-3 block font-medium text-foreground">Add attachments</span>
                <span className="mt-1 block text-xs text-muted-foreground">Forms, receipts, evidence, prior correspondence</span>
                <input type="file" accept="application/pdf,image/jpeg,image/png" multiple className="sr-only" />
              </label>
              {evidenceChecklist && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Required evidence: {evidenceChecklist.items.filter(e => e.requirement === "required").map(e => e.label).join(", ")}
                </div>
              )}
            </div>
          )}

          {/* ── Step 8: Recipient ── */}
          {state.phase === "recipient" && (
            <div>
              <div className="postmark w-fit">9 · Recipient</div>
              <h2 className="mt-4 font-serif text-3xl">Where should we send it?</h2>
              <p className="mt-3 text-muted-foreground">Enter the IRS mailing address from the CP14 notice. The response or payment address should be printed on the notice.</p>
              {cp14Extraction?.responseAddress && (
                <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground">
                  <strong>Extracted response address:</strong> {cp14Extraction.responseAddress}
                </div>
              )}
              <RecipientForm
                recipient={state.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }}
                setRecipient={(fn) => update((s) => setMailing(s, {
                  ...s.mailing ?? { method: "certified", recipient: fn({ name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }), status: "not_started" },
                  recipient: fn(s.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }),
                }))}
                orgPlaceholder="IRS — Department of the Treasury"
              />
            </div>
          )}

          {/* ── Step 9: Mailing ── */}
          {state.phase === "mailing" && (
            <div>
              <div className="postmark w-fit">10 · Mail</div>
              <h2 className="mt-4 font-serif text-3xl">Choose your mail type</h2>
              <p className="mt-3 text-muted-foreground">For IRS responses, Certified mail is recommended for proof of timely submission.</p>
              <MailOptions
                selected={state.mailing?.method ?? "certified"}
                onSelect={(id) => update((s) => setMailing(s, {
                  ...s.mailing ?? { recipient: { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }, status: "not_started" },
                  method: id,
                }))}
              />
            </div>
          )}

          {/* ── Step 10: Checkout + Done (MailingFunnel) ── */}
          {(state.phase === "checkout" || state.phase === "submitted") && (
            <MailingFunnel
              draft={state.draft}
              workflowId={definition.id}
              workflowTitle={definition.title}
              recipient={state.mailing?.recipient ?? null}
              extractionRef={cp14Extraction?.noticeNumber ?? null}
              taxYear={cp14Extraction?.taxYear ?? null}
              mailOptions={definition.ux?.mailOptions ?? MAIL_OPTIONS}
              disclaimer={definition.ux?.disclaimerText ?? definition.disclaimer}
              onMailingStateChange={(s) => {
                setMailingFunnelState(s);
                if (s.phase === "submitted") {
                  update((st) => setMailing(st, {
                    method: s.method,
                    recipient: s.recipient,
                    status: "submitted",
                    providerOrderId: s.providerOrderId ?? undefined,
                    trackingNumber: s.trackingNumber ?? undefined,
                  }));
                }
              }}
            />
          )}

          {/* ── Navigation ── */}
          {state.phase !== "checkout" && state.phase !== "submitted" && (
            <div className="mt-8 flex items-center justify-between">
              <button onClick={back} disabled={state.step === 0} className="rounded-full border border-rule px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                ← Back
              </button>
              <button onClick={next} disabled={!canContinue} className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors">
                {state.phase === "mailing" ? "Continue to checkout" : "Continue →"}
              </button>
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
              <TrustItem title="Proof of delivery" text="Certified mail provides tracking and delivery confirmation — your record of timely response." />
            </div>
          </div>
        </section>

        {/* ── RELATED NOTICES ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Related workflows</div>
            <h2 className="mt-3 font-serif text-2xl">Other IRS notice types</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <RelatedCard href="/workflows/cp2000-response" title="CP2000 — Proposed Adjustment" desc="Income reporting discrepancy notice" />
              <RelatedCard href="/workflows/cp504-response" title="CP504 — Intent to Levy" desc="Urgent notice before enforcement action" />
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
