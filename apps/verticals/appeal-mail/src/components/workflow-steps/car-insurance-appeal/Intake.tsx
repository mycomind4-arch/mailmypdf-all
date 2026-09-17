import { useState } from "react";
import { SectionCard, Field, TextField, TextArea, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "@mailmypdf/workflow-ui";
import type { CarInsuranceAppealIntake } from "@/domain/step-workflows/car-insurance-appeal";

const LIABILITY_OPTIONS = [
  { value: "", label: "Select the option that matches your letter" },
  { value: "insured_at_fault", label: "The insurer says I was fully at fault" },
  { value: "shared_fault", label: "The insurer says I was partially at fault (a fault percentage or comparative negligence)" },
  { value: "other_driver_at_fault_denied", label: "The other driver was found at fault, but my claim was still denied" },
  { value: "undetermined", label: "Fault hasn't been decided yet" },
];

/** Shared value → readable-label lookup so Analyze/Draft/Review can render this field without re-declaring the option set. */
export const LIABILITY_DETERMINATION_LABELS: Record<string, string> = Object.fromEntries(
  LIABILITY_OPTIONS.filter((option) => option.value).map((option) => [option.value, option.label]),
);

export function IntakeStep({ matter, onUpdateData, onComplete, goToStep }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as CarInsuranceAppealIntake;
  const [form, setForm] = useState<CarInsuranceAppealIntake>(intake);
  const files = ((matter.steps.documents?.data.files as { id: string; name: string }[]) ?? []).slice(0, 5);

  function set<K extends keyof CarInsuranceAppealIntake>(key: K, value: CarInsuranceAppealIntake[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleContinue() {
    await onUpdateData(form);
    await onComplete();
  }

  const requiredFilled = Boolean(
    form.insurer && form.claimNumber && form.accidentDate && form.denialReason && form.damageDescription && form.requestedOutcome,
  );

  return (
    <>
      <SectionCard
        title="The essentials"
        description="These come straight from your denial or reduction letter. We use them to identify your claim and check the insurer's decision against the actual facts — nothing here requires legal knowledge, just what's printed on the letter."
        headerAside={<span className="wf-pill wf-pill--warning">Required</span>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Insurance company" required hint="The company name on your denial letter, not your agent's name.">
            <TextField value={form.insurer ?? ""} placeholder="e.g. Progressive Auto Insurance" onChange={(e) => set("insurer", e.target.value)} />
          </Field>
          <Field label="Claim number" required hint="Printed on the letter, usually near the top.">
            <TextField value={form.claimNumber ?? ""} placeholder="e.g. CLM-2026-004821" onChange={(e) => set("claimNumber", e.target.value)} />
          </Field>
          <Field label="Date of the accident" required>
            <TextField type="date" value={form.accidentDate ?? ""} onChange={(e) => set("accidentDate", e.target.value)} />
          </Field>
          <Field label="Date of the denial letter" hint="Helps us confirm you're still within the appeal window.">
            <TextField type="date" value={form.decisionDate ?? ""} onChange={(e) => set("decisionDate", e.target.value)} />
          </Field>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <Field label="What does the letter say, in your own words?" required hint={`Why this matters: this is what we rebut point by point in your appeal. ${(form.denialReason ?? "").length}/1000`}>
            <TextArea
              rows={3}
              maxLength={1000}
              placeholder="e.g. 'They said I was 70% at fault for the collision and only paid 30% of my repair costs.' Copy or paraphrase the insurer's stated reason."
              value={form.denialReason ?? ""}
              onChange={(e) => set("denialReason", e.target.value)}
            />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="Describe the damage to your vehicle" required hint={`Why this matters: we compare this to the insurer's damage assessment. ${(form.damageDescription ?? "").length}/1000`}>
            <TextArea
              rows={3}
              maxLength={1000}
              placeholder="e.g. Front-end damage to the fender and headlight. My body shop quoted $6,240, but the insurer only approved $4,390."
              value={form.damageDescription ?? ""}
              onChange={(e) => set("damageDescription", e.target.value)}
            />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="What do you want the insurer to do?" required hint={`Be specific — e.g. a dollar amount or a corrected fault percentage. ${(form.requestedOutcome ?? "").length}/1000`}>
            <TextArea
              rows={2}
              maxLength={1000}
              placeholder="e.g. Reassess liability using my dashcam footage and approve the full $6,240 repair estimate."
              value={form.requestedOutcome ?? ""}
              onChange={(e) => set("requestedOutcome", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Strengthen your appeal"
        description="Optional, but each one you can fill in makes your appeal more specific and harder to dismiss. Skip anything you don't have on hand — you can add it later."
        headerAside={<span className="wf-pill wf-pill--neutral">Optional</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!requiredFilled} onClick={handleContinue}>
            Continue Intake →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Policy number">
            <TextField value={form.policyNumber ?? ""} placeholder="e.g. POL-8834471-02" onChange={(e) => set("policyNumber", e.target.value)} />
          </Field>
          <Field label="Claims adjuster's name" hint="Whoever signed or handled your claim, if you know it.">
            <TextField value={form.adjusterName ?? ""} placeholder="e.g. Marcus Webb" onChange={(e) => set("adjusterName", e.target.value)} />
          </Field>
          <Field label="Appeal deadline" hint="If your letter gives one — missing it can end your appeal.">
            <TextField type="date" value={form.deadline ?? ""} onChange={(e) => set("deadline", e.target.value)} />
          </Field>
          <Field label="Police report number" hint="If you filed one — it can support your version of events.">
            <TextField value={form.policeReportNumber ?? ""} placeholder="e.g. PD-2026-118834" onChange={(e) => set("policeReportNumber", e.target.value)} />
          </Field>
          <Field label="What did the insurer decide about fault?" hint="Pick the closest match — you can refine this later.">
            <select
              className="wf-input"
              value={form.liabilityDetermination ?? ""}
              onChange={(e) => set("liabilityDetermination", e.target.value)}
            >
              {LIABILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Your own repair estimate" hint="From your mechanic or body shop, if it's different from the insurer's number.">
            <TextField value={form.repairEstimateAmount ?? ""} placeholder="e.g. $6,240.00" onChange={(e) => set("repairEstimateAmount", e.target.value)} />
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
        steps={[{ label: "Fill in the essentials" }, { label: "Add the denial letter" }, { label: "Continue to Documents" }]}
        continueLabel="Continue Intake"
        continueDisabled={!requiredFilled}
        onContinue={handleContinue}
      />
    </>
  );
}
