import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { cp2000DomainPack } from "@/platform/cp2000-factory-adapter";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Stepper, MailOptions, RecipientForm, ReviewChecks, MAIL_OPTIONS } from "@/components/workflow-shell";
import { getWorkflowById } from "@/domain/workflow-catalog";
import {
  createWorkflowState, advanceStep, retreatStep, goToStep, canAdvance,
  setUpload, setExtraction, setProcessing, setUserFacts, setUserObjective,
  setDraft, setDraftValidation, setReviewChecks, setMailing,
  type WorkflowState as RuntimeState, type DocumentUpload,
} from "@/domain/workflow-runtime";
import { classifyNoticeType, NOTICE_TYPE_META } from "@/domain/notice-type";
import { extractCP2000, generateCP2000Draft, type CP2000Extraction } from "@/domain/cp2000";
import { validateDraft } from "@/domain/draft-validator";
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
import type { ExtractedDocument } from "@/platform/document-intelligence";
import {
  createVersionedDraft, addDraftVersion, approveCurrentVersion,
  isApprovalValid, setVersionValidation, getCurrentVersion,
  hasContentChanged, type VersionedDraft,
} from "@/domain/draft-versioning";
import {
  type WorkflowState as CaseWorkflowState, canTransition, transition,
  STATE_METADATA, AUDIT_EVENTS, createAuditEvent, type AuditEventV2,
} from "@/domain/cp2000-state-machine";
import { hashDraft } from "@/platform/fulfillment-adapter";

export const Route = createFileRoute("/workflows/cp2000-response")({
  head: () => createWorkflowHead("cp2000-response"),
  component: CP2000Response,
});

// ── Evidence item (durable) ───────────────────────────────────

interface EvidenceAttachment {
  id: string;
  requirementId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  status: "provided" | "verified" | "rejected";
}

function CP2000Response() {
  const definition = getWorkflowById("cp2000-response")!;
  const steps = definition.ux?.steps ?? [];
  const [state, setState] = useState<RuntimeState>(() => createWorkflowState(definition));
  const [cp2000Extraction, setCP2000Extraction] = useState<CP2000Extraction | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [ocrRequired, setOcrRequired] = useState(false);
  const [extractedDocument, setExtractedDocument] = useState<ExtractedDocument | null>(null);
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

  // ── Durable state (survives browser refresh) ──────────────
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseState, setCaseState] = useState<CaseWorkflowState>("created");
  const [auditTrail, setAuditTrail] = useState<AuditEventV2[]>([]);
  const [versionedDraft, setVersionedDraft] = useState<VersionedDraft>(() => createVersionedDraft());
  const [evidenceAttachments, setEvidenceAttachments] = useState<EvidenceAttachment[]>([]);
  const [extractedRecipient, setExtractedRecipient] = useState<{ name: string; org: string; address1: string; address2: string; city: string; state: string; zip: string } | null>(null);
  const [recipientModified, setRecipientModified] = useState(false);
  const [approvalRecord, setApprovalRecord] = useState<{ approvedDraftHash: string; approvedAt: string } | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const update = (fn: (s: RuntimeState) => RuntimeState) => setState(fn);

  // ── Audit helper ──────────────────────────────────────────
  const emitAudit = useCallback((event: string, data?: Record<string, unknown>) => {
    setAuditTrail((prev) => [...prev, createAuditEvent(event, caseState, data)]);
  }, [caseState]);

  // ── State machine transition ──────────────────────────────
  const transitionState = useCallback((to: CaseWorkflowState, actor: "user" | "system" | "provider" = "system", reason?: string) => {
    const result = transition(caseState, to, actor, reason);
    if (result.error) {
      console.warn(`State transition blocked: ${result.error}`);
      return false;
    }
    if (result.transition) {
      setAuditTrail((prev) => [...prev, createAuditEvent(AUDIT_EVENTS.WORKFLOW_STARTED, result.state, { from: result.transition?.from, to: result.transition?.to })]);
    }
    setCaseState(result.state);
    return true;
  }, [caseState]);

  const startWorkflow = useCallback(() => {
    setWorkflowStarted(true);
    emitAudit(AUDIT_EVENTS.WORKFLOW_STARTED);
    transitionState("document_uploaded", "user");
    setTimeout(() => {
      workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [emitAudit, transitionState]);

  // ── Server-side document extraction ───────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
    update((s) => setProcessing(s, true));
    setExtractionError(null);
    setOcrRequired(false);
    emitAudit(AUDIT_EVENTS.DOCUMENT_UPLOADED, { fileName: file.name, fileSize: file.size });

    try {
      // ── Client-side pre-validation ────────────────────────
      const nameCheck = validateFilename(file.name);
      if (!nameCheck.valid) {
        setExtractionError(`File validation failed: ${nameCheck.errors.join(", ")}`);
        return;
      }
      const sizeCheck = validateFileSize(file.size);
      if (!sizeCheck.valid) {
        setExtractionError(sizeCheck.error ?? "File size validation failed");
        return;
      }
      const mimeCheck = validateMimeType(file.type);
      if (!mimeCheck.valid) {
        setExtractionError(mimeCheck.error ?? "File type not allowed");
        return;
      }

      // ── Server-side extraction via PDF.js ─────────────────
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/extract", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setExtractionError(payload?.error ?? `Extraction failed (${response.status})`);
        transitionState("extraction_failed", "system", payload?.error);
        return;
      }

      const doc: ExtractedDocument = payload.document;
      setExtractedDocument(doc);

      // ── Handle OCR-required / image-only documents ────────
      if (doc.documentKind === "image_only_pdf" || doc.documentKind === "image" || doc.extractionMethod === "ocr_required") {
        setOcrRequired(true);
        setExtractionError(null);
        transitionState("extraction_failed", "system", "OCR required");
        return;
      }

      // ── Handle empty/invalid documents ────────────────────
      if (doc.documentKind === "empty" || doc.documentKind === "invalid" || !doc.fullText || doc.fullText.trim().length < 20) {
        setExtractionError(doc.warnings?.[0] ?? "No text could be extracted from this document.");
        transitionState("extraction_failed", "system", "No extractable text");
        return;
      }

      // ── Security warning ──────────────────────────────────
      if (payload.securityWarning) {
        setSecurityWarning(payload.securityWarning);
      } else {
        setSecurityWarning(null);
      }

      // ── Store upload metadata ──────────────────────────────
      const upload: DocumentUpload = {
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.mimeType,
        rawText: doc.fullText,
        uploadedAt: doc.uploadedAt,
      };
      update((s) => setUpload(s, upload));

      transitionState("document_processed", "system");

      // ── CP2000 extraction (server-side via API) ────────────
      const caseResponse = await fetch("/api/cases/cp2000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: doc.fullText,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          fileType: doc.mimeType,
          documentHash: doc.hash,
          extractionMethod: doc.extractionMethod,
          pageCount: doc.pageCount,
        }),
      });

      const casePayload = await caseResponse.json().catch(() => ({}));

      if (!caseResponse.ok) {
        if (caseResponse.status === 422) {
          // Classification uncertain — show the warning
          setExtractionError(casePayload.error ?? "CP2000 not confidently confirmed");
          transitionState("classification_uncertain", "system", casePayload.error);
          return;
        }
        setExtractionError(casePayload.error ?? "Analysis failed");
        transitionState("extraction_failed", "system", casePayload.error);
        return;
      }

      // ── Store the complete case ────────────────────────────
      const newCase: CP2000Case = casePayload.case;
      setCP2000Case(newCase);
      setCaseId(newCase.id);
      setCP2000Extraction(casePayload.extraction);
      setDiscrepancyResult({ discrepancies: casePayload.discrepancies, findings: casePayload.discrepancies?.findings ?? [] });
      setEvidenceChecklist(casePayload.evidenceChecklist);
      setCP2000Strategy(casePayload.strategy);

      // Extract recipient from notice
      if (casePayload.extraction.responseAddress) {
        // Parse the address — simplified
        setExtractedRecipient({
          name: "IRS",
          org: "Department of the Treasury",
          address1: casePayload.extraction.responseAddress,
          address2: "",
          city: "",
          state: "",
          zip: "",
        });
      }

      const classification = classifyNoticeType(doc.fullText);
      update((s) => setExtraction(s, {
        noticeType: classification.type,
        classificationConfidence: classification.confidence,
        facts: casePayload.extraction.facts,
        deadlines: [],
        agency: "IRS",
        referenceNumber: casePayload.extraction.noticeNumber ?? undefined,
        noticeDate: casePayload.extraction.noticeDate ?? undefined,
        rawText: doc.fullText,
        extractionConfidence: casePayload.extraction.classificationConfidence,
      }));

      transitionState("classified", "system");
      transitionState("analyzed", "system");
      emitAudit(AUDIT_EVENTS.CLASSIFICATION_COMPLETED, { type: classification.type, confidence: classification.confidence });
      emitAudit(AUDIT_EVENTS.ANALYSIS_COMPLETED, {
        discrepancies: casePayload.discrepancies?.length ?? 0,
        evidenceItems: casePayload.evidenceChecklist?.items?.length ?? 0,
      });

    } catch (err) {
      setExtractionError(`Failed to process document: ${err instanceof Error ? err.message : "Unknown error"}`);
      transitionState("extraction_failed", "system", err instanceof Error ? err.message : "Unknown error");
    } finally {
      update((s) => setProcessing(s, false));
    }
  }, [update, emitAudit, transitionState]);

  const handlePasteText = useCallback(async (text: string) => {
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

    try {
      // ── REAL CP2000 NOW RUNS THROUGH THE FACTORY ──
      const { runConfiguredPipeline } = await import("@/platform/factory-wrapper");
      const pipelineResult = await runConfiguredPipeline(
        crypto.randomUUID(),
        "P02_OFFICIAL_RESPONSE",
        cp2000DomainPack,
        {
          documents: [
            {
              rawText: sanitizedText,
              fileName: "Pasted text",
              fileType: "text/plain",
            },
          ],
        }
      );

      // Extract results from factory stages
      const extractionStage = pipelineResult.stages.find(s => s.stage === "extract");
      const discrepancyStage = pipelineResult.stages.find(s => s.stage === "discrepancies");
      const evidenceStage = pipelineResult.stages.find(s => s.stage === "evidence");
      const strategyStage = pipelineResult.stages.find(s => s.stage === "strategy");

      if (!extractionStage?.data) {
        throw new Error("Factory failed to extract CP2000 notice");
      }

      const extraction = extractionStage.data as CP2000Extraction;
      setCP2000Extraction(extraction);

      const discrepancies = discrepancyStage?.data as DiscrepancyResult || { discrepancies: [], findings: [] };
      setDiscrepancyResult(discrepancies);

      const checklist = evidenceStage?.data as EvidenceChecklistResult || { items: [] };
      setEvidenceChecklist(checklist);

      const strategy = strategyStage?.data as CP2000ResponseStrategy || { position: "unknown" };
      setCP2000Strategy(strategy);

      // Build case state with factory results
      let case_ = createCP2000Case(extraction);
      case_ = setCaseAnalysis(case_, {
        discrepancies: discrepancies.discrepancies || [],
        findings: discrepancies.findings || [],
        evidence: checklist.items || [],
      });
      const researchPack = getCP2000ResearchPack();
      case_ = setCaseResearch(case_, researchPack);
      case_ = setCaseStrategy(case_, strategy);
      setCP2000Case(case_);
      setCaseId(case_.id);

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

      transitionState("document_processed", "system");
      transitionState("classified", "system");
      transitionState("analyzed", "system");

      llmAnalysis.analyzeWithLLM(null, sanitizedText);
      emitAudit("CP2000_FACTORY_ANALYSIS", { factoryStatus: pipelineResult.status, stagesExecuted: pipelineResult.stages.length });
    } catch (error) {
      console.error("Factory analysis failed:", error);
      setExtractionError(`Failed to analyze document: ${error instanceof Error ? error.message : "Unknown error"}`);
      transitionState("extraction_failed", "system", error instanceof Error ? error.message : "Unknown error");
    }
  }, [update, transitionState, llmAnalysis, emitAudit]);

  // ── Draft generation with versioning ──────────────────────
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

    // Add to versioned draft
    setVersionedDraft((prev) => {
      const updated = addDraftVersion(prev, draft, "template");
      return updated;
    });

    emitAudit(AUDIT_EVENTS.DRAFT_GENERATED, { source: "template", wordCount: draft.split(/\s+/).length });

    // ── Validation ──────────────────────────────────────────
    if (cp2000Case && cp2000Extraction) {
      let case_ = setCaseUserInput(cp2000Case, state.userFacts, state.userObjective);
      case_ = setCaseDraft(case_, { content: draft, wordCount: draft.split(/\s+/).length, unresolvedPlaceholders: [] });
      const cp2000Validation = validateCP2000Draft(case_);
      case_ = setCaseValidation(case_, cp2000Validation);
      setCP2000Case(case_);

      setVersionedDraft((prev) => setVersionValidation(prev, cp2000Validation.passed));

      const allFindings = cp2000Validation.allFindings.map(f => ({
        check: f.check, passed: f.passed, detail: f.detail,
        severity: f.severity === "block" ? "error" as const : f.severity,
      }));
      const bridgedValidation = {
        findings: allFindings, passed: cp2000Validation.passed,
        errors: cp2000Validation.errors + cp2000Validation.blocks,
        warnings: cp2000Validation.warnings,
      };
      update((s) => setDraftValidation(s, bridgedValidation));
      emitAudit(AUDIT_EVENTS.DRAFT_VALIDATED, { passed: cp2000Validation.passed, blocks: cp2000Validation.blocks });

      const provenance = buildDraftProvenance(draft, state.extractedFacts, []);
      setDraftProvenance(provenance);
    } else {
      const validation = validateDraft(draft, state.extractedFacts, definition, {
        expectedNoticeNumber: cp2000Extraction?.noticeNumber ?? undefined,
        expectedTaxYear: cp2000Extraction?.taxYear ?? undefined,
        expectedDeadline: cp2000Extraction?.responseDeadline ?? undefined,
      });
      update((s) => setDraftValidation(s, validation));
      setVersionedDraft((prev) => setVersionValidation(prev, validation.passed));
      const provenance = buildDraftProvenance(draft, state.extractedFacts, []);
      setDraftProvenance(provenance);
    }

    transitionState("draft_ready", "user");
  }, [cp2000Case, cp2000Extraction, state.userFacts, state.userObjective, state.extractedFacts, definition, update, emitAudit, transitionState]);

  // ── Draft editing — invalidates approval ──────────────────
  const handleDraftEdit = useCallback((newContent: string) => {
    update((s) => setDraft(s, newContent));
    if (hasContentChanged(versionedDraft, newContent)) {
      setVersionedDraft((prev) => addDraftVersion(prev, newContent, "user_edited"));
      setApprovalRecord(null);
      emitAudit(AUDIT_EVENTS.DRAFT_CHANGED, { reason: "user edit" });
      // If we were in draft_review, go back to draft_ready
      if (caseState === "draft_review" || caseState === "approved") {
        transitionState("draft_ready", "user", "Draft edited after review");
      }
    }
  }, [versionedDraft, caseState, emitAudit, transitionState, update]);

  // ── Server-side approval ──────────────────────────────────
  const handleApprove = useCallback(async () => {
    if (!caseId || !state.draft || !state.mailing?.recipient) {
      setApprovalError("Cannot approve: missing case, draft, or recipient.");
      return;
    }

    // Check approval is still valid (not stale)
    if (!isApprovalValid(versionedDraft)) {
      setApprovalError("Draft has been modified since last approval. Please re-review and re-approve.");
      return;
    }

    // Check validation passed
    if (state.draftValidation && !state.draftValidation.passed) {
      setApprovalError("Draft validation has blocking errors. Fix them before approving.");
      return;
    }

    setIsApproving(true);
    setApprovalError(null);

    try {
      const response = await fetch(`/api/cases/${caseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftContent: state.draft,
          recipient: state.mailing.recipient,
          workflowId: definition.id,
          mailingMethod: state.mailing.method,
          validationPassed: state.draftValidation?.passed ?? false,
          evidenceItems: evidenceAttachments.map((e) => ({ id: e.id, fileId: e.id, status: e.status })),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setApprovalError(payload?.error ?? "Approval failed.");
        return;
      }

      // Mark approval in versioned draft
      setVersionedDraft((prev) => approveCurrentVersion(prev, "user"));
      setApprovalRecord({
        approvedDraftHash: payload.approval.approvedDraftHash,
        approvedAt: payload.approval.approvedAt,
      });
      emitAudit(AUDIT_EVENTS.DRAFT_APPROVED, {
        draftHash: payload.approval.approvedDraftHash,
        recipientHash: payload.approval.approvedRecipientHash,
      });
      transitionState("approved", "user", "Server-side approval");
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : "Approval request failed.");
    } finally {
      setIsApproving(false);
    }
  }, [caseId, state.draft, state.mailing, state.draftValidation, versionedDraft, definition.id, evidenceAttachments, emitAudit, transitionState]);

  // ── Evidence upload ───────────────────────────────────────
  const handleEvidenceUpload = useCallback(async (file: File, requirementId?: string) => {
    if (!caseId) {
      setExtractionError("Create a case first before uploading evidence.");
      return;
    }

    // Client-side validation
    const nameCheck = validateFilename(file.name);
    if (!nameCheck.valid) {
      setExtractionError(`File validation failed: ${nameCheck.errors.join(", ")}`);
      return;
    }
    const sizeCheck = validateFileSize(file.size);
    if (!sizeCheck.valid) {
      setExtractionError(sizeCheck.error ?? "File too large");
      return;
    }
    const mimeCheck = validateMimeType(file.type);
    if (!mimeCheck.valid) {
      setExtractionError(mimeCheck.error ?? "File type not allowed");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (requirementId) formData.append("requirementId", requirementId);

      const response = await fetch(`/api/cases/${caseId}/evidence`, {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setExtractionError(payload?.error ?? "Evidence upload failed.");
        return;
      }

      setEvidenceAttachments((prev) => [...prev, payload.evidence]);
      emitAudit(AUDIT_EVENTS.EVIDENCE_ADDED, { fileName: file.name, requirementId });
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Evidence upload failed.");
    }
  }, [caseId, emitAudit]);

  const handleEvidenceRemove = useCallback(async (evidenceId: string) => {
    if (!caseId) return;

    try {
      await fetch(`/api/cases/${caseId}/evidence?evidenceId=${evidenceId}`, { method: "DELETE" });
      setEvidenceAttachments((prev) => prev.filter((e) => e.id !== evidenceId));
      emitAudit(AUDIT_EVENTS.EVIDENCE_REMOVED, { evidenceId });
    } catch (err) {
      console.error("Evidence removal failed:", err);
    }
  }, [caseId, emitAudit]);

  // ── Recipient modification tracking ───────────────────────
  const handleRecipientChange = useCallback((fn: (r: { name: string; org: string; address1: string; address2: string; city: string; state: string; zip: string }) => { name: string; org: string; address1: string; address2: string; city: string; state: string; zip: string }) => {
    setRecipientModified(true);
    update((s) => setMailing(s, {
      ...s.mailing ?? { method: "certified", status: "not_started" },
      recipient: fn(s.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }),
    }));
  }, [update]);

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

  // ── Derived state ──────────────────────────────────────────
  const currentDraftVersion = getCurrentVersion(versionedDraft);
  const approvalIsStale = versionedDraft.approval.isStale;
  const approvalIsValid = isApprovalValid(versionedDraft);
  const canApprove = state.draftValidation?.passed && !approvalIsStale && state.mailing?.recipient?.name && state.mailing?.recipient?.address1;

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
          </div>
        </section>

        {/* ── WORKFLOW ── */}
        <section className="border-b border-rule/60" ref={workflowRef}>
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            {workflowStarted && (
              <div className="mb-8">
                <Stepper steps={steps.map(s => ({ id: s.id, label: s.label }))} current={state.step} onStepClick={(i) => update((s) => goToStep(s, definition, i))} />

                {/* ── State machine indicator ── */}
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <span className="font-mono uppercase tracking-widest text-muted-foreground">Case state:</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATE_METADATA[caseState]?.isError ? "bg-red-50 text-red-700" :
                    STATE_METADATA[caseState]?.isTerminal ? "bg-emerald-50 text-emerald-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {STATE_METADATA[caseState]?.label ?? caseState}
                  </span>
                  {caseId && <span className="text-muted-foreground">· Case ID: {caseId.substring(0, 8)}…</span>}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-rule/60 bg-card p-6 sm:p-10 shadow-card">
              {/* ── UPLOAD ── */}
              {state.phase === "document" && (
                <div>
                  <div className="postmark w-fit">1 · Upload</div>
                  <h3 className="mt-4 font-serif text-3xl">Upload your CP2000 notice</h3>
                  <p className="mt-3 text-muted-foreground">Upload a PDF or text file of your notice. The system will extract the key information automatically.</p>
                  <label className="upload-zone mt-6 block cursor-pointer">
                    <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    <span className="mt-3 block font-medium text-foreground">Upload PDF or text</span>
                    <span className="mt-1 block text-xs text-muted-foreground">CP2000 notice — PDF, text, or paste below</span>
                    <input ref={fileInputRef} type="file" accept="application/pdf,text/plain,image/jpeg,image/png" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                  </label>
                  {state.isProcessing && (
                    <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm">
                      <div className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-stamp border-t-transparent" /><span className="text-muted-foreground">Processing document with PDF.js text extraction…</span></div>
                    </div>
                  )}
                  {ocrRequired && (
                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <strong>We could not reliably extract text from this document.</strong>
                      <p className="mt-1">The document appears to be a scanned image. Please provide a clearer image or use OCR processing.</p>
                    </div>
                  )}
                  {extractionError && <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{extractionError}</div>}
                  {securityWarning && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">⚠ {securityWarning}</div>}

                  {/* ── Extracted fields display ── */}
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
                        {extractedDocument && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            Extraction method: {extractedDocument.extractionMethod} · {extractedDocument.pageCount} page(s) · Confidence: {(extractedDocument.extractionConfidence * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>

                      {/* ── Discrepancies ── */}
                      {cp2000Extraction.discrepancies && cp2000Extraction.discrepancies.length > 0 && (
                        <div className="rounded-lg border border-rule/60 p-4">
                          <div className="font-mono text-xs uppercase tracking-widest text-stamp">Income discrepancies</div>
                          <ul className="mt-2 space-y-2">
                            {cp2000Extraction.discrepancies.map((d, i) => (
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

                      {/* ── Evidence checklist with attachment UI ── */}
                      {evidenceChecklist && evidenceChecklist.items.length > 0 && (
                        <div className="rounded-lg border border-rule/60 p-4">
                          <div className="font-mono text-xs uppercase tracking-widest text-stamp">Evidence Checklist</div>
                          <div className="mt-2 text-xs text-muted-foreground">Required: {evidenceChecklist.requiredCount} · Missing: {evidenceChecklist.missingCount} · Ready: {evidenceChecklist.ready ? "✓" : "✗"}</div>
                          <ul className="mt-2 space-y-2">
                            {evidenceChecklist.items.map((item, i) => {
                              const attachment = evidenceAttachments.find((a) => a.requirementId === item.requirement);
                              return (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <span className={item.state === "missing" ? "text-amber-600" : item.state === "provided" ? "text-emerald-600" : "text-muted-foreground"}>{item.state === "missing" ? "○" : "●"}</span>
                                  <div className="flex-1">
                                    <span className="font-medium text-foreground">{item.label}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">({item.requirement})</span>
                                    <p className="text-xs text-muted-foreground">{item.purpose}</p>
                                    {attachment && (
                                      <div className="mt-1 flex items-center gap-2 text-xs">
                                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">✓ {attachment.fileName}</span>
                                        <button onClick={() => handleEvidenceRemove(attachment.id)} className="text-destructive hover:underline">Remove</button>
                                      </div>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {/* ── Deadline analysis ── */}
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
                  {!cp2000Extraction && !state.isProcessing && !ocrRequired && <div className="mt-6 rounded-md border border-rule/60 p-4 text-sm text-muted-foreground">No document has been processed yet. Upload your CP2000 notice above.</div>}
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
                    </div>
                  )}
                  <textarea className="input-field mt-6 min-h-32" value={state.userObjective} onChange={(e) => update((s) => setUserObjective(s, e.target.value))} placeholder="Example: I disagree with the proposed adjustment because my corrected W-2 reflects my actual income. I am requesting that the IRS remove the proposed tax increase and associated penalties." />
                </div>
              )}

              {state.phase === "draft" && (
                <div>
                  <div className="postmark w-fit">6 · Draft</div>
                  <h3 className="mt-4 font-serif text-3xl">Review and edit your response</h3>
                  <p className="mt-3 text-muted-foreground">The draft below was generated from the extracted facts and your input. Edit anything — approval will bind to the exact content.</p>
                  <textarea className="input-field mt-6 min-h-96 font-mono text-sm" value={state.draft} onChange={(e) => handleDraftEdit(e.target.value)} />
                  {/* ── Draft version info ── */}
                  {currentDraftVersion && (
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Version {currentDraftVersion.versionNumber}</span>
                      <span>· {currentDraftVersion.wordCount} words</span>
                      <span>· Hash: {currentDraftVersion.hash.substring(0, 12)}…</span>
                      <span>· Source: {currentDraftVersion.source}</span>
                      {currentDraftVersion.unresolvedPlaceholders.length > 0 && (
                        <span className="text-amber-600">· ⚠ {currentDraftVersion.unresolvedPlaceholders.length} placeholder(s)</span>
                      )}
                    </div>
                  )}
                  {/* ── Validation ── */}
                  {state.draftValidation && (
                    <div className="mt-4">
                      <div className={`rounded-md border p-3 text-sm ${state.draftValidation.passed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
                        {state.draftValidation.passed
                          ? `✓ Draft validation passed (${state.draftValidation.warnings} warning(s))`
                          : `✗ Draft validation failed — ${state.draftValidation.errors} error(s), ${state.draftValidation.warnings} warning(s)`}
                      </div>
                      {state.draftValidation.findings.filter((f) => !f.passed).length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {state.draftValidation.findings.filter((f) => !f.passed).map((f, i) => (
                            <li key={i} className={`text-xs ${f.severity === "error" ? "text-destructive" : "text-amber-600"}`}>
                              {f.severity === "error" ? "✗" : "⚠"} {f.check}: {f.detail}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {/* ── Provenance ── */}
                  {draftProvenance && (
                    <div className="mt-4 rounded-lg border border-rule/60 p-4">
                      <div className="font-mono text-xs uppercase tracking-widest text-stamp">Draft Provenance</div>
                      <div className="mt-2 space-y-1">
                        {draftProvenance.assertions.slice(0, 8).map((a, i) => (
                          <div key={i} className="text-xs flex items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 ${
                              a.classification === "SUPPORTED" ? "bg-emerald-50 text-emerald-700" :
                              a.classification === "DOCUMENT_DERIVED" ? "bg-blue-50 text-blue-700" :
                              a.classification === "USER_PROVIDED" ? "bg-purple-50 text-purple-700" :
                              a.classification === "AI_SUGGESTED" ? "bg-amber-50 text-amber-700" :
                              "bg-red-50 text-red-700"
                            }`}>{a.classification}</span>
                            <span className="text-muted-foreground">{a.statement.substring(0, 80)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={handleGenerateDraft} className="mt-4 rounded-full border border-rule px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Regenerate draft (template)</button>
                </div>
              )}

              {state.phase === "review" && (
                <div>
                  <div className="postmark w-fit">7 · Review</div>
                  <h3 className="mt-4 font-serif text-3xl">Review before anything is mailed</h3>
                  <p className="mt-3 text-muted-foreground">Please confirm each item below. Approval binds to the exact draft content.</p>
                  <ReviewChecks items={definition.ux?.reviewChecks ?? []} checks={state.reviewChecks} setChecks={(fn) => update((s) => setReviewChecks(s, fn(state.reviewChecks)))} />

                  {/* ── Approval status ── */}
                  {state.reviewChecks.every(Boolean) && state.draftValidation?.passed && (
                    <div className="mt-6 space-y-4">
                      {approvalIsValid ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                          ✓ Draft approved. Approval hash: {versionedDraft.approval.approvedDraftHash?.substring(0, 16)}…
                          <div className="text-xs mt-1">Approved at: {versionedDraft.approval.approvalTimestamp}</div>
                        </div>
                      ) : approvalIsStale ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                          ⚠ {versionedDraft.approval.staleReason ?? "Draft was modified after approval. Re-approval required."}
                        </div>
                      ) : (
                        <button
                          onClick={handleApprove}
                          disabled={isApproving || !canApprove}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30"
                        >
                          {isApproving ? (
                            <><div className="h-4 w-4 animate-spin rounded-full border-2 border-paper border-t-transparent" /> Approving…</>
                          ) : (
                            "Approve this exact draft"
                          )}
                        </button>
                      )}
                      {approvalError && <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{approvalError}</div>}
                    </div>
                  )}
                  {!state.draftValidation?.passed && (
                    <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                      ✗ Draft validation has not passed. Fix blocking issues before approval.
                    </div>
                  )}
                </div>
              )}

              {state.phase === "attachments" && (
                <div>
                  <div className="postmark w-fit">8 · Documents</div>
                  <h3 className="mt-4 font-serif text-3xl">Add supporting documents</h3>
                  <p className="mt-3 text-muted-foreground">Attach any documents referenced in your response — W-2s, 1099s, return transcripts, corrected forms, etc.</p>

                  {/* ── Functional evidence upload ── */}
                  <div className="mt-6 space-y-4">
                    {evidenceChecklist?.items.map((item, i) => {
                      const attachment = evidenceAttachments.find((a) => a.requirementId === item.requirement);
                      return (
                        <div key={i} className="rounded-lg border border-rule/60 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-foreground">{item.label}</div>
                              <div className="text-xs text-muted-foreground">{item.purpose}</div>
                              <div className="text-xs text-muted-foreground">Requirement: {item.requirement}</div>
                            </div>
                            {attachment ? (
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">✓ {attachment.fileName}</span>
                                <button onClick={() => handleEvidenceRemove(attachment.id)} className="text-xs text-destructive hover:underline">Remove</button>
                              </div>
                            ) : (
                              <label className="cursor-pointer rounded-full border border-rule px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                                Add file
                                <input type="file" accept="application/pdf,image/jpeg,image/png,text/plain" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleEvidenceUpload(f, item.requirement); }} />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* ── General upload (not tied to specific requirement) ── */}
                    <label className="upload-zone block cursor-pointer">
                      <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                      <span className="mt-3 block font-medium text-foreground">Add additional attachments</span>
                      <span className="mt-1 block text-xs text-muted-foreground">Forms, receipts, evidence, prior correspondence</span>
                      <input type="file" accept="application/pdf,image/jpeg,image/png,text/plain" multiple className="sr-only" onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => handleEvidenceUpload(f)); }} />
                    </label>

                    {/* ── Evidence summary ── */}
                    {evidenceAttachments.length > 0 && (
                      <div className="rounded-lg border border-rule/60 p-4">
                        <div className="font-mono text-xs uppercase tracking-widest text-stamp">Attached Documents ({evidenceAttachments.length})</div>
                        <ul className="mt-2 space-y-1">
                          {evidenceAttachments.map((a) => (
                            <li key={a.id} className="text-sm flex items-center justify-between">
                              <span>{a.fileName} <span className="text-xs text-muted-foreground">({(a.fileSize / 1024).toFixed(1)} KB)</span></span>
                              <button onClick={() => handleEvidenceRemove(a.id)} className="text-xs text-destructive hover:underline">Remove</button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">Required evidence: {definition.evidence.filter(e => e.required).map(e => e.label).join(", ")}</div>
                </div>
              )}

              {state.phase === "recipient" && (
                <div>
                  <div className="postmark w-fit">9 · Recipient</div>
                  <h3 className="mt-4 font-serif text-3xl">Where should we send it?</h3>
                  <p className="mt-3 text-muted-foreground">Enter the IRS mailing address from the CP2000 notice. The response address should be printed on the notice.</p>
                  {cp2000Extraction?.responseAddress && <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground"><strong>Extracted from notice:</strong> {cp2000Extraction.responseAddress}</div>}
                  {recipientModified && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">User modified recipient — the extracted address was changed.</div>}
                  <RecipientForm recipient={state.mailing?.recipient ?? { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }} setRecipient={handleRecipientChange} orgPlaceholder="IRS — Department of the Treasury" />
                </div>
              )}

              {state.phase === "mailing" && (
                <div>
                  <div className="postmark w-fit">10 · Mail</div>
                  <h3 className="mt-4 font-serif text-3xl">Choose your mail type</h3>
                  <p className="mt-3 text-muted-foreground">For IRS responses, Certified mail is recommended for proof of timely submission.</p>
                  <MailOptions selected={state.mailing?.method ?? "certified"} onSelect={(id) => update((s) => setMailing(s, { ...s.mailing ?? { recipient: { name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" }, status: "not_started" }, method: id, }))} />
                  {/* ── Checkout gate ── */}
                  {!approvalIsValid && (
                    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      ⚠ Draft must be approved before you can proceed to checkout. Go back to the Review step to approve.
                    </div>
                  )}
                </div>
              )}

              {(state.phase === "checkout" || state.phase === "submitted") && approvalIsValid && (
                <MailingFunnel draft={state.draft} workflowId={definition.id} workflowTitle={definition.title} recipient={state.mailing?.recipient ?? null} extractionRef={cp2000Extraction?.noticeNumber ?? null} taxYear={cp2000Extraction?.taxYear ?? null} mailOptions={definition.ux?.mailOptions ?? MAIL_OPTIONS} disclaimer={definition.ux?.disclaimerText ?? definition.disclaimer} onMailingStateChange={(s) => { setMailingFunnelState(s); if (s.phase === "submitted") { update((st) => setMailing(st, { method: s.method, recipient: s.recipient, status: "submitted", providerOrderId: s.providerOrderId ?? undefined, trackingNumber: s.trackingNumber ?? undefined, })); transitionState("mailed", "provider", "MailMyPDF fulfillment"); emitAudit(AUDIT_EVENTS.MAILING_SUBMITTED, { providerOrderId: s.providerOrderId, trackingNumber: s.trackingNumber }); } }} />
              )}
              {(state.phase === "checkout" || state.phase === "submitted") && !approvalIsValid && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
                  <h3 className="font-serif text-2xl text-destructive">Approval required</h3>
                  <p className="mt-2 text-sm text-muted-foreground">You must approve the exact draft before proceeding to checkout. No mailing without verified approval.</p>
                  <button onClick={() => update((s) => goToStep(s, definition, steps.findIndex((st) => st.id === "review")))} className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">Go to review</button>
                </div>
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
            <p className="mt-4 text-base leading-7 text-paper/70">The notice is the source material. Your facts remain under your control. AI assists — it does not decide. You review the response before approval. Approval applies to the exact draft, verified by cryptographic hash. Payment is distinct from authorization. Mailing creates a documented record.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <TrustItem title="Your data, your control" text="Documents are processed for extraction. Nothing is shared with third parties." />
              <TrustItem title="Review before send" text="You approve the exact letter, verified by hash. Nothing is mailed without server-side approval." />
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
      <div className="font-mono text-xs font-semibold uppercase tracking-widest text-stamp">{number}</div>
      <h3 className="mt-2 font-serif text-xl">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-6">{text}</p>
    </div>
  );
}

function ExtractedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-paper/20 p-4">
      <h3 className="font-medium text-paper">{title}</h3>
      <p className="mt-1 text-sm text-paper/70">{text}</p>
    </div>
  );
}

function RelatedCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link to={href} className="block rounded-lg border border-rule/60 bg-card p-4 transition-colors hover:border-ink/30">
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
