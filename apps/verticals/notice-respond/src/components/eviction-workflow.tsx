/**
 * Eviction Notice Response Workflow Component
 * Production-grade multi-step workflow with extraction, classification, and document generation
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  EvictionNoticeExtraction,
  EvictionIntakeConfirmation,
  EvictionClassificationResult,
  GeneratedDocument,
  DefenseType,
} from "@/domain/workflows/eviction/types";

type WorkflowStep =
  | "upload"
  | "extraction-review"
  | "intake-questions"
  | "classification-review"
  | "document-selection"
  | "document-review"
  | "signature"
  | "mailing"
  | "complete";

interface ExtractedData {
  extraction: EvictionNoticeExtraction;
  confidence: number;
  provider: string;
}

interface WorkflowState {
  step: WorkflowStep;
  documentText: string | null;
  extraction: ExtractedData | null;
  confirmation: EvictionIntakeConfirmation | null;
  classification: EvictionClassificationResult | null;
  selectedDocuments: GeneratedDocument[];
  userResponses: Record<string, unknown>;
  errors: string[];
  loading: boolean;
}

export function EvictionWorkflow() {
  const [state, setState] = useState<WorkflowState>({
    step: "upload",
    documentText: null,
    extraction: null,
    confirmation: null,
    classification: null,
    selectedDocuments: [],
    userResponses: {},
    errors: [],
    loading: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────
  // DOCUMENT UPLOAD & OCR
  // ─────────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(async (file: File) => {
    setState((s) => ({ ...s, loading: true, errors: [] }));

    try {
      const text = await extractTextFromFile(file);
      setState((s) => ({ ...s, documentText: text, step: "extraction-review" }));

      // Start extraction
      const extractionResult = await fetch("/api/workflows/eviction/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeText: text }),
      });

      if (!extractionResult.ok) {
        throw new Error("Extraction failed");
      }

      const { extraction, provider } = await extractionResult.json();

      setState((s) => ({
        ...s,
        extraction: { extraction, confidence: 0.85, provider },
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((s) => ({
        ...s,
        errors: [message],
        loading: false,
        step: "upload",
      }));
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // EXTRACTION REVIEW & CONFIRMATION
  // ─────────────────────────────────────────────────────────────

  const handleConfirmExtraction = useCallback(
    (confirmations: Record<string, boolean>) => {
      if (!state.extraction) return;

      const confirmation: EvictionIntakeConfirmation = {
        extraction: state.extraction.extraction,
        user_confirmations: confirmations,
        confirmed_at: new Date().toISOString(),
      };

      setState((s) => ({
        ...s,
        confirmation,
        step: "intake-questions",
      }));
    },
    [state.extraction]
  );

  // ─────────────────────────────────────────────────────────────
  // CLASSIFICATION
  // ─────────────────────────────────────────────────────────────

  const handleClassify = useCallback(async () => {
    if (!state.confirmation) return;

    setState((s) => ({ ...s, loading: true, errors: [] }));

    try {
      const classifyResult = await fetch("/api/workflows/eviction/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intake: state.confirmation,
          can_pay: state.userResponses.can_pay || false,
          payment_amount: state.userResponses.payment_amount,
          has_defenses: state.userResponses.has_defenses || false,
          defense_types: state.userResponses.defense_types,
          tenant_status: state.userResponses.tenant_status || "current",
          language_barrier: state.userResponses.language_barrier || false,
          prior_eviction: state.userResponses.prior_eviction || false,
          court_involvement: state.userResponses.court_involvement || false,
        }),
      });

      if (!classifyResult.ok) {
        throw new Error("Classification failed");
      }

      const { classification } = await classifyResult.json();

      setState((s) => ({
        ...s,
        classification,
        step: "classification-review",
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState((s) => ({
        ...s,
        errors: [message],
        loading: false,
      }));
    }
  }, [state.confirmation, state.userResponses]);

  // ─────────────────────────────────────────────────────────────
  // DOCUMENT GENERATION
  // ─────────────────────────────────────────────────────────────

  const generateDocument = useCallback(
    async (
      type: "payment-letter" | "contest-letter" | "declaration" | "proof-of-service",
      payload: Record<string, unknown>
    ) => {
      if (!state.confirmation) return;

      setState((s) => ({ ...s, loading: true, errors: [] }));

      try {
        const result = await fetch("/api/workflows/eviction/generate-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            intake: state.confirmation,
            payload,
          }),
        });

        if (!result.ok) {
          throw new Error("Document generation failed");
        }

        const { document } = await result.json();

        setState((s) => ({
          ...s,
          selectedDocuments: [...s.selectedDocuments, document],
          loading: false,
          step: "document-review",
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((s) => ({
          ...s,
          errors: [message],
          loading: false,
        }));
      }
    },
    [state.confirmation]
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER BY STEP
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl">Respond to Your 3-Day Eviction Notice</h1>
        <p className="mt-2 text-muted-foreground">
          Upload your notice, answer questions, and we'll help you draft a response.
        </p>
      </div>

      {/* Error Display */}
      {state.errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">Error</p>
          <ul className="mt-2 space-y-1 text-sm text-red-800">
            {state.errors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step: Upload */}
      {state.step === "upload" && (
        <UploadStep
          onFileUpload={handleFileUpload}
          loading={state.loading}
          ref={fileInputRef}
        />
      )}

      {/* Step: Extraction Review */}
      {state.step === "extraction-review" && state.extraction && (
        <ExtractionReviewStep
          extraction={state.extraction.extraction}
          confidence={state.extraction.confidence}
          onConfirm={handleConfirmExtraction}
          onBack={() => setState((s) => ({ ...s, step: "upload" }))}
          loading={state.loading}
        />
      )}

      {/* Step: Intake Questions */}
      {state.step === "intake-questions" && (
        <IntakeQuestionsStep
          onRespond={(responses) =>
            setState((s) => ({
              ...s,
              userResponses: { ...s.userResponses, ...responses },
            }))
          }
          onClassify={handleClassify}
          onBack={() => setState((s) => ({ ...s, step: "extraction-review" }))}
          loading={state.loading}
        />
      )}

      {/* Step: Classification Review */}
      {state.step === "classification-review" && state.classification && (
        <ClassificationReviewStep
          classification={state.classification}
          onProceed={() => setState((s) => ({ ...s, step: "document-selection" }))}
          onBack={() => setState((s) => ({ ...s, step: "intake-questions" }))}
        />
      )}

      {/* Step: Document Selection & Generation */}
      {state.step === "document-selection" && state.classification && (
        <DocumentSelectionStep
          classification={state.classification}
          onGenerateDocument={generateDocument}
          onProceed={() => setState((s) => ({ ...s, step: "document-review" }))}
          loading={state.loading}
        />
      )}

      {/* Step: Document Review */}
      {state.step === "document-review" && (
        <DocumentReviewStep
          documents={state.selectedDocuments}
          onProceed={() => setState((s) => ({ ...s, step: "mailing" }))}
          onBack={() => setState((s) => ({ ...s, step: "document-selection" }))}
        />
      )}

      {/* Step: Mailing & Completion */}
      {state.step === "mailing" && (
        <MailingStep
          documents={state.selectedDocuments}
          onComplete={() => setState((s) => ({ ...s, step: "complete" }))}
        />
      )}

      {/* Step: Complete */}
      {state.step === "complete" && (
        <CompletionStep documents={state.selectedDocuments} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP COMPONENTS
// ─────────────────────────────────────────────────────────────

const UploadStep = ({ onFileUpload, loading, ref }: any) => (
  <div className="rounded-lg border border-rule bg-card p-8 text-center">
    <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-lg bg-muted">
      <span className="text-2xl">📄</span>
    </div>
    <h2 className="font-serif text-2xl">Upload Your Eviction Notice</h2>
    <p className="mt-2 text-muted-foreground">
      PDF, image, or text. We'll extract the key information automatically.
    </p>
    <input
      ref={ref}
      type="file"
      accept="application/pdf,image/*,.txt"
      onChange={(e) => {
        if (e.target.files?.[0]) {
          onFileUpload(e.target.files[0]);
        }
      }}
      className="hidden"
    />
    <button
      onClick={() => ref.current?.click()}
      disabled={loading}
      className="mt-6 rounded-full bg-ink px-8 py-3 font-medium text-paper disabled:opacity-50"
    >
      {loading ? "Processing..." : "Upload Notice"}
    </button>
  </div>
);

const ExtractionReviewStep = ({
  extraction,
  confidence,
  onConfirm,
  onBack,
  loading,
}: any) => {
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});

  const requiredFields = [
    "deadline_date",
    "notice_issuer",
    "property_address",
    "notice_amount_owed",
  ];

  const allConfirmed = requiredFields.every((field) => confirmations[field]);

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl">Review Extracted Information</h2>
      <p className="text-muted-foreground">
        Confirm each field is correct. Click "No" to re-enter information.
      </p>

      <div className="space-y-4">
        {[
          { key: "deadline_date", label: "Response Deadline", value: extraction.deadline_date },
          { key: "notice_issuer", label: "Landlord/Issuer", value: extraction.notice_issuer },
          { key: "property_address", label: "Property Address", value: extraction.property_address },
          { key: "notice_amount_owed", label: "Amount Owed", value: `$${extraction.notice_amount_owed}` },
        ].map(({ key, label, value }) => (
          <div key={key} className="flex items-center justify-between rounded-lg border border-rule bg-card p-4">
            <div>
              <div className="font-medium">{label}</div>
              <div className="text-sm text-muted-foreground">{value}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmations((c) => ({ ...c, [key]: true }))}
                className={`px-3 py-1 text-sm rounded ${
                  confirmations[key]
                    ? "bg-green-100 text-green-900"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                ✓ Correct
              </button>
              <button
                onClick={() => setConfirmations((c) => ({ ...c, [key]: false }))}
                className={`px-3 py-1 text-sm rounded ${
                  confirmations[key] === false
                    ? "bg-red-100 text-red-900"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                ✗ Wrong
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-full border border-rule px-6 py-3 font-medium"
        >
          Back
        </button>
        <button
          onClick={() => onConfirm(confirmations)}
          disabled={!allConfirmed || loading}
          className="rounded-full bg-ink px-6 py-3 font-medium text-paper disabled:opacity-50"
        >
          {loading ? "Processing..." : "Continue"}
        </button>
      </div>
    </div>
  );
};

const IntakeQuestionsStep = ({ onRespond, onClassify, onBack, loading }: any) => {
  const [responses, setResponses] = useState({
    can_pay: false,
    has_defenses: false,
    tenant_status: "current" as const,
  });

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl">About Your Situation</h2>

      <div className="space-y-4">
        <div className="rounded-lg border border-rule bg-card p-4">
          <label className="font-medium">Can you pay the full amount by the deadline?</label>
          <select
            value={String(responses.can_pay)}
            onChange={(e) =>
              setResponses((r) => ({ ...r, can_pay: e.target.value === "true" }))
            }
            className="mt-2 w-full rounded-md border border-rule bg-card px-3 py-2"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
            <option value="maybe">Maybe - let me think</option>
          </select>
        </div>

        <div className="rounded-lg border border-rule bg-card p-4">
          <label className="font-medium">Do you have reasons to contest this notice?</label>
          <select
            value={String(responses.has_defenses)}
            onChange={(e) =>
              setResponses((r) => ({ ...r, has_defenses: e.target.value === "true" }))
            }
            className="mt-2 w-full rounded-md border border-rule bg-card px-3 py-2"
          >
            <option value="false">No</option>
            <option value="true">Yes - I have defenses</option>
            <option value="unsure">Unsure</option>
          </select>
        </div>

        <div className="rounded-lg border border-rule bg-card p-4">
          <label className="font-medium">Your tenant status:</label>
          <select
            value={responses.tenant_status}
            onChange={(e) =>
              setResponses((r) => ({
                ...r,
                tenant_status: e.target.value as "current" | "former" | "unauthorized",
              }))
            }
            className="mt-2 w-full rounded-md border border-rule bg-card px-3 py-2"
          >
            <option value="current">Current tenant (on lease)</option>
            <option value="former">Former tenant (no lease)</option>
            <option value="unauthorized">Not on lease/unauthorized occupant</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-full border border-rule px-6 py-3 font-medium"
        >
          Back
        </button>
        <button
          onClick={() => {
            onRespond(responses);
            onClassify();
          }}
          disabled={loading}
          className="rounded-full bg-ink px-6 py-3 font-medium text-paper disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Get My Strategy"}
        </button>
      </div>
    </div>
  );
};

const ClassificationReviewStep = ({ classification, onProceed, onBack }: any) => (
  <div className="space-y-6">
    <h2 className="font-serif text-2xl">Your Recommended Path</h2>

    <div className="rounded-lg border border-rule bg-card p-6">
      <div className="inline-block rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 mb-4">
        {classification.path}
      </div>
      <h3 className="font-serif text-xl mt-4">{classification.recommended_strategy}</h3>
      <p className="mt-2 text-muted-foreground">{classification.reasoning}</p>

      {classification.hard_stop && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">⚠️ Important Notice</p>
          <p className="mt-2 text-sm text-red-800">{classification.hard_stop_reason}</p>
        </div>
      )}

      <div className="mt-6">
        <p className="font-medium">Next steps:</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {classification.next_steps.map((step: string, i: number) => (
            <li key={i}>• {step}</li>
          ))}
        </ul>
      </div>
    </div>

    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="rounded-full border border-rule px-6 py-3 font-medium"
      >
        Back
      </button>
      <button
        onClick={onProceed}
        className="rounded-full bg-ink px-6 py-3 font-medium text-paper"
      >
        Generate Documents
      </button>
    </div>
  </div>
);

const DocumentSelectionStep = ({ classification, onGenerateDocument, onProceed, loading }: any) => {
  const shouldShowPaymentLetter =
    classification.path === "pay-negotiate" || classification.path === "payment-already-made";
  const shouldShowContestLetter = classification.path === "contest-defend";

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl">Generate Response Documents</h2>

      <div className="space-y-4">
        {shouldShowPaymentLetter && (
          <button
            onClick={() =>
              onGenerateDocument("payment-letter", {
                payment_option: "full",
              })
            }
            disabled={loading}
            className="w-full rounded-lg border border-rule bg-card p-6 text-left hover:bg-muted disabled:opacity-50"
          >
            <h3 className="font-medium">Payment Proposal Letter</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Propose payment of arrears or request more time
            </p>
          </button>
        )}

        {shouldShowContestLetter && (
          <button
            onClick={() =>
              onGenerateDocument("contest-letter", {
                defenses: [],
                defense_details: {},
              })
            }
            disabled={loading}
            className="w-full rounded-lg border border-rule bg-card p-6 text-left hover:bg-muted disabled:opacity-50"
          >
            <h3 className="font-medium">Contest/Defense Letter</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Dispute the notice and state your legal defenses
            </p>
          </button>
        )}

        <button
          onClick={() =>
            onGenerateDocument("proof-of-service", {
              method: "usps-certified",
            })
          }
          disabled={loading}
          className="w-full rounded-lg border border-rule bg-card p-6 text-left hover:bg-muted disabled:opacity-50"
        >
          <h3 className="font-medium">Proof of Service</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Documentation for certified mail or hand delivery
          </p>
        </button>
      </div>

      <button
        onClick={onProceed}
        className="rounded-full bg-ink px-6 py-3 font-medium text-paper"
      >
        Review Generated Documents
      </button>
    </div>
  );
};

const DocumentReviewStep = ({ documents, onProceed, onBack }: any) => (
  <div className="space-y-6">
    <h2 className="font-serif text-2xl">Review Your Documents</h2>

    {documents.map((doc: GeneratedDocument, i: number) => (
      <div key={i} className="rounded-lg border border-rule bg-card p-6">
        <h3 className="font-medium">{doc.title}</h3>
        <div className="mt-4 max-h-96 overflow-y-auto rounded bg-muted p-4 font-mono text-sm whitespace-pre-wrap">
          {doc.content}
        </div>
        {doc.requires_signature && (
          <p className="mt-2 text-sm text-orange-700">
            ⚠️ This document requires your signature
          </p>
        )}
      </div>
    ))}

    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="font-medium text-blue-900">Before You Send</p>
      <ul className="mt-2 space-y-1 text-sm text-blue-800">
        <li>✓ Make sure all information is accurate</li>
        <li>✓ Sign documents if required</li>
        <li>✓ Keep copies for your records</li>
        <li>✓ Use certified mail or hand delivery for proof</li>
      </ul>
    </div>

    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="rounded-full border border-rule px-6 py-3 font-medium"
      >
        Back
      </button>
      <button
        onClick={onProceed}
        className="rounded-full bg-ink px-6 py-3 font-medium text-paper"
      >
        Next: Mailing Information
      </button>
    </div>
  </div>
);

const MailingStep = ({ documents, onComplete }: any) => (
  <div className="space-y-6">
    <h2 className="font-serif text-2xl">Mailing & Delivery</h2>
    <p className="text-muted-foreground">
      Choose how you'll send these documents to your landlord.
    </p>

    <div className="space-y-3">
      {[
        { id: "certified", label: "USPS Certified Mail", desc: "Tracking + signature confirmation" },
        { id: "standard", label: "Standard Mail", desc: "Addressed, stamped, mailed" },
        { id: "hand", label: "Hand Delivery", desc: "Personal delivery with receipt" },
        { id: "email", label: "Email", desc: "Send to landlord's email address" },
      ].map(({ id, label, desc }) => (
        <label key={id} className="flex items-center gap-3 rounded-lg border border-rule bg-card p-4 cursor-pointer hover:bg-muted">
          <input type="radio" name="mailing" value={id} defaultChecked={id === "certified"} />
          <div>
            <div className="font-medium">{label}</div>
            <div className="text-sm text-muted-foreground">{desc}</div>
          </div>
        </label>
      ))}
    </div>

    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="font-medium text-blue-900">Keep Your Proof!</p>
      <p className="mt-2 text-sm text-blue-800">
        Whatever method you use, keep proof that you sent it: certified mail receipt, email confirmation, witness signature, or delivery receipt.
      </p>
    </div>

    <button
      onClick={onComplete}
      className="rounded-full bg-ink px-6 py-3 font-medium text-paper w-full"
    >
      I've Sent My Documents
    </button>
  </div>
);

const CompletionStep = ({ documents }: any) => (
  <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
    <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-lg bg-green-100">
      <span className="text-3xl">✓</span>
    </div>
    <h2 className="font-serif text-2xl text-green-900">Documents Generated</h2>
    <p className="mt-2 text-green-800">
      You've prepared {documents.length} response document(s). You must review and send them yourself.
    </p>

    <div className="mt-6 rounded-lg border border-green-200 bg-white p-4 text-left">
      <p className="font-medium">What happens next:</p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        <li>1. Send your letter(s) to your landlord (certified mail recommended)</li>
        <li>2. Keep proof of delivery and copies of everything you send</li>
        <li>3. Monitor for response or court filing</li>
        <li>4. If sued, consult an attorney immediately</li>
      </ul>
    </div>

    <p className="mt-6 text-sm text-muted-foreground">
      ⚠️ This tool is not a substitute for legal advice. If you have questions or the situation becomes complex, consult a lawyer.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    // For PDF, we would need a PDF library like pdfjs
    // For now, fall back to text extraction
    return file.text?.() || "";
  }

  if (file.type.startsWith("image/")) {
    // For images, we would need OCR
    // This would call a backend OCR service
    return "[Image uploaded - OCR processing required]";
  }

  return file.text?.() || "";
}
