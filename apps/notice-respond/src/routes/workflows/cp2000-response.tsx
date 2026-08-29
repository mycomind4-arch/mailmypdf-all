import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Stepper, MailOptions, RecipientForm, ReviewChecks, MAIL_OPTIONS } from "@/components/workflow-shell";
import { getWorkflowById } from "@/domain/workflow-catalog";
import {
  createWorkflowState, advanceStep, retreatStep, goToStep, canAdvance,
  setUpload, setExtraction, setProcessing, setUserFacts, setUserObjective,
  setDraft, setDraftValidation, setReviewChecks, setMailing,
  type WorkflowState, type DocumentUpload,
} from "@/domain/workflow-runtime";
import { classifyNoticeType, NOTICE_TYPE_META } from "@/domain/notice-type";
import { extractCP2000, generateCP2000Draft, type CP2000Extraction } from "@/domain/cp2000";
import { validateDraft } from "@/domain/draft-validator";
import { recommendStrategies, STRATEGY_TYPE_LABELS } from "@/domain/strategy";
import { detectContradictions, contradictionSummary } from "@/domain/contradiction";
import { detectMissingInfo, missingInfoSummary } from "@/domain/missing-info";
import { MailingFunnel, type MailingFunnelState } from "@/components/mailing-funnel";
import { analyzeCP2000Discrepancies, type DiscrepancyResult } from "@/domain/cp2000-discrepancy";
import { buildCP2000EvidenceChecklist, type EvidenceChecklistResult } from "@/domain/cp2000-evidence";
import { generateCP2000Strategy, STRATEGY_POSITION_LABELS, type CP2000ResponseStrategy } from "@/domain/cp2000-strategy";
import { validateCP2000Draft } from "@/domain/cp2000-validation";
import { createCP2000Case, setCaseAnalysis, setCaseStrategy, setCaseDraft, setCaseValidation, setCaseUserInput, setCaseResearch, type CP2000Case } from "@/domain/cp2000-case";
import { getCP2000ResearchPack } from "@/domain/cp2000-research";
import { classifyContent, validateTextInput, validateFilename, validateFileSize, validateMimeType } from "@/domain/security";
import "@/domain/cp2000-packs";
import { buildDraftProvenance, type DraftProvenance } from "@/domain/draft-provenance";
import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { LLMAnalysisPanel } from "@/components/llm-analysis-panel";
import { FAQSection } from "@/components/faq-section";
import { getWorkflowSEO } from "@/domain/workflow-seo";

export const Route = createFileRoute("/workflows/cp2000-response")({
  head: () => createWorkflowHead("cp2000-response"),
  component: CP2000Response,
});

function CP2000Response() {
  const definition = getWorkflowById("cp2000-response")!;
  const steps = definition.ux?.steps ?? [];
  const [state, setState] = useState<WorkflowState>(() => createWorkflowState(definition));
  const [cp2000Extraction, setCP2000Extraction] = useState<CP2000Extraction | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const llmAnalysis = useCombinedAnalysis("cp2000-response");
  const [mailingFunnelState, setMailingFunnelState] = useState<MailingFunnelState | null>(null);
  const [cp2000Case, setCP2000Case] = useState<CP2000Case | null>(null);
  const [discrepancyResult, setDiscrepancyResult] = useState<DiscrepancyResult | null>(null);
  const [evidenceChecklist, setEvidenceChecklist] = useState<EvidenceChecklistResult | null>(null);
  const [cp2000Strategy, setCP2000Strategy] = useState<CP2000ResponseStrategy | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [draftProvenance, setDraftProvenance] = useState<DraftProvenance | null>(null);

  const update = (fn: (s: WorkflowState) => WorkflowState) => setState(fn);

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    setTimeout(() => {
      workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const buildGoldStandardPipeline = useCallback((extraction: CP2000Extraction) => {
    let case_ = createCP2000Case(extraction);
    const discrepancies = analyzeCP2000Discrepancies({ extraction });
    setDiscrepancyResult(discrepancies);
    const checklist = buildCP2000EvidenceChecklist({
      extraction,
      discrepancies: discrepancies.discrepancies,
      findings: discrepancies.findings,
    });
    setEvidenceChecklist(checklist);
    case_ = setCaseAnalysis(case_, {
      discrepancies: discrepancies.discrepancies,
      findings: discrepancies.findings,
      evidence: checklist.items,
    });
    const researchPack = getCP2000ResearchPack();
    case_ = setCaseResearch(case_, researchPack);
    const strategy = generateCP2000Strategy({
      discrepancies: discrepancies.discrepancies,
      findings: discrepancies.findings,
      evidence: checklist.items,
      hasDeadline: !!extraction.responseDeadline,
      extractionConfident: extraction.isCP2000,
    });
    setCP2000Strategy(strategy);
    case_ = setCaseStrategy(case_, strategy);
    setCP2000Case(case_);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    update((s) => setProcessing(s, true));
    setExtractionError(null);
    try {
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
      if (file.type === "application/pdf") {
        try {
          const buffer = await file.arrayBuffer();
          const decoder = new TextDecoder("latin1");
          const raw = decoder.decode(buffer);
          const textMatches = raw.match(/\(([^)]+)\)/g);
          if (textMatches) {
            text = textMatches.map(m => m.slice(1, -1)).join(" ");
          }
        } catch {
          text = "";
        }
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
          setSecurityWarning(`Security notice: ${contentClassification.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected in document content. The content will be treated as DATA, not instructions.`);
        } else {
          setSecurityWarning(null);
        }
        const textValidation = validateTextInput(text);
        text = textValidation.sanitized;
        const extraction = extractCP2000(text);
        setCP2000Extraction(extraction);
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
    const extraction = extractCP2000(sanitizedText);
    setCP2000Extraction(extraction);
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
    llmAnalysis.analyzeWithLLM(null, sanitizedText);
  }, [update, buildGoldStandardPipeline, llmAnalysis]);

  const handleGenerateDraft = useCallback(() => {
    const draft = generateCP2000Draft({
      noticeNumber: cp2000Extraction?.noticeNumber ?? "",
      taxYear: cp2000Extraction?.taxYear ?? null,
      noticeDate: cp2000Extraction?.noticeDate ?? null,
      responseDeadline: cp2000Extraction?.responseDeadline ?? null,
      userFacts: state.userFacts,
      userObjective: state.userObjective,
    });
    update((s) => setDraft(s, draft));
    if (cp2000Case && cp2000Extraction) {
      let case_ = setCaseUserInput(cp2000Case, state.userFacts, state.userObjective);
      if (discrepancyResult) {
        const strategy = generateCP2000Strategy({
          discrepancies: discrepancyResult.discrepancies,
          findings: discrepancyResult.findings,
          evidence: evidenceChecklist?.items ?? [],
          userFacts: state.userFacts,
          userObjective: state.userObjective,
          hasDeadline: !!cp2000Extraction.responseDeadline,
          extractionConfident: cp2000Extraction.isCP2000,
        });
        setCP2000Strategy(strategy);
        case_ = setCaseStrategy(case_, strategy);
      }
      case_ = setCaseDraft(case_, { content: draft, wordCount: draft.split(/\s+/).length, unresolvedPlaceholders: [] });
      const cp2000Validation = validateCP2000Draft(case_);
      case_ = setCaseValidation(case_, cp2000Validation);
      setCP2000Case(case_);
      const allFindings = cp2000Validation.allFindings.map(f => ({
        check: f.check,
        passed: f.passed,
        detail: f.detail,
        severity: f.severity === "block" ? "error" as const : f.severity,
      }));
      const bridgedValidation = {
        findings: allFindings,
        passed: cp2000Validation.passed,
        errors: cp2000Validation.errors + cp2000Validation.blocks,
        warnings: cp2000Validation.warnings,
      };
      update((s) => setDraftValidation(s, bridgedValidation));
      const provenance = buildDraftProvenance(draft, state.extractedFacts, []);
      setDraftProvenance(provenance);
    } else {
      const validation = validateDraft(draft, state.extractedFacts, definition, {
        expectedNoticeNumber: cp2000Extraction?.noticeNumber ?? undefined,
        expectedTaxYear: cp2000Extraction?.taxYear ?? undefined,
        expectedDeadline: cp2000Extraction?.responseDeadline ?? undefined,
      });
      update((s) => setDraftValidation(s, validation));
      const provenance = buildDraftProvenance(draft, state.extractedFacts, []);
      setDraftProvenance(provenance);
    }
  }, [cp2000Case, cp2000Extraction, state.userFacts, state.userObjective, state.extractedFacts, definition, update, discrepancyResult, evidenceChecklist]);

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
              <span className="text-ink-soft">CP2000 Response</span>
            </nav>
            <div className="postmark w-fit mt-6">IRS Notice · CP2000</div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
              Respond to your <span className="italic text-stamp">CP2000 notice</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              The IRS sent you a proposed adjustment because income reported by others doesn't match your tax return. Upload the notice, review the extracted facts, and prepare a documented response — then mail it with tracking and proof of delivery.
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
              <KeyFact label="Notice type" value="Proposal" />
              <KeyFact label="Recommended mail" value="Certified" />
              <KeyFact label="Cost to prepare" value="Free" />
            </div>
          </div>
        </section>

        {/* ── WHAT IS CP2000 ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Understanding the notice</div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">What is a CP2000 notice?</h2>
            <div className="mt-6 space-y-4 text-base leading-7 text-ink-soft">
              <p>A CP2000 is an <strong className="text-ink">Automated Underreporter</strong> notice from the IRS. It's sent when the income reported to the IRS by third parties — employers, banks, brokerages — doesn't match what you reported on your tax return. The IRS computer system compares these reports automatically and proposes an adjustment.</p>
              <p>The notice shows each discrepancy: what you reported, what the IRS received, and the proposed change to your tax, penalties, and interest. It is <strong className="text-ink">not a bill</strong> — it's a proposal. You have the right to agree, partially agree, or disagree, and to provide documentation supporting your position.</p>
              <p>If you don't respond by the deadline (typically 30 days), the IRS issues a Statutory Notice of Deficiency (CP3219A), which starts a 90-day clock to petition the U.S. Tax Court. After that, the proposed amount is assessed and collection begins.</p>
            </div>
            <div className="mt-8 rounded-lg border border-rule/60 bg-paper-deep/30 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-stamp">What a CP2000 includes</div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {["Notice number and date","Tax year under review","Response deadline (usually 30 days)","Income items as reported by you","Income items as reported to IRS","Proposed tax increase","Proposed penalties and interest","IRS response address"].map((item) => (
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
              <ProcessStep number="01" title="Upload & analyze" text="Upload the CP2000 PDF or paste the text. The system extracts the notice number, tax year, deadline, income discrepancies, and proposed amounts — then flags what needs your attention." />
              <ProcessStep number="02" title="Review & draft" text="See the extracted facts alongside your records. Add your supporting evidence. Generate a professional response letter that addresses each discrepancy. Edit anything before approval." />
              <ProcessStep number="03" title="Mail with proof" text="Approve the exact draft. Choose Certified mail for proof of timely delivery. MailMyPDF prints, stamps, and ships — you keep the tracking number and delivery confirmation." />
            </div>
          </div>
        </section>

        {/* ── WORKFLOW INTERFACE ── */}
        <section ref={workflowRef} className="border-b border-rule/60 scroll-mt-16">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="mb-6">
              <div className="postmark w-fit">{workflowStarted ? "Active workflow" : "Ready when you are"}</div>
              <h2 className="mt-4 font-serif text-3xl">CP2000 Response Workflow</h2>
              {!workflowStarted && (
                <p className="mt-3 text-muted-foreground">Click "Start your response" above, or begin here. Upload the notice, review extracted facts, add your evidence, generate a draft, and mail it.</p>
              )}
            </div>
            <Stepper steps={steps} current={state.step} onStep={(i) => update((s) => goToStep(s, definition, i))} />
            <div className="mt-10 envelope-card p-6 md:p-10">
              {state.phase === "intro" && (
                <div>
                  <div className="postmark w-fit">1 · Start</div>
                  <h3 className="mt-4 font-serif text-4xl">Respond to your CP2000 notice</h3>
                  <p className="mt-3 text-muted-foreground">A CP2000 is an Automated Underreporter proposal from the IRS. It shows income reported to the IRS by third parties that doesn't match your tax return. This workflow helps you organize the notice, compare it with your records, and prepare a response.</p>
                  <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
                    <div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div>
                    <p className="mt-2">{definition.ux?.disclaimerText ?? definition.disclaimer}</p>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {["Upload the CP2000 notice","Review extracted facts and discrepancy","Add your facts and supporting records","Generate and review the response draft","Approve and mail with proof of delivery"].map((item, i) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-ink-soft">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper-deep font-mono text-xs text-muted-foreground">{i + 1}</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state.phase === "document" && (
                <div>
                  <div className="postmark w-fit">2 · Upload</div>
                  <h3 className="mt-4 font-serif text-3xl">Upload your CP2000 notice</h3>
                  <p className="mt-3 text-muted-foreground">Upload the CP2000 notice PDF, or paste the notice text below. We'll extract key information for your review.</p>
                  <label className="upload-zone mt-6 block cursor-pointer">
                    <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    <span className="mt-3 block font-medium text-foreground">Upload CP2000 notice</span>
                    <span className="mt-1 block text-xs text-muted-foreground">PDF, JPG, or PNG · Text is extracted for your review</span>
                    <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />
                  </label>
                  {state.isProcessing && (
                    <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm">
                      <div className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-stamp border-t-transparent" /><span className="text-muted-foreground">Processing document…</span></div>
                    </div>
                  )}
                  {extractionError && <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{extractionError}</div>}
                  {securityWarning && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">⚠ {securityWarning}</div>}
                  {cp2000Extraction && (
                    <div className="mt-6 space-y-4">
                      <div className="rounded-lg border border-rule/60 p-4">
                        <div className="font-mono text-xs uppercase tracking-widest text-stamp">Extracted from notice</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {cp2000Extraction.noticeNumber && <ExtractedField label="Notice number" value={cp2000Extraction.noticeNumber} />}
                          {cp2000Extraction.taxYear && <ExtractedField label="Tax year" value={cp2000Extraction.taxYear} />}
                          {cp2000Extraction.noticeDate && <ExtractedField label="Notice date" value={cp2000Extraction.noticeDate} />}
                          {cp2000Extraction.responseDeadline && <ExtractedField label="Response deadline" value={cp2000Extraction.responseDeadline} />}
                          {cp2000Extraction.proposedTaxIncrease && <ExtractedField label="Proposed tax increase" value={cp2000Extraction.proposedTaxIncrease} />}
                          {cp2000Extraction.responseAddress && <ExtractedField label="Response address" value={cp2000Extraction.responseAddress} />}
                        </div>
                      </div>
                      {cp2000Extraction.discrepancies && cp2000Extraction.discrepancies.length > 0 && (
                        <div className="rounded-lg border border-rule/60 p-4">
                          <div className="font-mono text-xs uppercase tracking-widest text-stamp">Income discrepancies</div>
                          <ul className="mt-2 space-y-2">
                            {cp2000Extraction.discrepancies.map((d, i) => (
                              <li key={i} className="text-sm text-destructive">
                                <span className="font-medium">{d.type.replace(/_/g, " ")}:</span> {d.description}
                                {d.difference && <span className="ml-1">(difference: {d.difference})</span>}
                                <ul className="mt-1 ml-4 space-y-0.5 text-xs text-muted-foreground"><li><strong>Evidence needed:</strong> {d.evidenceNeeded.join("; ")}</li><li><strong>Confidence:</strong> {d.confidence}</li></ul>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {evidenceChecklist && evidenceChecklist.items.length > 0 && (
                        <div className="rounded-lg border border-rule/60 p-4">
                          <div className="font-mono text-xs uppercase tracking-widest text-stamp">Evidence Checklist</div>
                          <div className="mt-2 text-xs text-muted-foreground">Required: {evidenceChecklist.requiredCount} · Missing: {evidenceChecklist.missingCount} · Ready: {evidenceChecklist.ready ? "✓" : "✗"}</div>
                          <ul className="mt-2 space-y-1">
                            {evidenceChecklist.items.map((item, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className={item.state === "missing" ? "text-amber-600" : item.state === "provided" ? "text-emerald-600" : "text-muted-foreground"}>{item.state === "missing" ? "○" : "●"}</span>
                                <div><span className="font-medium text-foreground">{item.label}</span><span className="ml-2 text-xs text-muted-foreground">({item.requirement})</span><p className="text-xs text-muted-foreground">{item.purpose}</p></div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {cp2000Case && (
                        <div className="rounded-lg border border-rule/60 p-4">
                          <div className="font-mono text-xs uppercase tracking-widest text-stamp">Deadline Analysis</div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm text-foreground">{cp2000Case.deadline.parsed ?? "No deadline found"}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cp2000Case.deadline.certainty === "confirmed" ? "bg-emerald-50 text-emerald-700" : cp2000Case.deadline.certainty === "derived" ? "bg-amber-50 text-amber-700" : cp2000Case.deadline.certainty === "missing" ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground"}`}>{cp2000Case.deadline.certainty}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">Source: {cp2000Case.deadline.source}</p>
                        </div>
                      )}
                      {contradictions.length > 0 && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                          <div className="font-mono text-xs uppercase tracking-widest text-destructive">Contradictions</div>
                          <ul className="mt-2 space-y-1">{contradictions.map((c, i) => (<li key={i} className="text-sm text-destructive">⚠ {contradictionSummary([c])}</li>))}</ul>
                        </div>
                      )}
                      {missingInfo.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Missing Information</div>
                          <ul className="mt-2 space-y-1">{missingInfo.slice(0, 5).map((m, i) => (<li key={i} className="text-sm text-amber-800">• {m.label}: {m.description}</li>))}</ul>
                        </div>
                      )}
                    </div>
                  )}
                  {!cp2000Extraction && !state.isProcessing && <div className="mt-6 rounded-md border border-rule/60 p-4 text-sm text-muted-foreground">No document has been processed yet. Go back to upload your CP2000 notice.</div>}
                  <div className="mt-6">
                    <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Or paste notice text</div>
                    <textarea className="input-field mt-2 min-h-32" placeholder="Paste the text of your CP2000 notice here…" onBlur={(e) => { if (e.target.value.trim().length > 50) { handlePasteText(e.target.value.trim()); } }} />
                  </div>
                  {llmAnalysis.llmAnalysis && <div className="mt-6"><LLMAnalysisPanel analysis={llmAnalysis.llmAnalysis} /></div>}
                </div>
              )}

              {state.phase === "facts" && (
                <div>
                  <div className="postmark w-fit">4 · Facts</div>
                  <h3 className="mt-4 font-serif text-3xl">Add your facts</h3>
                  <p className="mt-3 text-muted-foreground">Enter the facts that support your response. Only include information you can verify with your records.</p>
                  <textarea className="input-field mt-6 min-h-48" value={state.userFacts} onChange={(e) => update((s) => setUserFacts(s, e.target.value))} placeholder="Example: My W-2 from [employer] shows income of $X for tax year [year]. The amount on the CP2000 notice appears to reflect the IRS's record, but my return was based on the corrected W-2 (W-2c) issued on [date]…" />
                  <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground"><strong>Tip:</strong> Include specific amounts, dates, payer names, and form numbers. Reference the documents you'll attach as evidence.</div>
                </div>
              )}

              {state.phase === "objective" && (
                <div>
                  <div className="postmark w-fit">5 · Objective</div>
                  <h3 className="mt-4 font-serif text-3xl">What do you want the response to accomplish?</h3>
                  <p className="mt-3 text-muted-foreground">State your objective clearly. This guides the response strategy.</p>
                  {cp2000Strategy && (
                    <div className="mt-4 rounded-lg border border-rule/60 bg-card p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-stamp">Response Strategy</div>
                      <div className="mt-2 text-sm"><span className="font-medium text-foreground">Position: {STRATEGY_POSITION_LABELS[cp2000Strategy.position]}</span><span className="ml-2 text-xs text-muted-foreground">Confidence: {cp2000Strategy.confidence}</span></div>
                      {cp2000Strategy.issues.length > 0 && (<div className="mt-2"><div className="text-xs font-medium text-muted-foreground">Issues to address:</div><ul className="mt-1 space-y-0.5">{cp2000Strategy.issues.map((issue, i) => (<li key={i} className="text-sm text-foreground">• {issue}</li>))}</ul></div>)}
                      {cp2000Strategy.requestedActions.length > 0 && (<div className="mt-2"><div className="text-xs font-medium text-muted-foreground">Recommended actions:</div><ul className="mt-1 space-y-0.5">{cp2000Strategy.requestedActions.map((action, i) => (<li key={i} className="text-sm text-foreground">• {action}</li>))}</ul></div>)}
                      {cp2000Strategy.riskFlags.length > 0 && (<div className="mt-2"><div className="text-xs font-medium text-amber-700">Risk flags:</div><ul className="mt-1 space-y-0.5">{cp2000Strategy.riskFlags.map((risk, i) => (<li key={i} className="text-sm text-amber-800">⚠ {risk}</li>))}</ul></div>)}
                      <button onClick={() => update((s) => setUserObjective(s, STRATEGY_POSITION_LABELS[cp2000Strategy.position] + (cp2000Strategy.requestedActions.length > 0 ? `: ${cp2000Strategy.requestedActions[0]}` : "")))} className="mt-3 rounded-full border border-rule px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">Use this strategy</button>
                    </div>
                  )}
                  {strategies.length > 0 && !cp2000Strategy && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Suggested strategies based on the notice type</div>
                      {strategies.slice(0, 4).map((strat) => (
                        <button key={strat.type} onClick={() => update((s) => setUserObjective(s, STRATEGY_TYPE_LABELS[strat.type] ?? strat.type))} className="block w-full rounded-lg border border-rule/60 p-3 text-left text-sm hover:border-stamp/40 hover:bg-paper-deep/30 transition-colors"><span className="font-medium text-foreground">{STRATEGY_TYPE_LABELS[strat.type] ?? strat.type}</span><span className="mt-0.5 block text-xs text-muted-foreground">{strat.description}</span></button>
                      ))}
                    </div>
                  )}
                  <textarea className="input-field mt-6 min-h-40" value={state.userObjective} onChange={(e) => update((s) => setUserObjective(s, e.target.value))} placeholder="Example: I want to explain that the income discrepancy was caused by a corrected W-2 and provide the corrected documentation to show the proper income amount…" />
                </div>
              )}

              {state.phase === "draft" && (
                <div>
                  <div className="postmark w-fit">6 · Draft</div>
                  <h3 className="mt-4 font-serif text-3xl">Your response letter</h3>
                  <p className="mt-3 text-muted-foreground">Review every fact, name, date, and statement. This is editable — change anything. We've validated the draft against the extracted facts.</p>
                  {state.draftValidation && !state.draftValidation.passed && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Validation findings ({state.draftValidation.errors} errors, {state.draftValidation.warnings} warnings)</div>
                      <ul className="mt-2 space-y-1">{state.draftValidation.findings.filter((f) => !f.passed).map((f, i) => (<li key={i} className={`text-sm ${f.severity === "error" ? "text-destructive" : "text-amber-800"}`}>{f.severity === "error" ? "✗" : "⚠"} {f.detail}</li>))}</ul>
                    </div>
                  )}
                  {state.draftValidation?.passed && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">✓ Draft passed all validation checks.</div>}
                  <textarea className="input-field mt-6 min-h-72 font-mono text-sm leading-6" value={state.draft} onChange={(e) => update((s) => setDraft(s, e.target.value))} />
                  {draftProvenance && (
                    <div className="mt-4 rounded-lg border border-rule/60 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-stamp">Draft Provenance</div>
                      <div className="mt-2 flex gap-4 text-xs">
                        <span className="text-emerald-600">✓ Supported: {draftProvenance.supported}</span>
                        <span className="text-amber-600">⚠ Unsupported: {draftProvenance.unsupported}</span>
                        <span className="text-destructive">✗ Blocking: {draftProvenance.blocking}</span>
                        <span className={draftProvenance.safeForApproval ? "text-emerald-600" : "text-destructive"}>{draftProvenance.safeForApproval ? "✓ Safe for approval" : "✗ Not safe for approval"}</span>
                      </div>
                      {draftProvenance.assertions.filter(a => a.support === "unsupported" || a.support === "placeholder").length > 0 && (
                        <ul className="mt-2 space-y-1">{draftProvenance.assertions.filter(a => a.support === "unsupported" || a.support === "placeholder").map((a, i) => (<li key={i} className={`text-sm ${a.blocking ? "text-destructive" : "text-amber-700"}`}>{a.blocking ? "✗" : "⚠"} {a.reason ?? a.text}</li>))}</ul>
                      )}
                    </div>
                  )}
                  <button onClick={async () => {
                    if (llmAnalysis.llmAnalysis) {
                      const res = await fetch('/api/workflows/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId: 'cp2000-response', analysis: llmAnalysis.llmAnalysis, userFacts: state.userFacts, userObjective: state.userObjective, documentText: state.upload?.rawText }) });
                      if (res.ok) { const data = await res.json(); update((s) => setDraft(s, data.draft)); if (data.validation) update((s) => setDraftValidation(s, data.validation)); }
                    }
                  }} disabled={!llmAnalysis.llmAnalysis} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30">✦ Generate with AI</button>
                  <button onClick={handleGenerateDraft} className="mt-4 ml-2 rounded-full border border-rule px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Regenerate draft (template)</button>
                </div>
              )}

              {state.phase === "review" && (
                <div>
                  <div className="postmark w-fit">7 · Review</div>
                  <h3 className="mt-4 font-serif text-3xl">Review before anything is mailed</h3>
                  <p className="mt-3 text-muted-foreground">Please confirm each item below.</p>
                  <ReviewChecks items={definition.ux?.reviewChecks ?? []} checks={state.reviewChecks} setChecks={(fn) => update((s) => setReviewChecks(s, fn(state.reviewChecks)))} />
                  {state.reviewChecks.every(Boolean) && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">✓ All checks confirmed. You can proceed to the next step.</div>}
                </div>
              )}

              {state.phase === "attachments" && (
                <div>
                  <div className="postmark w-fit">8 · Documents</div>
                  <h3 className="mt-4 font-serif text-3xl">Add supporting documents</h3>
                  <p className="mt-3 text-muted-foreground">Attach any documents referenced in your response — W-2s, 1099s, return transcripts, corrected forms, etc.</p>
                  <label className="upload-zone mt-6 block cursor-pointer">
                    <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    <span className="mt-3 block font-medium text-foreground">Add attachments</span>
                    <span className="mt-1 block text-xs text-muted-foreground">Forms, receipts, evidence, prior correspondence</span>
                    <input type="file" accept="application/pdf,image/jpeg,image/png" multiple className="sr-only" />
                  </label>
                  <div className="mt-4 text-sm text-muted-foreground">Required evidence: {definition.evidence.filter(e => e.required).map(e => e.label).join(", ")}</div>
                </div>
              )}

              {state.phase === "recipient" && (
                <div>
                  <div className="postmark w-fit">9 · Recipient</div>
                  <h3 className="mt-4 font-serif text-3xl">Where should we send it?</h3>
                  <p className="mt-3 text-muted-foreground">Enter the IRS mailing address from the CP2000 notice. The response address should be printed on the notice.</p>
                  {cp2000Extraction?.responseAddress && <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground"><strong>Extracted address:</strong> {cp2000Extraction.responseAddress}</div>}
                  <RecipientForm recipient={state.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }} setRecipient={(fn) => update((s) => setMailing(s, { ...s.mailing ?? { method: "certified", recipient: fn({ name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }), status: "not_started" }, recipient: fn(s.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }), }))} orgPlaceholder="IRS — Department of the Treasury" />
                </div>
              )}

              {state.phase === "mailing" && (
                <div>
                  <div className="postmark w-fit">10 · Mail</div>
                  <h3 className="mt-4 font-serif text-3xl">Choose your mail type</h3>
                  <p className="mt-3 text-muted-foreground">For IRS responses, Certified mail is recommended for proof of timely submission.</p>
                  <MailOptions selected={state.mailing?.method ?? "certified"} onSelect={(id) => update((s) => setMailing(s, { ...s.mailing ?? { recipient: { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }, status: "not_started" }, method: id, }))} />
                </div>
              )}

              {(state.phase === "checkout" || state.phase === "submitted") && (
                <MailingFunnel draft={state.draft} workflowId={definition.id} workflowTitle={definition.title} recipient={state.mailing?.recipient ?? null} extractionRef={cp2000Extraction?.noticeNumber ?? null} taxYear={cp2000Extraction?.taxYear ?? null} mailOptions={definition.ux?.mailOptions ?? MAIL_OPTIONS} disclaimer={definition.ux?.disclaimerText ?? definition.disclaimer} onMailingStateChange={(s) => { setMailingFunnelState(s); if (s.phase === "submitted") { update((st) => setMailing(st, { method: s.method, recipient: s.recipient, status: "submitted", providerOrderId: s.providerOrderId ?? undefined, trackingNumber: s.trackingNumber ?? undefined, })); } }} />
              )}

              {state.phase !== "checkout" && state.phase !== "submitted" && (
                <div className="mt-8 flex items-center justify-between">
                  <button onClick={back} disabled={state.step === 0} className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30">← Back</button>
                  <button onClick={next} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:transform-none disabled:shadow-none">{state.phase === "checkout" ? "Pay and send" : "Continue"} →</button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Questions & answers</div>
            <h2 className="mt-3 font-serif text-3xl">Frequently asked questions</h2>
            {definition.seo?.faq ? (
              <div className="mt-6 space-y-4">
                {definition.seo.faq.map((item, i) => (
                  <div key={i} className="rounded-lg border border-rule bg-card p-5">
                    <h3 className="font-medium text-foreground">{item.question}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-6">{item.answer}</p>
                  </div>
                ))}
              </div>
            ) : (
              <FAQSection workflowId="cp2000-response" />
            )}
          </div>
        </section>

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
              <RelatedCard href="/workflows/cp14-response" title="CP14 — Balance Due" desc="First collection notice for unpaid taxes" />
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

function ExtractedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
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
