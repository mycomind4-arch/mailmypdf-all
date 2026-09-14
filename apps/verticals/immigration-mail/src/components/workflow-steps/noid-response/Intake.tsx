import { useState } from "react";
import { SectionCard, Field, TextField, TextArea, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { NoidResponseIntake } from "@/domain/step-workflows/noid-response";
import { getAllFormProfiles } from "@/domain/form-adapters";

const FORM_PROFILES = getAllFormProfiles();

export function IntakeStep({ matter, onUpdateData, onComplete, goToStep }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as NoidResponseIntake;
  const [form, setForm] = useState<NoidResponseIntake>(intake);
  const files = ((matter.steps.documents?.data.files as { id: string; name: string }[]) ?? []).slice(0, 5);

  function set<K extends keyof NoidResponseIntake>(key: K, value: NoidResponseIntake[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleContinue() {
    await onUpdateData(form);
    await onComplete();
  }

  const requiredFilled = Boolean(form.formType && form.receiptNumber && form.deniedGroundsSummary && form.requestedOutcome);

  return (
    <>
      <SectionCard
        title="Case intake"
        description="Tell us about the NOID you received. This information will be used to identify the denial grounds and organize your response."
        headerAside={<span className="wf-pill wf-pill--warning">Required fields</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!requiredFilled} onClick={handleContinue}>
            Continue Intake →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Form type" required>
            <select className="wf-input" value={form.formType ?? ""} onChange={(e) => set("formType", e.target.value)}>
              <option value="">Select a form…</option>
              {FORM_PROFILES.map((profile) => (
                <option key={profile.formType} value={profile.formType}>
                  {profile.formType} — {profile.formName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Receipt number" required>
            <TextField value={form.receiptNumber ?? ""} placeholder="e.g. MSC2190012345" onChange={(e) => set("receiptNumber", e.target.value)} />
          </Field>
          <Field label="Applicant name">
            <TextField value={form.applicantName ?? ""} onChange={(e) => set("applicantName", e.target.value)} />
          </Field>
          <Field label="NOID issued date">
            <TextField type="date" value={form.noidIssuedDate ?? ""} onChange={(e) => set("noidIssuedDate", e.target.value)} />
          </Field>
          <Field label="Response deadline">
            <TextField type="date" value={form.responseDeadline ?? ""} onChange={(e) => set("responseDeadline", e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="Denied grounds summary" required hint={`${(form.deniedGroundsSummary ?? "").length}/1000`}>
            <TextArea
              rows={3}
              maxLength={1000}
              placeholder="Summarize the grounds USCIS cited in the NOID..."
              value={form.deniedGroundsSummary ?? ""}
              onChange={(e) => set("deniedGroundsSummary", e.target.value)}
            />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="Requested outcome" required hint={`${(form.requestedOutcome ?? "").length}/1000`}>
            <TextArea
              rows={2}
              maxLength={1000}
              placeholder="What you are asking USCIS to do (e.g. approve the petition as filed)..."
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
        steps={[{ label: "Fill required fields" }, { label: "Add supporting documents" }, { label: "Continue to Documents" }]}
        continueLabel="Continue Intake"
        continueDisabled={!requiredFilled}
        onContinue={handleContinue}
      />
    </>
  );
}
