import { useState } from "react";
import { SectionCard, Field, TextField, TextArea, FileList, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { getSelectedNoticeOption, type TaxNoticeIntake } from "@/domain/step-workflows/tax-notice";

export function IntakeStep({ matter, onUpdateData, onComplete, goToStep }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as TaxNoticeIntake;
  const [form, setForm] = useState<TaxNoticeIntake>({
    taxpayerName: intake.taxpayerName ?? "",
    taxpayerAddress: intake.taxpayerAddress ?? "",
    agencyName: intake.agencyName ?? "",
    agencyAddress: intake.agencyAddress ?? "",
    issueDescription: intake.issueDescription ?? "",
    additionalContext: intake.additionalContext ?? "",
  });
  const option = getSelectedNoticeOption(matter);
  const files = ((matter.steps.documents?.data.files as { id: string; name: string }[]) ?? []).slice(0, 5);

  function set<K extends keyof TaxNoticeIntake>(key: K, value: TaxNoticeIntake[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleContinue() {
    await onUpdateData(form);
    await onComplete();
  }

  const requiredFilled = Boolean(form.taxpayerName && form.taxpayerAddress && form.agencyName && form.agencyAddress && form.issueDescription?.trim());

  return (
    <>
      {option && (
        <SectionCard title={`Notice type: ${option.label}`} headerAside={<button type="button" className="wf-btn wf-btn--outline" onClick={() => goToStep("identify")}>Change</button>}>
          <p style={{ fontSize: "0.82rem", color: "var(--wf-color-stone)" }}>{option.deadlineGuidance}</p>
        </SectionCard>
      )}

      <SectionCard
        title="Your information"
        description="This identifies you to the agency and is where any written reply should be sent. Use the address you want correspondence sent to."
        headerAside={<span className="wf-pill wf-pill--warning">Required</span>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Full name" required>
            <TextField value={form.taxpayerName ?? ""} placeholder="e.g. Jordan A. Rivera" onChange={(e) => set("taxpayerName", e.target.value)} />
          </Field>
          <Field label="Mailing address" required hint="Street, city, state, and ZIP.">
            <TextField value={form.taxpayerAddress ?? ""} placeholder="e.g. 123 Main St, Springfield, IL 62704" onChange={(e) => set("taxpayerAddress", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Agency mailing address"
        description="Copy this exactly from your notice — the correct return address is usually printed near the top or in a “respond to” section. This is where your response will be mailed."
        headerAside={<span className="wf-pill wf-pill--warning">Required</span>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Agency name" required hint="e.g. Internal Revenue Service, or your state's Department of Revenue.">
            <TextField value={form.agencyName ?? ""} placeholder="e.g. Internal Revenue Service" onChange={(e) => set("agencyName", e.target.value)} />
          </Field>
          <Field label="Agency mailing address" required>
            <TextField value={form.agencyAddress ?? ""} placeholder="e.g. Internal Revenue Service, P.O. Box 931100, Louisville, KY 40293-1100" onChange={(e) => set("agencyAddress", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Your facts"
        description="Explain your situation in your own words — only include information you can verify or support with documentation."
        headerAside={<span className="wf-pill wf-pill--warning">Required</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!requiredFilled} onClick={handleContinue}>
            Continue Intake →
          </button>
        }
      >
        <Field label="What happened, and what do you believe is correct?" required hint={`Be specific — dates, amounts, and how you know it's accurate. ${(form.issueDescription ?? "").length}/1500`}>
          <TextArea rows={4} maxLength={1500} value={form.issueDescription ?? ""} placeholder="e.g. This notice proposes an additional $1,240 based on a 1099 I never received. I have my complete records for this tax year and the income was already reported on..." onChange={(e) => set("issueDescription", e.target.value)} />
        </Field>
        <div style={{ marginTop: "1rem" }}>
          <Field label="Anything else? (optional)">
            <TextArea rows={2} value={form.additionalContext ?? ""} placeholder="Anything the agency should know that isn't covered above." onChange={(e) => set("additionalContext", e.target.value)} />
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
        steps={[{ label: "Enter your information" }, { label: "Enter the agency's address" }, { label: "Continue to Documents" }]}
        continueLabel="Continue Intake"
        continueDisabled={!requiredFilled}
        onContinue={handleContinue}
      />
    </>
  );
}
