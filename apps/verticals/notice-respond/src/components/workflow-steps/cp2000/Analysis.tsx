import { SectionCard, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { analyzeCP2000Matter, getCombinedCP2000Data, type CP2000Data } from "@/domain/step-workflows/cp2000";

const REQUIREMENT_TONE: Record<string, "success" | "warning" | "info"> = {
  required: "warning",
  recommended: "info",
  optional: "success",
  not_applicable: "success",
};

const RESOLUTION_OPTIONS: Array<{ value: NonNullable<CP2000Data["discrepancyResolutions"]>[string]; label: string }> = [
  { value: "unresolved", label: "Not yet resolved" },
  { value: "user_correct", label: "My reported figure is correct" },
  { value: "irs_correct", label: "The IRS figure is correct" },
  { value: "unclear", label: "Unclear — flag for review" },
];

export function AnalysisStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const { discrepancies, evidence } = analyzeCP2000Matter(matter);
  const combined = getCombinedCP2000Data(matter);
  const resolutions = combined.discrepancyResolutions ?? {};

  async function setResolution(type: string, value: NonNullable<CP2000Data["discrepancyResolutions"]>[string]) {
    await onUpdateData({ discrepancyResolutions: { ...resolutions, [type]: value } });
  }

  const unresolvedCount = discrepancies.filter((d) => d.status === "unresolved").length;

  return (
    <>
      <SectionCard
        title="Discrepancy analysis"
        description="Based on your notice details, here's what the discrepancy engine found. Resolve each item so your response letter doesn't leave it hanging."
        headerAside={unresolvedCount > 0 ? <span className="wf-pill wf-pill--warning">{unresolvedCount} unresolved</span> : discrepancies.length > 0 ? <span className="wf-pill wf-pill--success">All resolved</span> : undefined}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" onClick={onComplete}>
            Continue to Response Position →
          </button>
        }
      >
        {discrepancies.length === 0 && <p style={{ fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>No discrepancies detected yet — go back to Notice Details to add the reported amounts.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {discrepancies.map((d) => (
            <div key={d.id} className="wf-card" style={{ background: "var(--wf-color-paper-deep)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{d.description}</div>
                <StatusPill tone={d.status === "unresolved" ? "warning" : "success"} label={d.status === "unresolved" ? "Unresolved" : "Resolved"} />
              </div>
              {d.possibleExplanations.length > 0 && (
                <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "var(--wf-color-stone)" }}>
                  Possible explanations: {d.possibleExplanations.join("; ")}
                </div>
              )}
              {d.evidenceNeeded.length > 0 && (
                <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "var(--wf-color-stone)" }}>
                  Evidence needed: {d.evidenceNeeded.join(", ")}
                </div>
              )}
              <div style={{ marginTop: "0.6rem" }}>
                <select
                  className="wf-input"
                  value={d.status}
                  onChange={(e) => setResolution(d.type, e.target.value as NonNullable<CP2000Data["discrepancyResolutions"]>[string])}
                >
                  {RESOLUTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Evidence checklist" description={`${evidence.providedCount} of ${evidence.requiredCount} required items provided.`}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {evidence.items.map((item) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.4rem 0", borderTop: "1px solid var(--wf-color-rule)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{item.label}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--wf-color-stone)" }}>{item.purpose}</div>
              </div>
              <StatusPill tone={item.state === "provided" || item.state === "verified" ? "success" : REQUIREMENT_TONE[item.requirement]} label={item.state === "provided" || item.state === "verified" ? "Provided" : item.requirement} />
            </div>
          ))}
        </div>
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Review discrepancies" }, { label: "Check evidence needed" }, { label: "Continue to Response Position" }]}
        continueLabel="Continue to Response Position"
        onContinue={onComplete}
      />
    </>
  );
}
