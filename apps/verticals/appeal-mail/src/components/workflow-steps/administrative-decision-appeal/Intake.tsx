import { useState } from "react";
import { SectionCard, Field, TextField, TextArea, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "@mailmypdf/workflow-ui";
import type { AdministrativeDecisionAppealIntake } from "@/domain/step-workflows/administrative-decision-appeal";

export function IntakeStep({ matter, onUpdateData, onComplete, goToStep }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as AdministrativeDecisionAppealIntake;
  const [form, setForm] = useState<AdministrativeDecisionAppealIntake>(intake);
  const files = ((matter.steps.documents?.data.files as { id: string; name: string }[]) ?? []).slice(0, 5);

  function set<K extends keyof AdministrativeDecisionAppealIntake>(key: K, value: AdministrativeDecisionAppealIntake[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleContinue() {
    await onUpdateData(form);
    await onComplete();
  }

  const requiredFilled = Boolean(form.issuer && form.jurisdiction && form.decisionSummary && form.requestedOutcome);

  return (
    <>
      <SectionCard
        title="Matter intake"
        description="Tell us who issued the decision, the jurisdiction, and what happened. This information will be used to verify the governing procedure and generate your appeal."
        headerAside={<span className="wf-pill wf-pill--warning">Required fields</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!requiredFilled} onClick={handleContinue}>
            Continue Intake →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Decision-maker / issuer" required>
            <TextField
              value={form.issuer ?? ""}
              placeholder="Department of Motor Vehicles"
              onChange={(e) => set("issuer", e.target.value)}
            />
          </Field>
          <Field label="Jurisdiction" required>
            <TextField value={form.jurisdiction ?? ""} placeholder="State of Illinois" onChange={(e) => set("jurisdiction", e.target.value)} />
          </Field>
          <Field label="Reference / case number">
            <TextField value={form.referenceNumber ?? ""} onChange={(e) => set("referenceNumber", e.target.value)} />
          </Field>
          <Field label="Matter type">
            <TextField
              value={form.matterType ?? ""}
              placeholder="Licensing decision"
              onChange={(e) => set("matterType", e.target.value)}
            />
          </Field>
          <Field label="Decision date">
            <TextField type="date" value={form.decisionDate ?? ""} onChange={(e) => set("decisionDate", e.target.value)} />
          </Field>
          <Field label="Appeal deadline">
            <TextField type="date" value={form.deadline ?? ""} onChange={(e) => set("deadline", e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="Decision summary" required hint={`${(form.decisionSummary ?? "").length}/1000`}>
            <TextArea
              rows={3}
              maxLength={1000}
              placeholder="Summarize what the decision-maker decided and the stated grounds."
              value={form.decisionSummary ?? ""}
              onChange={(e) => set("decisionSummary", e.target.value)}
            />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="Requested outcome" required hint={`${(form.requestedOutcome ?? "").length}/1000`}>
            <TextArea
              rows={2}
              maxLength={1000}
              placeholder="Describe what you want the decision-maker to do instead."
              value={form.requestedOutcome ?? ""}
              onChange={(e) => set("requestedOutcome", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title={`Uploaded documents (${files.length})`}
        headerAside={
          <button type="button" className="wf-btn wf-btn--outline" onClick={() => goToStep("documents")}>
            Upload files
          </button>
        }
      >
        <FileList items={files.map((file) => ({ id: file.id, name: file.name }))} />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Fill required fields" }, { label: "Add the decision notice" }, { label: "Continue to Documents" }]}
        continueLabel="Continue Intake"
        continueDisabled={!requiredFilled}
        onContinue={handleContinue}
      />
    </>
  );
}
