import { useEffect, useState } from "react";
import { SectionCard, TextArea, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { generateCP2000MatterDraft, validateCP2000MatterDraft } from "@/domain/step-workflows/cp2000";

export function DraftStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const generated = generateCP2000MatterDraft(matter);
  const saved = (matter.steps.draft?.data.content as string | undefined) ?? generated;
  const [content, setContent] = useState(saved);

  useEffect(() => {
    setContent((matter.steps.draft?.data.content as string | undefined) ?? generated);
    // Only re-sync when the matter identity/step actually changes underneath us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matter.id, matter.steps.draft?.data.content]);

  const validation = validateCP2000MatterDraft(matter, content);

  async function handleContinue() {
    await onUpdateData({ content });
    await onComplete();
  }

  return (
    <>
      <SectionCard
        title="Draft response letter"
        description="We assembled this letter from your intake, notice details, and chosen response position. Review every name, date, amount, and statement carefully — this is what gets mailed."
        headerAside={<span className="wf-pill wf-pill--success">Generated draft</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={validation.blocked} onClick={handleContinue}>
            Continue to Review →
          </button>
        }
      >
        <TextArea rows={18} value={content} onChange={(e) => setContent(e.target.value)} style={{ fontFamily: "var(--wf-font-mono)", fontSize: "0.85rem" }} />

        <div style={{ marginTop: "1rem" }}>
          <div className="wf-card-eyebrow">Draft quality check</div>
          <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {validation.allFindings.map((finding, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                <StatusPill
                  tone={finding.severity === "block" || finding.severity === "error" ? "warning" : finding.passed ? "success" : "info"}
                  label={finding.passed ? "Ready" : finding.severity === "block" ? "Blocked" : "Needs review"}
                />
                {finding.check}: {finding.detail}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Review draft content" }, { label: "Resolve any blocks" }, { label: "Continue to Review" }]}
        continueLabel="Continue to Review"
        continueDisabled={validation.blocked}
        onContinue={handleContinue}
      />
    </>
  );
}
