import { useState } from "react";
import { SectionCard, StatusPill, DataTable, TextArea, Field, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { NoidResponseIntake } from "@/domain/step-workflows/noid-response";
import { getFormProfile } from "@/domain/form-adapters";

export function EvidenceStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as NoidResponseIntake;
  const profile = intake.formType ? getFormProfile(intake.formType) : undefined;
  const grounds = profile?.commonNOIDGrounds ?? ["General denial ground"];

  const savedResponses = (matter.steps.evidence?.data.responses as Record<string, string>) ?? {};
  const [responses, setResponses] = useState<Record<string, string>>(savedResponses);

  async function handleSave() {
    await onUpdateData({ responses });
    await onComplete();
  }

  return (
    <>
      <SectionCard
        title="Evidence builder"
        description="Address each denial ground individually. For each one, write the response you want reflected in your NOID reply and note the supporting evidence."
        headerAside={<span className="wf-pill wf-pill--info">Structured record</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" onClick={handleSave}>
            Save evidence record →
          </button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {grounds.map((ground, index) => (
            <div key={ground} style={{ borderTop: index > 0 ? "1px solid var(--wf-color-rule)" : undefined, paddingTop: index > 0 ? "1.1rem" : undefined }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ fontWeight: 600 }}>
                  Ground {index + 1} — {ground}
                </div>
                <StatusPill tone="warning" label="Needs review" />
              </div>
              <div style={{ marginTop: "0.75rem" }}>
                <Field label="Response and supporting evidence for this ground">
                  <TextArea
                    rows={2}
                    placeholder="Explain why this ground does not apply, or how it is resolved by the evidence provided..."
                    value={responses[ground] ?? ""}
                    onChange={(e) => setResponses((current) => ({ ...current, [ground]: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Evidence map" description="This record will help draft a clear, ground-by-ground response.">
        <DataTable
          columns={[
            { key: "ground", label: "Ground" },
            { key: "status", label: "Status" },
            { key: "notes", label: "Notes" },
          ]}
          rows={grounds.map((ground) => ({
            ground,
            status: <StatusPill tone={responses[ground] ? "success" : "warning"} label={responses[ground] ? "Ready" : "Needs review"} />,
            notes: responses[ground] ? `${responses[ground].slice(0, 60)}${responses[ground].length > 60 ? "…" : ""}` : "Not yet addressed",
          }))}
        />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Address each ground" }, { label: "Link supporting files" }, { label: "Continue to timeline" }]}
        continueLabel="Continue to Timeline"
        onContinue={handleSave}
      />
    </>
  );
}
