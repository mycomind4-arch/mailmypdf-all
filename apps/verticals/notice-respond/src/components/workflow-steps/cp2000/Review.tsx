import { useState } from "react";
import { SectionCard, CheckboxField, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { getCombinedCP2000Data, generateCP2000MatterDraft, validateCP2000MatterDraft } from "@/domain/step-workflows/cp2000";

export function ReviewStep({ matter, onApprove, onComplete }: StepComponentProps) {
  const data = getCombinedCP2000Data(matter);
  // Same fallback as Draft.tsx: if the user hasn't explicitly saved edits yet,
  // validate the generated draft rather than an empty string.
  const draftContent = (matter.steps.draft?.data.content as string | undefined) ?? generateCP2000MatterDraft(matter);
  const validation = validateCP2000MatterDraft(matter, draftContent);
  const [checks, setChecks] = useState({ content: false, deadline: false, mailing: false });
  const allChecked = checks.content && checks.deadline && checks.mailing;

  const reviewItems = [
    { label: "Taxpayer and IRS mailing addresses", detail: data.taxpayerName && data.irsResponseAddress ? `${data.taxpayerName} → IRS` : "Missing — go back to Intake/Notice Details.", ready: Boolean(data.taxpayerName && data.irsResponseAddress) },
    { label: "Notice number and deadline", detail: data.noticeNumber ? `${data.noticeNumber}${data.responseDeadline ? ` — due ${data.responseDeadline}` : ""}` : "Not confirmed — go back to Notice Details.", ready: Boolean(data.noticeNumber && data.responseDeadline) },
    { label: "Response position", detail: data.responsePosition ? "Selected" : "Not selected — go back to Response Position.", ready: Boolean(data.responsePosition) },
    { label: "Draft passes validation", detail: validation.blocked ? `Blocked (${validation.blocks})` : "Ready to send", ready: !validation.blocked },
  ] as const;

  async function handleApprove() {
    await onApprove();
    await onComplete();
  }

  return (
    <>
      <SectionCard
        title="Final review"
        description="This is your last chance to confirm the letter, exhibits, and mailing instructions before it's sent."
        headerAside={<span className="wf-pill wf-pill--warning">Approval required</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!allChecked || validation.blocked} onClick={handleApprove}>
            Approve for Mailing →
          </button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {reviewItems.map((item, index) => (
            <div key={item.label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", borderTop: index > 0 ? "1px solid var(--wf-color-rule)" : undefined, paddingTop: index > 0 ? "0.75rem" : undefined }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.label}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--wf-color-stone)" }}>{item.detail}</div>
              </div>
              <StatusPill tone={item.ready ? "success" : "warning"} label={item.ready ? "Ready" : "Needs confirmation"} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <CheckboxField label="I reviewed the letter content, notice reference, and every fact" checked={checks.content} onChange={(value) => setChecks((c) => ({ ...c, content: value }))} />
          <CheckboxField label="I confirmed the response deadline against my actual notice" checked={checks.deadline} onChange={(value) => setChecks((c) => ({ ...c, deadline: value }))} />
          <CheckboxField label="I approve mailing once payment and postage are confirmed" checked={checks.mailing} onChange={(value) => setChecks((c) => ({ ...c, mailing: value }))} />
        </div>
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Confirm content" }, { label: "Confirm deadline" }, { label: "Confirm mailing settings" }]}
        continueLabel="Continue to Mail"
        continueDisabled={!allChecked || validation.blocked}
        onContinue={handleApprove}
      />
    </>
  );
}
