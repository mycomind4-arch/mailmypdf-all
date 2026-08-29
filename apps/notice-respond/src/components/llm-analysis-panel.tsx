/**
 * LLMAnalysisPanel — displays AI-powered document analysis results.
 *
 * Shows:
 * - Plain-language summary
 * - Key facts with source quotes
 * - Requested actions
 * - Discrepancies / issues found
 * - Evidence needed
 * - Uncertainties
 * - Confidence level
 *
 * Used by every workflow route after the document upload step.
 */
import type { LLMAnalysis } from "../domain/use-llm-workflow";

interface Props {
  analysis: LLMAnalysis;
  provider: string | null;
}

export function LLMAnalysisPanel({ analysis, provider }: Props) {
  const summary = analysis.summary as string | undefined;
  const keyFacts = (analysis.keyFacts as Array<{ label: string; value: string; source: string }>) || [];
  const requestedActions = (analysis.requestedActions as string[]) || [];
  const discrepancies = (analysis.discrepancies as Array<{ type?: string; description?: string }>) ||
    (analysis.issues as Array<{ issue?: string; whyItMatters?: string; evidenceNeeded?: string[] }>) || [];
  const evidenceNeeded = (analysis.evidenceNeeded as string[]) || [];
  const uncertainties = (analysis.uncertainties as string[]) || [];
  const confidence = analysis.confidence as string | undefined;
  const urgentActions = (analysis.urgentActions as string[]) || [];

  return (
    <div className="mt-6 space-y-4">
      {/* Provider badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          ✦ AI Analysis {provider ? `· ${provider}` : ""}
        </span>
        {confidence && (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            confidence === "high" ? "bg-emerald-100 text-emerald-700" :
            confidence === "medium" ? "bg-amber-100 text-amber-700" :
            "bg-orange-100 text-orange-700"
          }`}>
            {confidence} confidence
          </span>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="rounded-lg border border-rule/60 bg-paper-deep/30 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Summary</div>
          <p className="mt-2 text-foreground">{summary}</p>
        </div>
      )}

      {/* Urgent actions */}
      {urgentActions.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-red-700">Urgent — Do Not Miss</div>
          <ul className="mt-2 space-y-1">
            {urgentActions.map((action, i) => (
              <li key={i} className="text-sm text-red-800">⚠ {action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Key facts */}
      {keyFacts.length > 0 && (
        <div className="rounded-lg border border-rule/60 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Key Facts Extracted</div>
          <dl className="mt-3 space-y-3">
            {keyFacts.map((fact, i) => (
              <div key={i} className="flex flex-col gap-1">
                <dt className="font-medium text-foreground">{fact.label}</dt>
                <dd className="text-sm text-muted-foreground">{fact.value}</dd>
                {fact.source && (
                  <dd className="text-xs text-muted-foreground/70 italic">Source: "{fact.source}"</dd>
                )}
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Requested actions */}
      {requestedActions.length > 0 && (
        <div className="rounded-lg border border-rule/60 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">What the Notice Asks You to Do</div>
          <ul className="mt-2 space-y-2">
            {requestedActions.map((action, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="text-primary font-mono">{i + 1}.</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Discrepancies / Issues */}
      {discrepancies.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-amber-700">Issues Found</div>
          <ul className="mt-2 space-y-3">
            {discrepancies.map((d, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-foreground">
                  {(d as { issue?: string }).issue || (d as { type?: string }).type || `Issue ${i + 1}`}
                </span>
                {((d as { description?: string }).description || (d as { whyItMatters?: string }).whyItMatters) && (
                  <p className="mt-1 text-muted-foreground">
                    {(d as { description?: string }).description || (d as { whyItMatters?: string }).whyItMatters}
                  </p>
                )}
                {((d as { evidenceNeeded?: string[] }).evidenceNeeded || []).length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Evidence needed: {(d as { evidenceNeeded?: string[] }).evidenceNeeded!.join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence needed */}
      {evidenceNeeded.length > 0 && (
        <div className="rounded-lg border border-rule/60 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Evidence You Should Gather</div>
          <ul className="mt-2 space-y-1">
            {evidenceNeeded.map((item, i) => (
              <li key={i} className="text-sm text-foreground">📋 {item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Uncertainties */}
      {uncertainties.length > 0 && (
        <div className="rounded-lg border border-rule/60 bg-muted/30 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Uncertainties</div>
          <ul className="mt-2 space-y-1">
            {uncertainties.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground">❓ {item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground/70">
            These items need clarification. You can address them in the Facts step or upload additional documents.
          </p>
        </div>
      )}
    </div>
  );
}
