import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import { validateFile, formatFileSize, uploadDocument } from "@/lib/document-storage";
import { extractText } from "@/lib/text-extraction";
import { analyzeDocument } from "@/api/analyze-document";
import {
  type DocumentAnalysis,
  type DocumentType,
  DOCUMENT_TYPE_LABELS,
  type Agency,
  AGENCY_LABELS,
  emptyAnalysis,
} from "@/lib/document-analysis";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze a Document — Immigration Mail" },
      {
        name: "description",
        content:
          "Upload an immigration document and get a plain-English explanation of what it means and what to do next.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      { rel: "canonical", href: "https://immigrationmail.com/analyze" },
    ],
  }),
  component: AnalyzePage,
});

type Phase = "idle" | "uploading" | "extracting" | "analyzing" | "done" | "error";

function AnalyzePage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [progressMsg, setProgressMsg] = useState("");
  const [analysis, setAnalysis] = useState<DocumentAnalysis>(emptyAnalysis);
  const [errorMsg, setErrorMsg] = useState("");
  const [userContext, setUserContext] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const err = validateFile(file);
    if (err) {
      setErrorMsg(err);
      setPhase("error");
      return;
    }
    setUploadedFile(file);
    setErrorMsg("");
    setPhase("idle");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const runAnalysis = async () => {
    if (!uploadedFile) return;

    setPhase("extracting");
    setProgressMsg("Extracting text from your document…");
    setErrorMsg("");

    try {
      const text = await extractText(uploadedFile);

      if (!text || text.trim().length < 10) {
        setErrorMsg(
          "We couldn't extract enough text from this document. Please try a clearer scan or a different file."
        );
        setPhase("error");
        return;
      }

      // Upload to storage if user is signed in
      if (user) {
        setProgressMsg("Uploading document to secure storage…");
        const uploadResult = await uploadDocument(uploadedFile, user.id);
        if (uploadResult.error) {
          console.warn("Upload failed, continuing with analysis:", uploadResult.error);
        }
      }

      setPhase("analyzing");
      setProgressMsg("Analyzing your document…");

      const result = await analyzeDocument({
        text,
        userContext: userContext.trim() || undefined,
      });

      if (result.error) {
        setErrorMsg(result.error);
        setPhase("error");
        return;
      }

      setAnalysis(result.analysis);
      setPhase("done");
    } catch (err: any) {
      console.error("Analysis failed:", err);
      setErrorMsg(
        err?.message || "Something went wrong while analyzing your document. Please try again."
      );
      setPhase("error");
    }
  };

  const reset = () => {
    setPhase("idle");
    setUploadedFile(null);
    setAnalysis(emptyAnalysis);
    setErrorMsg("");
    setUserContext("");
    setProgressMsg("");
  };

  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="postmark w-fit">Document intelligence</div>
        <h1 className="mt-4 font-serif text-4xl">What does this letter mean?</h1>
        <p className="mt-3 text-muted-foreground">
          Upload an immigration document — a notice, letter, or decision — and we'll explain
          what it is, what it says, and what you should do next. Nothing is sent or stored
          unless you're signed in.
        </p>

        {/* Disclaimer */}
        <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground">
          <div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div>
          <p className="mt-2">
            This tool helps you understand immigration correspondence. It does not provide
            legal advice and is not a substitute for an attorney. Always verify important
            deadlines and instructions with the original document or a qualified professional.
          </p>
        </div>

        {/* Upload zone (shown when idle or error) */}
        {(phase === "idle" || phase === "error") && (
          <div className="mt-8">
            <div
              className={`upload-zone cursor-pointer ${dragOver ? "border-stamp bg-stamp/5" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <svg className="mx-auto text-muted-foreground" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span className="mt-3 block font-medium text-foreground">Upload your document</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                PDF, JPG, or PNG · Max 25MB · Private &amp; secure
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {/* Selected file */}
            {uploadedFile && (
              <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                    </div>
                  </div>
                  <button onClick={reset} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                </div>
              </div>
            )}

            {/* Optional context */}
            {uploadedFile && (
              <div className="mt-4">
                <label className="input-label">Anything we should know? (optional)</label>
                <textarea
                  className="input-field min-h-20"
                  placeholder="Example: This is from USCIS about my I-485 application, received last week…"
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                />
              </div>
            )}

            {/* Error message */}
            {errorMsg && (
              <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            {/* Analyze button */}
            {uploadedFile && (
              <button
                onClick={runAnalysis}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
                Analyze this document
              </button>
            )}

            {/* Not signed in notice */}
            {uploadedFile && !user && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                You can analyze without signing in. To save documents,{" "}
                <Link to="/auth" className="text-stamp hover:underline">sign in</Link>.
              </p>
            )}
          </div>
        )}

        {/* Progress states */}
        {(phase === "uploading" || phase === "extracting" || phase === "analyzing") && (
          <div className="mt-8 flex flex-col items-center justify-center py-16">
            <div className="postmark-circle h-32 w-32" style={{ animation: "spin 3s linear infinite" }}>
              <span className="text-center leading-tight">
                Analyzing<br />your<br />document
              </span>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{progressMsg}</p>
            <div className="mt-2 flex gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-stamp" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 animate-pulse rounded-full bg-stamp" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 animate-pulse rounded-full bg-stamp" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {/* Results */}
        {phase === "done" && (
          <AnalysisResults analysis={analysis} onReset={reset} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

/* ── Analysis Results ─────────────────────────────────────────────────── */

function AnalysisResults({ analysis, onReset }: { analysis: DocumentAnalysis; onReset: () => void }) {
  return (
    <div className="mt-8 space-y-5">
      {/* Document type card */}
      <div className="envelope-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="postmark w-fit">Identified as</div>
            <h2 className="mt-3 font-serif text-3xl">{analysis.document_type_label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{analysis.agency_label}</p>
          </div>
          <ConfidenceBadge confidence={analysis.confidence} />
        </div>

        {/* Key details */}
        {(analysis.receipt_number || analysis.case_number || analysis.applicant_name || analysis.petitioner_name || analysis.notice_date) && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {analysis.receipt_number && (
              <DetailRow label="Receipt number" value={analysis.receipt_number} mono />
            )}
            {analysis.case_number && (
              <DetailRow label="Case number" value={analysis.case_number} mono />
            )}
            {analysis.applicant_name && (
              <DetailRow label="Applicant" value={analysis.applicant_name} />
            )}
            {analysis.petitioner_name && (
              <DetailRow label="Petitioner" value={analysis.petitioner_name} />
            )}
            {analysis.notice_date && (
              <DetailRow label="Notice date" value={formatDate(analysis.notice_date)} />
            )}
            {analysis.response_deadline && (
              <DetailRow label="Response deadline" value={formatDate(analysis.response_deadline)} highlight />
            )}
          </div>
        )}

        {/* Referenced forms */}
        {analysis.referenced_forms.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {analysis.referenced_forms.map((form, i) => (
              <span key={i} className="rounded-full border border-rule bg-paper-deep/40 px-3 py-1 font-mono text-xs text-ink-soft">
                {form}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Deadline alert */}
      {analysis.response_deadline && (
        <DeadlineAlert deadline={analysis.response_deadline} />
      )}

      {/* Plain English explanation */}
      {analysis.plain_english_explanation && (
        <div className="envelope-card p-6">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <h3 className="font-serif text-xl">In plain English</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{analysis.plain_english_explanation}</p>
        </div>
      )}

      {/* What it means */}
      {analysis.what_it_means && (
        <div className="envelope-card p-6">
          <h3 className="font-serif text-xl">What this means for you</h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{analysis.what_it_means}</p>
        </div>
      )}

      {/* What to do */}
      {analysis.what_to_do.length > 0 && (
        <div className="envelope-card p-6">
          <h3 className="font-serif text-xl">What you should do</h3>
          <ul className="mt-4 space-y-3">
            {analysis.what_to_do.map((action, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-rule bg-paper-deep/40 font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <span className="text-sm text-ink-soft">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requested actions */}
      {analysis.requested_actions.length > 0 && (
        <div className="envelope-card p-6">
          <h3 className="font-serif text-xl">Requested actions</h3>
          <div className="mt-4 space-y-3">
            {analysis.requested_actions.map((action, i) => (
              <div key={i} className="rounded-md border border-rule/60 bg-paper-deep/30 px-4 py-3">
                <p className="text-sm text-ink-soft">{action.description}</p>
                {action.deadline && (
                  <p className="mt-1 text-xs font-medium text-stamp">
                    Deadline: {formatDate(action.deadline)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents to verify */}
      {analysis.documents_to_verify.length > 0 && (
        <div className="envelope-card p-6">
          <h3 className="font-serif text-xl">Documents to prepare</h3>
          <ul className="mt-4 space-y-2">
            {analysis.documents_to_verify.map((doc, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-ink-soft">
                <svg className="h-4 w-4 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a3 3 0 10-6 0m6 0a3 3 0 10-6 0" />
                </svg>
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted dates */}
      {analysis.extracted_dates.length > 0 && (
        <div className="envelope-card p-6">
          <h3 className="font-serif text-xl">Dates mentioned</h3>
          <div className="mt-4 space-y-2">
            {analysis.extracted_dates.map((date, i) => (
              <div key={i} className="flex items-center justify-between border-b border-rule/40 pb-2 text-sm last:border-0">
                <span className="text-ink-soft">{date.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-foreground">{formatDate(date.value)}</span>
                  <ConfidenceDot confidence={date.confidence} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="rounded-md border border-stamp/40 bg-stamp/5 p-5">
          <h3 className="font-serif text-lg text-stamp">Important notes</h3>
          <ul className="mt-3 space-y-2">
            {analysis.warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stamp" />
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Uncertainty flags */}
      {analysis.uncertainty_flags.length > 0 && (
        <div className="rounded-md border border-rule/60 bg-paper-deep/30 p-5">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <h3 className="text-sm font-medium text-muted-foreground">Areas of uncertainty</h3>
          </div>
          <ul className="mt-3 space-y-1.5">
            {analysis.uncertainty_flags.map((flag, i) => (
              <li key={i} className="text-sm text-muted-foreground">· {flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pb-10">
        {analysis.recommended_workflow && (
          <Link
            to={`/workflows/${analysis.recommended_workflow}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5"
          >
            Start a response
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}
        <Link
          to="/workflows/respond-to-notice"
          className="inline-flex items-center rounded-full border border-input px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Respond to a notice
        </Link>
        <button
          onClick={onReset}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Analyze another document
        </button>
      </div>
    </div>
  );
}

/* ── Helper components ────────────────────────────────────────────────── */

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const styles = {
    high: "border-emerald-600/30 bg-emerald-600/5 text-emerald-700",
    medium: "border-stamp/40 bg-stamp/5 text-stamp",
    low: "border-rule bg-paper-deep/40 text-muted-foreground",
  };
  const labels = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${styles[confidence]}`}>
      {labels[confidence]}
    </span>
  );
}

function ConfidenceDot({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const colors = { high: "bg-emerald-600", medium: "bg-stamp", low: "bg-muted-foreground" };
  return <span className={`h-1.5 w-1.5 rounded-full ${colors[confidence]}`} title={confidence} />;
}

function DetailRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="rounded-md border border-rule/60 bg-paper-deep/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-sm" : "text-sm"} ${highlight ? "font-medium text-stamp" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function DeadlineAlert({ deadline }: { deadline: string }) {
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let urgency: "overdue" | "urgent" | "soon" | "comfortable" = "comfortable";
  let label = "";
  if (diffDays < 0) { urgency = "overdue"; label = `${Math.abs(diffDays)} days past deadline`; }
  else if (diffDays <= 3) { urgency = "urgent"; label = `${diffDays} day${diffDays === 1 ? "" : "s"} remaining`; }
  else if (diffDays <= 14) { urgency = "soon"; label = `${diffDays} days remaining`; }
  else { label = `${diffDays} days remaining`; }

  const colors = {
    overdue: "border-destructive/40 bg-destructive/5",
    urgent: "border-destructive/30 bg-destructive/5",
    soon: "border-stamp/40 bg-stamp/5",
    comfortable: "border-rule/60 bg-paper-deep/30",
  };

  return (
    <div className={`rounded-lg border p-5 ${colors[urgency]}`}>
      <div className="flex items-center gap-2">
        <svg className="h-5 w-5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
        </svg>
        <span className="font-serif text-lg">
          {urgency === "overdue" ? "Deadline has passed" : "Response deadline"}
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        <span className="font-medium text-foreground">{formatDate(deadline)}</span> — {label}
      </p>
      {(urgency === "overdue" || urgency === "urgent") && (
        <p className="mt-2 text-xs text-destructive">
          We recommend sending your response as soon as possible. Consider consulting with an attorney about your options.
        </p>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}
