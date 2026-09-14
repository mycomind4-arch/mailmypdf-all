import { useState } from "react";
import { SectionCard, Field, TextArea, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { getCombinedCP2000Data, generateCP2000StrategyForData, type CP2000Data } from "@/domain/step-workflows/cp2000";

const POSITION_OPTIONS: Array<{ value: NonNullable<CP2000Data["responsePosition"]>; label: string; description: string }> = [
  { value: "agree", label: "I agree with the proposed changes", description: "Sign and return the response form; you may owe the proposed amount." },
  { value: "disagree_some", label: "I agree with some, disagree with the rest", description: "Explain which items you dispute and provide supporting documentation for those." },
  { value: "disagree", label: "I disagree with the proposed changes", description: "Provide documentation showing why the proposed changes are incorrect." },
];

export function ResponsePositionStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const combined = getCombinedCP2000Data(matter);
  const [form, setForm] = useState<CP2000Data>((matter.steps["response-position"]?.data ?? {}) as CP2000Data);
  const merged = { ...combined, ...form };

  function set<K extends keyof CP2000Data>(key: K, value: CP2000Data[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleContinue() {
    await onUpdateData(form);
    await onComplete();
  }

  const strategy = generateCP2000StrategyForData(merged);
  const canContinue = Boolean(merged.responsePosition);

  return (
    <>
      <SectionCard
        title="Choose your response position"
        description="Select the position that matches your situation. This determines how your response letter is framed."
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!canContinue} onClick={handleContinue}>
            Continue to Draft →
          </button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {POSITION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="wf-card"
              style={{
                display: "flex",
                gap: "0.75rem",
                cursor: "pointer",
                background: merged.responsePosition === option.value ? "var(--wf-color-navy-bg)" : "var(--wf-color-paper-deep)",
                borderColor: merged.responsePosition === option.value ? "var(--wf-color-navy)" : undefined,
              }}
            >
              <input type="radio" name="responsePosition" checked={merged.responsePosition === option.value} onChange={() => set("responsePosition", option.value)} style={{ marginTop: "0.2rem" }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{option.label}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--wf-color-stone)" }}>{option.description}</div>
              </div>
            </label>
          ))}
        </div>

        {strategy.explanations.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div className="wf-card-eyebrow">Suggested explanation, based on your notice details</div>
            <ul style={{ marginTop: "0.4rem", fontSize: "0.85rem", color: "var(--wf-color-stone)", paddingLeft: "1.1rem" }}>
              {strategy.explanations.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Anything else the IRS should know?">
        <Field label="Additional facts (optional)" hint={`${(merged.userFacts ?? "").length}/1000`}>
          <TextArea rows={3} maxLength={1000} value={merged.userFacts ?? ""} onChange={(e) => set("userFacts", e.target.value)} />
        </Field>
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Select a position" }, { label: "Add supporting facts" }, { label: "Continue to Draft" }]}
        continueLabel="Continue to Draft"
        continueDisabled={!canContinue}
        onContinue={handleContinue}
      />
    </>
  );
}
