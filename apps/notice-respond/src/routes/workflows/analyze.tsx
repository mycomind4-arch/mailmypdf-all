import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NarrationButton, DictationInput, VoiceBadge } from "@/components/voice-controls";
import { extractFromText } from "@/platform/notice-extraction";
import { classifyNoticeType, NOTICE_TYPE_META } from "@/domain/notice-type";
import { computeDeadlineDate, daysUntil, deadlineUrgency, URGENCY_META, createDeadline, validateDeadline } from "@/domain/deadline";
import { createFact } from "@/domain/fact";
import { createEvidence } from "@/domain/evidence";
import { runReadinessReview } from "@/domain/readiness";
import { recommendStrategies, STRATEGY_TYPE_LABELS } from "@/domain/strategy";
import { generateResponseDraft } from "@/domain/response";
import { createCase, updateCase, type NoticeCase } from "@/domain/notice";
import {
  buildAnalysisNarration,
  buildDeadlineNarration,
  buildWalkthroughNarration,
  buildStrategyNarration,
  type WalkthroughStep,
} from "@/domain/voice";
import { NarrationController, loadVoiceSettings } from "@/platform/speech";

// New intelligence modules
import { classifyContent, wrapDocumentForAI, validateTextInput } from "@/domain/security";
import { detectContradictions, resolveContradiction, contradictionSummary, type Contradiction } from "@/domain/contradiction";
import { detectMissingInfo, resolveMissingInfo, missingInfoSummary, type MissingInfoItem } from "@/domain/missing-info";
import { assessCaseHealth, HEALTH_STATUS_META } from "@/domain/health";
import { generateActionQueue, PRIORITY_META } from "@/domain/next-action";
import { evaluateResponseQuality } from "@/domain/quality";
import { explainDeadline, explainStrategy, explainResponse, explainReadiness } from "@/domain/explainability";
import { createVersionedResponse, addVersion, getVersionHistory, type VersionedResponse } from "@/domain/versioning";
import { AuditLog } from "@/domain/audit";
import { getRepository } from "@/platform/repository";
import { transitionStatus } from "@/domain/notice";
import { getOwnerId } from "@/platform/owner-context";
import { executeSave, type SaveStatus, initialSaveStatus } from "@/platform/save-state";

export const Route = createFileRoute("/workflows/analyze")({
  head: () => ({
    meta: [
      { rel: 'canonical', href: '/workflows/analyze' },
      { title: "Analyze a Notice — Notice Respond" },
      { name: "description", content: "Upload or paste a notice. Get instant analysis with voice narration, deadline tracking, and response drafting." },
    ],
  }),
  component: AnalyzeNotice,
});

type Phase = "input" | "analysis" | "strategy" | "draft";

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  { stepNumber: 1, title: "Input the Notice", description: "Paste the notice text or upload a document to begin analysis.", isCurrent: true, isComplete: false },
  { stepNumber: 2, title: "Review Analysis", description: "The system extracts facts, identifies deadlines, and assesses case readiness.", isCurrent: false, isComplete: false },
  { stepNumber: 3, title: "Choose a Strategy", description: "Select from recommended response strategies based on the analysis.", isCurrent: false, isComplete: false },
  { stepNumber: 4, title: "Generate Response", description: "Review and edit the generated response letter, then proceed to mailing.", isCurrent: false, isComplete: false },
];

function AnalyzeNotice() {
  const [phase, setPhase] = useState<Phase>("input");
  const [noticeText, setNoticeText] = useState("");
  const [userObjective, setUserObjective] = useState("");
  const [userFacts, setUserFacts] = useState("");
  const [selectedStrategyIdx, setSelectedStrategyIdx] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoNarrated, setAutoNarrating] = useState(false);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [missingItems, setMissingItems] = useState<MissingInfoItem[]>([]);
  const [showWhyDeadline, setShowWhyDeadline] = useState(false);
  const [showWhyStrategy, setShowWhyStrategy] = useState<number | null>(null);
  const [showWhyResponse, setShowWhyResponse] = useState(false);
  const [showWhyHealth, setShowWhyHealth] = useState(false);
  const [versionedResponse, setVersionedResponse] = useState<VersionedResponse | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(initialSaveStatus);

  const caseRef = useRef<NoticeCase | null>(null);
  const auditLogRef = useRef(new AuditLog());

  // Security classification of input
  const securityCheck = useMemo(() => {
    if (!noticeText.trim()) return null;
    return classifyContent(noticeText, "untrusted");
  }, [noticeText]);

  // Input validation
  const inputValidation = useMemo(() => {
    if (!noticeText.trim()) return null;
    return validateTextInput(noticeText);
  }, [noticeText]);

  // Run analysis
  const analysis = useMemo(() => {
    if (!noticeText.trim()) return null;

    const extraction = extractFromText(noticeText);
    const classification = classifyNoticeType(noticeText);
    const deadline = extraction.deadlines[0]?.deadline || createDeadline({ type: "response", certainty: "missing" });
    const dUntil = deadline.date ? daysUntil(deadline.date) : null;
    const urgency = deadline.date ? deadlineUrgency(deadline.date) : "unknown";

    const confirmedFacts = extraction.facts.filter((f) => f.userConfirmed || f.confidence === "high");

    const readiness = runReadinessReview({
      noticeType: classification.type,
      noticeDate: extraction.noticeDate || undefined,
      agency: extraction.agency || undefined,
      referenceNumber: extraction.referenceNumber || undefined,
      deadline,
      facts: extraction.facts,
      evidence: [],
      findings: [],
      draft: "",
      recipient: { name: "", address1: "", city: "", state: "", zip: "" },
      hasSignature: false,
    });

    const strategies = recommendStrategies({
      noticeType: classification.type,
      hasDeadline: !!deadline.date,
      deadlineExpired: urgency === "expired",
      hasContradictions: false,
      hasUnsupportedAllegations: false,
      hasEvidence: false,
      hasMissingInformation: readiness.issuesRequiringAttention > 3,
      hasProceduralIssues: false,
      hasPaymentDemand: !!extraction.amountOwed,
      hasAppealRights: !!extraction.appealRights,
      factConfidence: extraction.extractionConfidence > 0.7 ? "high" : "medium",
    });

    const noticeCase = updateCase(createCase("analyze"), { ownerId: getOwnerId() });
    caseRef.current = updateCase(noticeCase, {
      noticeType: classification.type,
      typeConfidence: classification.confidence,
      category: NOTICE_TYPE_META[classification.type]?.category || "other",
      agency: extraction.agency || undefined,
      referenceNumber: extraction.referenceNumber || undefined,
      noticeDate: extraction.noticeDate || undefined,
      facts: extraction.facts,
      deadlines: extraction.deadlines.map((d) => d.deadline),
      strategies,
      readinessScore: readiness.score,
      readinessState: readiness.state as any,
    });

    // Detect contradictions
    const detectedContradictions = detectContradictions({
      facts: extraction.facts,
      userFacts: userFacts || undefined,
      evidence: [],
      deadlines: extraction.deadlines.map((d) => ({ date: d.deadline.date, rawText: d.deadline.rawText, certainty: d.deadline.certainty })),
    });

    // Detect missing information
    const detectedMissing = detectMissingInfo({
      facts: extraction.facts.map((f) => ({ id: f.id, label: f.label, value: f.value, confidence: f.confidence, userConfirmed: f.userConfirmed })),
      deadlines: [{ date: deadline.date, certainty: deadline.certainty }],
      evidence: [],
      agency: extraction.agency || undefined,
      referenceNumber: extraction.referenceNumber || undefined,
      noticeDate: extraction.noticeDate || undefined,
    });

    // Assess case health
    const health = assessCaseHealth({
      facts: extraction.facts.map((f) => ({ id: f.id, label: f.label, value: f.value, confidence: f.confidence, userConfirmed: f.userConfirmed })),
      evidence: [],
      deadlines: [{ date: deadline.date, certainty: deadline.certainty }],
      findings: [],
      contradictions: detectedContradictions.map((c) => ({ status: c.status, severity: c.severity })),
      missingInfo: detectedMissing.map((m) => ({ status: m.status, impact: m.impact })),
      readinessScore: readiness.score,
      readinessState: readiness.state,
      hasDraft: false,
      draftWordCount: 0,
    });

    // Generate action queue
    const actionQueue = generateActionQueue({
      readinessState: readiness.state,
      readinessScore: readiness.score,
      deadlineUrgency: urgency,
      deadlineDaysRemaining: dUntil,
      contradictions: detectedContradictions.map((c) => ({ status: c.status, severity: c.severity, field: c.field, description: c.description })),
      missingInfo: detectedMissing.map((m) => ({ status: m.status, impact: m.impact, label: m.label, whyItMatters: m.whyItMatters, field: m.field })),
      facts: extraction.facts.map((f) => ({ confidence: f.confidence, userConfirmed: f.userConfirmed, label: f.label })),
      evidenceCount: 0,
      hasDraft: false,
      draftPlaceholders: 0,
    });

    // Audit log
    auditLogRef.current.record({
      actor: "user",
      action: "document_processed",
      objectType: "notice",
      description: `Notice analyzed: ${classification.type} from ${extraction.agency || "unknown agency"}`,
      caseId: noticeCase.id,
      metadata: { factCount: extraction.facts.length, strategyCount: strategies.length },
    });

    if (detectedContradictions.length > 0) {
      auditLogRef.current.record({
        actor: "system",
        action: "contradiction_detected",
        objectType: "contradiction",
        description: `${detectedContradictions.length} contradiction(s) detected`,
        caseId: noticeCase.id,
        metadata: { count: detectedContradictions.length },
      });
    }

    return {
      extraction,
      classification,
      deadline,
      dUntil,
      urgency,
      confirmedFacts,
      readiness,
      strategies,
      contradictions: detectedContradictions,
      missingItems: detectedMissing,
      health,
      actionQueue,
      deadlineValidation: validateDeadline(deadline),
    };
  }, [noticeText, userFacts]);

  // Update contradictions and missing items when analysis changes
  useEffect(() => {
    if (analysis) {
      setContradictions(analysis.contradictions);
      setMissingItems(analysis.missingItems);
    }
  }, [analysis]);

  // Persist case to repository after analysis — errors are surfaced, not swallowed
  useEffect(() => {
    if (!caseRef.current || !analysis) return;
    const ownerId = getOwnerId();
    const repo = getRepository();
    const updated = updateCase(caseRef.current, {
      status: "analyzed",
      contradictions: analysis.contradictions,
      missingInfo: analysis.missingItems,
      healthScore: analysis.health.overallScore,
      healthStatus: analysis.health.status,
      healthSummary: analysis.health.summary,
      actionQueue: analysis.actionQueue,
    });
    caseRef.current = updated;
    
    const doSave = async () => {
      setSaveStatus({ state: "saving", retryCount: saveStatus.retryCount });
      const { status } = await executeSave(
        () => repo.save(updated),
        saveStatus,
      );
      setSaveStatus(status);
      // Flush audit entries to repository — also surfaced
      if (status.state === "saved") {
        for (const entry of auditLogRef.current.getAll()) {
          try {
            await repo.saveAudit(entry, ownerId);
          } catch (err) {
            // Audit save failure is logged but does not block case save
            console.error("Audit entry save failed:", err);
          }
        }
      }
    };
    doSave();
  }, [analysis]);

  // Voice narration scripts
  const analysisNarration = useMemo(() => {
    if (!analysis) return null;
    return buildAnalysisNarration({
      noticeType: analysis.classification.type,
      noticeTypeLabel: NOTICE_TYPE_META[analysis.classification.type]?.label,
      agency: analysis.extraction.agency || undefined,
      referenceNumber: analysis.extraction.referenceNumber || undefined,
      noticeDate: analysis.extraction.noticeDate || undefined,
      deadlineDate: analysis.deadline.date,
      deadlineUrgency: analysis.urgency,
      deadlineUrgencyLabel: URGENCY_META[analysis.urgency]?.label,
      factCount: analysis.extraction.facts.length,
      confirmedFactCount: analysis.confirmedFacts.length,
      evidenceCount: 0,
      findingCount: analysis.readiness.issuesRequiringAttention,
      readinessState: analysis.readiness.state,
      readinessScore: analysis.readiness.score,
      strategyCount: analysis.strategies.length,
    });
  }, [analysis]);

  const deadlineNarration = useMemo(() => {
    if (!analysis?.deadline.date) return null;
    return buildDeadlineNarration(
      analysis.deadline.date,
      analysis.dUntil,
      URGENCY_META[analysis.urgency]?.label || "Unknown",
    );
  }, [analysis]);

  const handleAnalyze = useCallback(() => {
    if (!noticeText.trim()) return;
    if (inputValidation && !inputValidation.valid) return;
    auditLogRef.current.record({
      actor: "user",
      action: "document_uploaded",
      objectType: "document",
      description: "Notice text submitted for analysis",
    });
    setPhase("analysis");
  }, [noticeText, inputValidation]);

  const handleSelectStrategy = useCallback((idx: number) => {
    setSelectedStrategyIdx(idx);
    auditLogRef.current.record({
      actor: "user",
      action: "strategy_selected",
      objectType: "strategy",
      description: `Strategy selected: ${analysis?.strategies[idx]?.type || "unknown"}`,
    });
    // Persist case with in_progress status — surfaced, not swallowed
    if (caseRef.current) {
      const updated = transitionStatus(caseRef.current, "in_progress");
      caseRef.current = updated;
      const ownerId = getOwnerId();
      setSaveStatus({ state: "saving", retryCount: saveStatus.retryCount });
      executeSave(() => getRepository().save(updated), saveStatus)
        .then(({ status }) => setSaveStatus(status));
    }
    setPhase("draft");
  }, [analysis, saveStatus]);

  // Draft generation
  const draft = useMemo(() => {
    if (!analysis || selectedStrategyIdx === null || !analysis.strategies[selectedStrategyIdx]) return null;
    return generateResponseDraft({
      agency: analysis.extraction.agency || undefined,
      referenceNumber: analysis.extraction.referenceNumber || undefined,
      noticeDate: analysis.extraction.noticeDate || undefined,
      facts: analysis.extraction.facts,
      deadline: analysis.deadline,
      selectedStrategy: analysis.strategies[selectedStrategyIdx],
      userObjective: userObjective || undefined,
      userFacts: userFacts || undefined,
      hasSignature: true,
    });
  }, [analysis, selectedStrategyIdx, userObjective, userFacts]);

  // Quality evaluation
  const qualityReport = useMemo(() => {
    if (!draft || !analysis) return null;
    return evaluateResponseQuality({
      draftContent: draft.content,
      facts: analysis.extraction.facts.map((f) => ({ id: f.id, label: f.label, value: f.value, confidence: f.confidence, userConfirmed: f.userConfirmed })),
      evidence: [],
      deadline: { date: analysis.deadline.date, certainty: analysis.deadline.certainty },
      agency: analysis.extraction.agency || undefined,
      referenceNumber: analysis.extraction.referenceNumber || undefined,
      noticeDate: analysis.extraction.noticeDate || undefined,
      selectedStrategyType: analysis.strategies[selectedStrategyIdx || 0]?.type,
      userObjective: userObjective || undefined,
      unresolvedPlaceholders: draft.unresolvedPlaceholders.map((p) => ({ placeholder: p.placeholder, reason: p.reason })),
    });
  }, [draft, analysis, selectedStrategyIdx, userObjective]);

  // Versioned response tracking
  useEffect(() => {
    if (draft && analysis) {
      if (!versionedResponse) {
        const vr = createVersionedResponse(caseRef.current?.id || "temp");
        const updated = addVersion(vr, {
          content: draft.content,
          strategyType: analysis.strategies[selectedStrategyIdx || 0]?.type,
          strategyId: analysis.strategies[selectedStrategyIdx || 0]?.id,
          sourceFactIds: analysis.extraction.facts.map((f) => f.id),
          unresolvedPlaceholders: draft.unresolvedPlaceholders.length,
          changeDescription: "Initial draft",
        });
        setVersionedResponse(updated);
        auditLogRef.current.record({
          actor: "system",
          action: "response_generated",
          objectType: "response",
          description: `Response draft generated (v1, ${draft.wordCount} words)`,
        });
        // Persist case with final response — surfaced, not swallowed
        if (caseRef.current) {
          const caseUpdate = updateCase(caseRef.current, {
            finalResponse: draft.content,
            responseVersioning: updated,
            userObjective: userObjective,
            userFacts: userFacts,
          });
          caseRef.current = caseUpdate;
          const ownerId = getOwnerId();
          setSaveStatus({ state: "saving", retryCount: saveStatus.retryCount });
          executeSave(() => getRepository().save(caseUpdate), saveStatus)
            .then(({ status }) => setSaveStatus(status));
        }
      }
    }
  }, [draft, analysis, selectedStrategyIdx, saveStatus]);

  const walkthrough = useMemo(() => {
    return WALKTHROUGH_STEPS.map((s, i) => ({
      ...s,
      isCurrent:
        (phase === "input" && i === 0) ||
        (phase === "analysis" && i === 1) ||
        (phase === "strategy" && i === 2) ||
        (phase === "draft" && i === 3),
      isComplete:
        (phase === "analysis" && i === 0) ||
        (phase === "strategy" && i < 2) ||
        (phase === "draft" && i < 3),
    }));
  }, [phase]);

  const walkthroughNarration = useMemo(() => buildWalkthroughNarration(walkthrough), [walkthrough]);

  // Resolve contradiction
  const handleResolveContradiction = useCallback((idx: number, value: string) => {
    setContradictions((prev) => {
      const updated = [...prev];
      updated[idx] = resolveContradiction(updated[idx], value, "user");
      return updated;
    });
    auditLogRef.current.record({
      actor: "user",
      action: "contradiction_resolved",
      objectType: "contradiction",
      description: `Contradiction resolved with value: ${value.substring(0, 50)}`,
    });
  }, []);

  // Resolve missing info
  const handleResolveMissingInfo = useCallback((idx: number, value: string) => {
    setMissingItems((prev) => {
      const updated = [...prev];
      updated[idx] = resolveMissingInfo(updated[idx], value);
      return updated;
    });
    auditLogRef.current.record({
      actor: "user",
      action: "missing_info_resolved",
      objectType: "missing_info",
      description: `Missing info resolved: ${value.substring(0, 50)}`,
    });
  }, []);

  const contrSummary = useMemo(() => contradictionSummary(contradictions), [contradictions]);
  const missingSummary = useMemo(() => missingInfoSummary(missingItems), [missingItems]);

  return (
    <div className="min-h-screen command-center">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-10" role="main">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="postmark w-fit">Analyze</div>
              <VoiceBadge active={true} />
            </div>
            <h1 className="mt-3 font-serif text-4xl">Notice Analysis Studio</h1>
            <p className="mt-1 text-sm text-muted-foreground">Paste or upload a notice. Get instant analysis with voice narration.</p>
          </div>
          <NarrationButton script={walkthroughNarration} label="Walkthrough" />
        </div>

        {/* Save status indicator */}
        {saveStatus.state !== "idle" && (
          <div className="mt-4 flex items-center gap-3 text-sm" role="status" aria-live="polite">
            {saveStatus.state === "saving" && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Saving case…
              </span>
            )}
            {saveStatus.state === "saved" && (
              <span className="flex items-center gap-2 text-emerald-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Case saved
              </span>
            )}
            {saveStatus.state === "failed" && (
              <span className="flex items-center gap-2 text-destructive">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                Save failed{saveStatus.retryCount > 0 ? ` (attempt ${saveStatus.retryCount + 1})` : ""}: {saveStatus.error}
                <button
                  className="ml-2 rounded border border-input px-2 py-0.5 text-xs hover:bg-muted"
                  onClick={() => {
                    if (caseRef.current) {
                      setSaveStatus({ state: "saving", retryCount: saveStatus.retryCount });
                      executeSave(() => getRepository().save(caseRef.current!), saveStatus)
                        .then(({ status }) => setSaveStatus(status));
                    }
                  }}
                >
                  Retry
                </button>
              </span>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-6" role="navigation" aria-label="Workflow progress">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: phase === "input" ? "10%" : phase === "analysis" ? "40%" : phase === "strategy" ? "70%" : "95%" }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            {walkthrough.map((s) => (
              <span key={s.stepNumber} className={s.isCurrent ? "font-medium text-stamp" : s.isComplete ? "text-emerald-700" : ""}>
                {s.stepNumber}. {s.title}
              </span>
            ))}
          </div>
        </div>

        {/* Phase: Input */}
        {phase === "input" && (
          <div className="mt-8 space-y-6">
            <div className="envelope-card p-6">
              <h2 className="font-serif text-2xl mb-4">Paste the notice text</h2>
              <DictationInput
                value={noticeText}
                onChange={setNoticeText}
                field="noticeText"
                label="Notice content"
                placeholder="Paste the full text of the notice here, or use the microphone to dictate it..."
                multiline
                rows={10}
              />

              {/* Security indicator */}
              {securityCheck && securityCheck.detectedInjectionPatterns.length > 0 && (
                <div className="mt-4 rounded-md border border-red-300/60 bg-red-50/60 p-3" role="alert">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.999 2.878 2.748 2.878h9.11c1.749 0 2.614-1.378 1.748-2.878L13.748 3.376c-.866-1.5-2.63-1.5-3.496 0L3.697 8.376zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <span className="text-sm font-medium text-red-700">
                      Security notice: {securityCheck.detectedInjectionPatterns.length} potential injection pattern(s) detected
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-red-600">
                    Document content will be treated as data, not instructions. Patterns: {securityCheck.detectedInjectionPatterns.join(", ")}
                  </p>
                </div>
              )}

              {/* Input validation warnings */}
              {inputValidation && inputValidation.warnings.length > 0 && securityCheck?.detectedInjectionPatterns.length === 0 && (
                <div className="mt-4 rounded-md border border-amber-300/50 bg-amber-50/50 p-3">
                  <p className="text-xs text-amber-700">{inputValidation.warnings.join("; ")}</p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={!noticeText.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Analyze the notice text"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.055-.75.095m.75-.099a48.05 48.05 0 0 1 9 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5" />
                  </svg>
                  Analyze Notice
                </button>
                <span className="text-xs text-muted-foreground">
                  Or try a sample:{" "}
                  <button
                    className="text-stamp underline hover:no-underline"
                    onClick={() => setNoticeText(SAMPLE_NOTICE)}
                  >
                    Load IRS CP2000 sample
                  </button>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Phase: Analysis */}
        {phase === "analysis" && analysis && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Analysis Results</h2>
              <div className="flex items-center gap-3">
                <NarrationButton script={analysisNarration} label="Listen to summary" />
                {deadlineNarration && <NarrationButton script={deadlineNarration} label="Deadline alert" compact />}
              </div>
            </div>

            {/* Case Health Dashboard */}
            <div className="envelope-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg">Case Health</h3>
                <button
                  onClick={() => setShowWhyHealth(!showWhyHealth)}
                  className="text-xs text-stamp underline hover:no-underline"
                  aria-label="Show explanation of case health"
                >
                  Why?
                </button>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="text-center">
                  <div className={`font-mono text-3xl ${analysis.health.overallScore >= 80 ? "text-emerald-600" : analysis.health.overallScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {analysis.health.overallScore}
                  </div>
                  <div className="text-xs text-muted-foreground">/100</div>
                </div>
                <div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    analysis.health.status === "ready" ? "bg-emerald-100 text-emerald-700" :
                    analysis.health.status === "needs_review" ? "bg-amber-100 text-amber-700" :
                    analysis.health.status === "incomplete" ? "bg-yellow-100 text-yellow-700" :
                    analysis.health.status === "conflicting" ? "bg-red-100 text-red-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {HEALTH_STATUS_META[analysis.health.status]?.label}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{HEALTH_STATUS_META[analysis.health.status]?.description}</p>
                </div>
              </div>

              {/* Health dimensions */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {analysis.health.dimensions.map((dim) => (
                  <div key={dim.name} className="border border-rule/30 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{dim.label}</span>
                      <span className={`text-xs font-mono ${
                        dim.status === "good" ? "text-emerald-600" :
                        dim.status === "warning" ? "text-amber-600" :
                        dim.status === "poor" ? "text-red-600" :
                        "text-gray-400"
                      }`}>{dim.score}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{dim.detail}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground italic">Scores are heuristic-based, not statistically validated.</p>

              {/* Why health? */}
              {showWhyHealth && (
                <div className="mt-4 rounded-md bg-muted/50 p-4">
                  <h4 className="text-sm font-medium">Why this health score?</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{analysis.health.summary}</p>
                </div>
              )}
            </div>

            {/* Next Best Actions */}
            {analysis.actionQueue.length > 0 && (
              <div className="envelope-card p-5">
                <h3 className="font-serif text-lg mb-3">Next Best Actions</h3>
                <div className="space-y-2">
                  {analysis.actionQueue.slice(0, 5).map((action) => (
                    <div key={action.id} className="flex items-start gap-3 border-b border-rule/30 pb-2 last:border-0">
                      <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                        action.priority === "critical" ? "bg-red-100 text-red-700" :
                        action.priority === "high" ? "bg-amber-100 text-amber-700" :
                        action.priority === "medium" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {PRIORITY_META[action.priority]?.label}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.why}</p>
                        <p className="mt-0.5 text-xs text-stamp">{action.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notice type badge */}
            <div className="envelope-card p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Notice Type</div>
              <div className="mt-1 flex items-center gap-3">
                <span className="font-serif text-2xl">{NOTICE_TYPE_META[analysis.classification.type]?.label || "Unknown"}</span>
                <span className="rounded-full bg-stamp/10 px-2 py-0.5 text-xs font-mono text-stamp">
                  {Math.round(analysis.classification.confidence * 100)}% confidence
                </span>
              </div>
              {NOTICE_TYPE_META[analysis.classification.type]?.description && (
                <p className="mt-2 text-sm text-muted-foreground">{NOTICE_TYPE_META[analysis.classification.type].description}</p>
              )}
            </div>

            {/* Deadline card */}
            {analysis.deadline.date && (
              <div className={`envelope-card p-5 border-l-4 ${analysis.urgency === "expired" || analysis.urgency === "critical" ? "border-l-red-500" : analysis.urgency === "urgent" ? "border-l-amber-500" : "border-l-stamp"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Response Deadline</div>
                      <button
                        onClick={() => setShowWhyDeadline(!showWhyDeadline)}
                        className="text-xs text-stamp underline hover:no-underline"
                        aria-label="Show deadline explanation"
                      >
                        Why?
                      </button>
                    </div>
                    <div className="mt-1 font-serif text-2xl">{analysis.deadline.date}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Certainty: <span className="font-mono">{analysis.deadline.certainty}</span>
                      {analysis.deadline.calculationMethod && ` · ${analysis.deadline.calculationMethod}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${URGENCY_META[analysis.urgency]?.color === "red" ? "text-red-600" : URGENCY_META[analysis.urgency]?.color === "amber" ? "text-amber-600" : "text-stamp"}`}>
                      {URGENCY_META[analysis.urgency]?.label}
                    </div>
                    {analysis.dUntil !== null && (
                      <div className="text-xs text-muted-foreground">
                        {analysis.dUntil < 0 ? `${Math.abs(analysis.dUntil)} days ago` : `${analysis.dUntil} days remaining`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Deadline validation warnings */}
                {analysis.deadlineValidation.warnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {analysis.deadlineValidation.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-600">⚠ {w}</p>
                    ))}
                  </div>
                )}

                {/* Why deadline? */}
                {showWhyDeadline && (
                  <div className="mt-3 rounded-md bg-muted/50 p-4">
                    {(() => {
                      const exp = explainDeadline({
                        date: analysis.deadline.date,
                        source: analysis.deadline.sourceExcerpt,
                        calculationMethod: analysis.deadline.calculationMethod,
                        certainty: analysis.deadline.certainty,
                        startDate: analysis.deadline.startDate,
                        daysWindow: analysis.deadline.daysWindow,
                        businessDays: analysis.deadline.businessDays,
                      });
                      return (
                        <>
                          <h4 className="text-sm font-medium">{exp.title}</h4>
                          <p className="mt-1 text-xs text-muted-foreground">{exp.summary}</p>
                          <div className="mt-2 space-y-1">
                            {exp.steps.map((step, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-medium text-ink">{step.label}:</span>{" "}
                                <span className="text-muted-foreground">{step.detail}</span>
                                {step.confidence && (
                                  <span className="ml-1 text-muted-foreground/60">({step.confidence})</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {exp.assumptions.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-ink">Assumptions:</span>
                              <ul className="ml-4">
                                {exp.assumptions.map((a, i) => (
                                  <li key={i} className="text-xs text-muted-foreground list-disc">{a}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="mt-2">
                  <NarrationButton script={deadlineNarration} label="Listen to deadline info" compact />
                </div>
              </div>
            )}

            {/* Contradictions */}
            {contradictions.length > 0 && (
              <div className="envelope-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg">Contradictions Detected</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${contrSummary.unresolved > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {contrSummary.unresolved} unresolved / {contrSummary.total} total
                  </span>
                </div>
                <div className="space-y-3">
                  {contradictions.map((c, idx) => (
                    <div key={c.id} className={`rounded-md border p-3 ${c.status === "unresolved" ? "border-red-300/50 bg-red-50/30" : "border-emerald-300/50 bg-emerald-50/30"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${c.severity === "critical" ? "bg-red-200 text-red-800" : c.severity === "high" ? "bg-amber-200 text-amber-800" : "bg-gray-200 text-gray-600"}`}>
                          {c.severity}
                        </span>
                        <span className="text-sm font-medium text-ink">{c.field}</span>
                        {c.status === "resolved" && <span className="text-xs text-emerald-600">✓ Resolved</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                      {c.status === "unresolved" && c.sources.length >= 2 && (
                        <div className="mt-2 flex items-center gap-2">
                          <select
                            className="rounded border border-rule/40 px-2 py-1 text-xs"
                            onChange={(e) => { if (e.target.value) handleResolveContradiction(idx, e.target.value); }}
                            defaultValue=""
                            aria-label={`Resolve contradiction for ${c.field}`}
                          >
                            <option value="" disabled>Select correct value...</option>
                            {c.sources.map((s) => (
                              <option key={s.sourceId} value={s.value}>{s.value}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Information */}
            {missingItems.filter((m) => m.status === "missing").length > 0 && (
              <div className="envelope-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg">Missing Information</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${missingSummary.blocking > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {missingSummary.blocking} blocking · {missingSummary.missing} total
                  </span>
                </div>
                <div className="space-y-3">
                  {missingItems.filter((m) => m.status === "missing").map((item, idx) => {
                    const realIdx = missingItems.indexOf(item);
                    return (
                      <div key={item.id} className={`rounded-md border p-3 ${item.impact === "blocking" ? "border-red-300/50 bg-red-50/30" : "border-amber-300/50 bg-amber-50/30"}`}>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${item.impact === "blocking" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"}`}>
                            {item.impact}
                          </span>
                          <span className="text-sm font-medium text-ink">{item.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{item.whyItMatters}</p>
                        {item.suggestedActions.length > 0 && (
                          <div className="mt-1">
                            <span className="text-xs font-medium text-stamp">Suggested:</span>
                            <ul className="ml-4">
                              {item.suggestedActions.map((a, i) => (
                                <li key={i} className="text-xs text-muted-foreground list-disc">{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Provide value..."
                            className="rounded border border-rule/40 px-2 py-1 text-xs flex-1"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.currentTarget.value) {
                                handleResolveMissingInfo(realIdx, e.currentTarget.value);
                                e.currentTarget.value = "";
                              }
                            }}
                            aria-label={`Resolve missing info: ${item.label}`}
                          />
                          <span className="text-xs text-muted-foreground">Press Enter to resolve</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extracted facts */}
            {analysis.extraction.facts.length > 0 && (
              <div className="envelope-card p-5">
                <h3 className="font-serif text-lg mb-3">Extracted Facts</h3>
                <div className="space-y-2">
                  {analysis.extraction.facts.map((fact) => (
                    <div key={fact.id} className="flex items-start justify-between border-b border-rule/40 pb-2 last:border-0">
                      <div>
                        <span className="text-sm font-medium text-ink">{fact.label}</span>
                        <p className="text-sm text-ink-soft">{fact.value}</p>
                        {fact.sourceExcerpt && (
                          <p className="mt-0.5 text-xs text-muted-foreground italic">Source: {fact.sourceExcerpt.substring(0, 100)}...</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${
                        fact.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                        fact.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {fact.confidence}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Readiness */}
            <div className="envelope-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-lg">Case Readiness</h3>
                <span className="font-mono text-2xl">{analysis.readiness.score}<span className="text-sm text-muted-foreground">/100</span></span>
              </div>
              <div className="progress-track mb-3">
                <div className="progress-fill" style={{ width: `${analysis.readiness.score}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  analysis.readiness.state === "ready" ? "bg-emerald-100 text-emerald-700" :
                  analysis.readiness.state === "blocked" ? "bg-red-100 text-red-700" :
                  analysis.readiness.state === "incomplete" ? "bg-amber-100 text-amber-700" :
                  "bg-stamp/10 text-stamp"
                }`}>
                  {analysis.readiness.state.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {analysis.readiness.issuesRequiringAttention} issues · {analysis.readiness.blockingIssues} blocking
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPhase("strategy")}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5"
              >
                View Strategies ({analysis.strategies.length})
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
              <button onClick={() => setPhase("input")} className="text-sm text-muted-foreground hover:text-foreground">
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Phase: Strategy */}
        {phase === "strategy" && analysis && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Response Strategies</h2>
              <button onClick={() => setPhase("analysis")} className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to analysis
              </button>
            </div>

            {analysis.strategies.map((strategy, idx) => {
              const stratNarration = buildStrategyNarration({
                label: STRATEGY_TYPE_LABELS[strategy.type],
                description: strategy.description,
                reason: strategy.reason,
                confidence: strategy.confidence,
                risks: strategy.risks,
                prerequisites: strategy.prerequisites,
              });
              return (
                <div key={strategy.id} className="envelope-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-lg">{STRATEGY_TYPE_LABELS[strategy.type]}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${
                          strategy.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                          strategy.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {strategy.confidence} confidence
                        </span>
                        <button
                          onClick={() => setShowWhyStrategy(showWhyStrategy === idx ? null : idx)}
                          className="text-xs text-stamp underline hover:no-underline"
                          aria-label={`Show explanation for ${STRATEGY_TYPE_LABELS[strategy.type]}`}
                        >
                          Why?
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-ink-soft">{strategy.description}</p>
                      {strategy.reason && <p className="mt-2 text-xs text-muted-foreground">{strategy.reason}</p>}
                      {strategy.risks.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-red-600">Risks:</span>
                          <ul className="mt-1 space-y-0.5">
                            {strategy.risks.map((risk, i) => (
                              <li key={i} className="text-xs text-muted-foreground">• {risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {strategy.prerequisites.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-amber-600">Prerequisites:</span>
                          <ul className="mt-1 space-y-0.5">
                            {strategy.prerequisites.map((prereq, i) => (
                              <li key={i} className="text-xs text-muted-foreground">• {prereq}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Why this strategy? */}
                      {showWhyStrategy === idx && (
                        <div className="mt-3 rounded-md bg-muted/50 p-4">
                          {(() => {
                            const exp = explainStrategy({
                              strategyType: strategy.type,
                              strategyLabel: STRATEGY_TYPE_LABELS[strategy.type],
                              reason: strategy.reason,
                              relevantFacts: analysis.extraction.facts.map((f) => ({ label: f.label, value: f.value })),
                              evidence: [],
                              constraints: strategy.prerequisites,
                              missingInfo: missingItems.filter((m) => m.status === "missing").map((m) => m.label),
                            });
                            return (
                              <>
                                <h4 className="text-sm font-medium">{exp.title}</h4>
                                <p className="mt-1 text-xs text-muted-foreground">{exp.summary}</p>
                                <div className="mt-2 space-y-1">
                                  {exp.steps.map((step, i) => (
                                    <div key={i} className="text-xs">
                                      <span className="font-medium text-ink">{step.label}:</span>{" "}
                                      <span className="text-muted-foreground">{step.detail}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <NarrationButton script={stratNarration} label="Listen" compact />
                      <button
                        onClick={() => handleSelectStrategy(idx)}
                        className="rounded-full border border-stamp px-4 py-1.5 text-xs font-medium text-stamp transition-colors hover:bg-stamp hover:text-accent-foreground"
                      >
                        Select →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <button onClick={() => setPhase("analysis")} className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to analysis
            </button>
          </div>
        )}

        {/* Phase: Draft */}
        {phase === "draft" && draft && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Your Response Draft</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowWhyResponse(!showWhyResponse)}
                  className="text-xs text-stamp underline hover:no-underline"
                >
                  Why?
                </button>
                <NarrationButton
                  script={{
                    id: "draft-narration",
                    mode: "narration",
                    title: "Response Draft",
                    segments: [{ id: "1", text: draft.content, role: "body" as const, priority: "normal" as const, pauseAfter: 400 }],
                    totalWords: draft.wordCount,
                    estimatedSeconds: Math.ceil(draft.wordCount / 2.5),
                    createdAt: new Date().toISOString(),
                  }}
                  label="Listen to draft"
                />
              </div>
            </div>

            {/* Version info */}
            {versionedResponse && (
              <div className="text-xs text-muted-foreground">
                Version {versionedResponse.currentVersionNumber} · {getVersionHistory(versionedResponse).length} version(s) in history
              </div>
            )}

            {/* Why this response? */}
            {showWhyResponse && analysis && (
              <div className="rounded-md bg-muted/50 p-4">
                {(() => {
                  const exp = explainResponse({
                    userObjective: userObjective || undefined,
                    noticeRequirements: analysis.deadline.date ? [`Respond by ${analysis.deadline.date}`] : [],
                    supportingEvidence: [],
                    strategyUsed: STRATEGY_TYPE_LABELS[analysis.strategies[selectedStrategyIdx || 0]?.type] || "selected",
                    factsIncluded: analysis.extraction.facts.length,
                    placeholdersRemaining: draft.unresolvedPlaceholders.length,
                  });
                  return (
                    <>
                      <h4 className="text-sm font-medium">{exp.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{exp.summary}</p>
                      <div className="mt-2 space-y-1">
                        {exp.steps.map((step, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-medium text-ink">{step.label}:</span>{" "}
                            <span className="text-muted-foreground">{step.detail}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* User inputs */}
            <div className="envelope-card p-5 space-y-4">
              <DictationInput
                value={userObjective}
                onChange={setUserObjective}
                field="objective"
                label="Your objective (what you want the response to accomplish)"
                placeholder="Example: Explain the income discrepancy and provide corrected documentation..."
                multiline
                rows={2}
              />
              <DictationInput
                value={userFacts}
                onChange={setUserFacts}
                field="facts"
                label="Additional facts from your records"
                placeholder="Enter any facts you want included that weren't extracted from the notice..."
                multiline
                rows={3}
              />
            </div>

            {/* Quality Report */}
            {qualityReport && (
              <div className="envelope-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg">Response Quality Report</h3>
                  <span className={`font-mono text-2xl ${qualityReport.passed ? "text-emerald-600" : "text-amber-600"}`}>
                    {qualityReport.overallScore}
                    <span className="text-sm text-muted-foreground">/100</span>
                  </span>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-medium inline-block mb-3 ${qualityReport.passed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {qualityReport.passed ? "PASSED" : "NEEDS ATTENTION"}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {qualityReport.dimensions.map((dim) => (
                    <div key={dim.name} className="border border-rule/30 rounded-md p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{dim.label}</span>
                        <span className={`text-xs font-mono ${dim.score >= 80 ? "text-emerald-600" : dim.score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {dim.score}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{dim.description}</p>
                      {dim.issues.length > 0 && (
                        <ul className="mt-1">
                          {dim.issues.slice(0, 2).map((issue, i) => (
                            <li key={i} className="text-xs text-red-500 list-disc ml-3">{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground italic">{qualityReport.summary}</p>
              </div>
            )}

            {/* Draft content */}
            <div className="envelope-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {draft.wordCount} words · {draft.unresolvedPlaceholders.length} placeholders
                </div>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-sm leading-6 text-ink">
                {draft.content}
              </pre>
            </div>

            {/* Placeholder warnings */}
            {draft.unresolvedPlaceholders.length > 0 && (
              <div className="rounded-md border border-amber-300/50 bg-amber-50/50 p-4" role="alert">
                <h4 className="text-sm font-medium text-amber-700">Unresolved items ({draft.unresolvedPlaceholders.length})</h4>
                <ul className="mt-2 space-y-1">
                  {draft.unresolvedPlaceholders.map((p, i) => (
                    <li key={i} className="text-xs text-amber-600">
                      • [{p.placeholder}] — {p.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Link
                to="/workflows/irs-notice"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5"
              >
                Continue to Mailing →
              </Link>
              <button onClick={() => setPhase("strategy")} className="text-sm text-muted-foreground hover:text-foreground">
                ← Back to strategies
              </button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

const SAMPLE_NOTICE = `Internal Revenue Service
CP2000 Notice of Underreported Income
Notice Number: CP2000-2024-12345-A
Date: July 15, 2026

Dear Taxpayer,

We are proposing changes to your 2024 tax return based on information received from third parties.

The income reported on your tax return does not match the income reported to us by employers and other payers.

Amount due: $3,847.00
You must respond by September 15, 2026.

If you agree with the changes, sign and return the response form with your payment.
If you disagree, provide a written explanation with supporting documentation.

You have the right to appeal this determination.

Sincerely,
IRS Automated Underreporter Operations`;
