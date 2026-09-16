/**
 * LLMAnalysisPanel — Notice Respond adapter for the shared structured analysis UI.
 *
 * Domain analysis stays in Notice Respond; reusable presentation lives in
 * @mailmypdf/workflow-ui.
 */
import { StructuredAnalysisPanel } from "@mailmypdf/workflow-ui";
import type { LLMAnalysis } from "../domain/use-llm-workflow";

interface Props {
  analysis: LLMAnalysis;
  provider: string | null;
}

export function LLMAnalysisPanel({ analysis, provider }: Props) {
  const summary = analysis.summary as string | undefined;
  const keyFacts =
    (analysis.keyFacts as Array<{ label: string; value: string; source: string }>) || [];
  const requestedActions = (analysis.requestedActions as string[]) || [];
  const rawIssues =
    (analysis.discrepancies as Array<{ type?: string; description?: string }>) ||
    (analysis.issues as Array<{ issue?: string; whyItMatters?: string; evidenceNeeded?: string[] }>) ||
    [];
  const evidenceNeeded = (analysis.evidenceNeeded as string[]) || [];
  const uncertainties = (analysis.uncertainties as string[]) || [];
  const confidence = analysis.confidence as "high" | "medium" | "low" | undefined;
  const urgentActions = (analysis.urgentActions as string[]) || [];

  return (
    <StructuredAnalysisPanel
      providerLabel={provider ? `AI · ${provider}` : "AI analysis"}
      confidence={confidence}
      summary={summary}
      urgentActions={urgentActions}
      facts={keyFacts.map((fact, index) => ({
        id: `fact-${index}`,
        label: fact.label,
        value: fact.value,
        source: fact.source,
      }))}
      requestedActions={requestedActions}
      issues={rawIssues.map((issue, index) => ({
        id: `issue-${index}`,
        title:
          (issue as { issue?: string }).issue ||
          (issue as { type?: string }).type ||
          `Issue ${index + 1}`,
        description:
          (issue as { description?: string }).description ||
          (issue as { whyItMatters?: string }).whyItMatters,
        evidenceNeeded: (issue as { evidenceNeeded?: string[] }).evidenceNeeded,
        severity: "warning",
      }))}
      evidenceNeeded={evidenceNeeded}
      uncertainties={uncertainties}
    />
  );
}
