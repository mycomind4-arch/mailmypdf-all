import { useState } from "react";
import { SectionCard, Field, TextField, TextArea, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { CP2000Data } from "@/domain/step-workflows/cp2000";

export function IntakeStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const existing = (matter.steps.intake?.data ?? {}) as CP2000Data;
  const [form, setForm] = useState<CP2000Data>(existing);

  function set<K extends keyof CP2000Data>(key: K, value: CP2000Data[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleContinue() {
    await onUpdateData(form);
    await onComplete();
  }

  const requiredFilled = Boolean(
    form.taxYear && form.noticeDate && form.responseDeadline && form.proposedChangeAmount &&
    form.taxpayerName && form.mailingAddress && form.whatHappened && form.whatResponseSought,
  );

  return (
    <>
      <SectionCard
        title="Notice intake"
        description="Tell us about your CP2000 notice and your situation. This information will be used to prepare your response and organize your evidence."
        headerAside={<span className="wf-pill wf-pill--warning">Required fields</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!requiredFilled} onClick={handleContinue}>
            Continue to Notice Details →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Field label="Tax year" required>
            <TextField value={form.taxYear ?? ""} placeholder="2023" onChange={(e) => set("taxYear", e.target.value)} />
          </Field>
          <Field label="IRS notice date" required>
            <TextField type="date" value={form.noticeDate ?? ""} onChange={(e) => set("noticeDate", e.target.value)} />
          </Field>
          <Field label="Response deadline" required>
            <TextField type="date" value={form.responseDeadline ?? ""} onChange={(e) => set("responseDeadline", e.target.value)} />
          </Field>
          <Field label="Proposed change amount" required>
            <TextField value={form.proposedChangeAmount ?? ""} placeholder="$3,246" onChange={(e) => set("proposedChangeAmount", e.target.value)} />
          </Field>
          <Field label="Primary issue type" required>
            <select className="wf-input" value={form.primaryIssueType ?? ""} onChange={(e) => set("primaryIssueType", e.target.value as CP2000Data["primaryIssueType"])}>
              <option value="">Select…</option>
              <option value="unreported_income">Unreported income</option>
              <option value="unreported_deduction">Unreported deduction</option>
              <option value="math_error">Math error</option>
              <option value="identity_theft">Identity theft</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Filing status" required>
            <select className="wf-input" value={form.filingStatus ?? ""} onChange={(e) => set("filingStatus", e.target.value as CP2000Data["filingStatus"])}>
              <option value="">Select…</option>
              <option value="single">Single</option>
              <option value="married_joint">Married filing jointly</option>
              <option value="married_separate">Married filing separately</option>
              <option value="head_of_household">Head of household</option>
              <option value="widow">Qualifying widow(er)</option>
            </select>
          </Field>
          <Field label="Taxpayer name" required>
            <TextField value={form.taxpayerName ?? ""} onChange={(e) => set("taxpayerName", e.target.value)} />
          </Field>
          <Field label="Mailing address" required>
            <TextField value={form.mailingAddress ?? ""} placeholder="1234 Oak Ridge Drive, San Diego, CA 92130" onChange={(e) => set("mailingAddress", e.target.value)} />
          </Field>
          <Field label="Best contact email">
            <TextField type="email" value={form.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value)} />
          </Field>
          <Field label="Best contact phone">
            <TextField type="tel" value={form.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="What happened?" required hint={`${(form.whatHappened ?? "").length}/1000`}>
            <TextArea rows={3} maxLength={1000} value={form.whatHappened ?? ""} onChange={(e) => set("whatHappened", e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <Field label="What response are you seeking?" required hint={`${(form.whatResponseSought ?? "").length}/1000`}>
            <TextArea rows={2} maxLength={1000} value={form.whatResponseSought ?? ""} onChange={(e) => set("whatResponseSought", e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Fill required fields" }, { label: "Confirm notice details" }, { label: "Continue to Notice Details" }]}
        continueLabel="Continue to Notice Details"
        continueDisabled={!requiredFilled}
        onContinue={handleContinue}
      />
    </>
  );
}
