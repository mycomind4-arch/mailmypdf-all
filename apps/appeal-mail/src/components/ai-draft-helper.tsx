/**
 * AI Draft Helper — shared component for dispute-mail workflows.
 *
 * Provides LLM provider selection and AI-powered draft generation.
 * Drop into any workflow's draft step.
 */

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { getLLMProviders } from "@/api/llm-providers";
import { generateDraftWithAI } from "@/api/ai-drafting";
import type { LLMProvider } from "@/platform/llm-service";

export function AIDraftHelper({
  workflowId,
  workflowTitle,
  documentText,
  analysis,
  userFacts,
  userObjective,
  onDraft,
}: {
  workflowId: string;
  workflowTitle: string;
  documentText: string;
  analysis: {
    agency: string | null;
    noticeType: string | null;
    referenceNumber: string | null;
    noticeDate: string | null;
    responseDeadline: string | null;
    amountOwed: string | null;
    keyFacts: string[];
    summary: string;
  };
  userFacts: string;
  userObjective: string;
  onDraft: (draft: string) => void;
}) {
  const [providers, setProviders] = useState<{ id: LLMProvider; label: string; available: boolean }[]>([]);
  const [selected, setSelected] = useState<LLMProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLLMProviders().then((ps) => {
      setProviders(ps);
      const first = ps.find((p) => p.available);
      if (first) setSelected(first.id);
    }).catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!userFacts && !userObjective) {
      setError("Please provide your facts and objective first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateDraftWithAI({
        data: {
          workflowId,
          workflowTitle,
          documentText,
          analysis,
          userFacts,
          userObjective,
          provider: selected ?? undefined,
        },
      });
      onDraft((result as { draft: string }).draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI draft generation failed.");
    } finally {
      setLoading(false);
    }
  }, [workflowId, workflowTitle, documentText, analysis, userFacts, userObjective, selected, onDraft]);

  if (providers.length === 0) return null;

  return (
    <div className="mt-4">
      {/* Provider selector */}
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <button
            key={p.id}
            disabled={!p.available}
            onClick={() => setSelected(p.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              selected === p.id
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            } ${!p.available ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "Generating…" : `Generate with AI${selected ? ` (${selected})` : ""}`}
        </button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  );
}
