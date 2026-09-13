import { useState } from "react";
import { SectionCard, StatusPill, CheckboxField, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";

const REVIEW_ITEMS = [
  { label: "Recipient and subject", detail: "Response to Notice of Intent to Deny, addressed to USCIS", status: "Ready" as const },
  { label: "Denial grounds addressed", detail: "Each cited ground has a written response", status: "Ready" as const },
  { label: "Requested outcome", detail: "Approval of the petition as filed", status: "Ready" as const },
  { label: "Supporting exhibits", detail: "Documents attached and organized by ground", status: "Ready" as const },
  { label: "Timeline and dates", detail: "NOID issue date and response deadline confirmed", status: "Ready" as const },
  { label: "Mailing settings", detail: "Certified mail with proof of delivery", status: "Needs confirmation" as const },
];

export function ReviewStep({ onApprove, onComplete }: StepComponentProps) {
  const [checks, setChecks] = useState({ content: false, exhibits: false, mailing: false });
  const allChecked = checks.content && checks.exhibits && checks.mailing;

  async function handleApprove() {
    await onApprove();
    await onComplete();
  }

  return (
    <>
    <SectionCard
      title="Final review"
      description="This is your final opportunity to confirm the response, evidence packet, and mailing instructions before certified mailing to USCIS."
      headerAside={<span className="wf-pill wf-pill--warning">Approval required</span>}
      footer={
        <button type="button" className="wf-btn wf-btn--primary" disabled={!allChecked} onClick={handleApprove}>
          Approve for Mailing →
        </button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {REVIEW_ITEMS.map((item, index) => (
          <div key={item.label} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", borderTop: index > 0 ? "1px solid var(--wf-color-rule)" : undefined, paddingTop: index > 0 ? "0.75rem" : undefined }}>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <span className="wf-recommended-steps-number">{index + 1}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.label}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--wf-color-stone)" }}>{item.detail}</div>
              </div>
            </div>
            <StatusPill tone={item.status === "Ready" ? "success" : "warning"} label={item.status} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <CheckboxField label="I reviewed the response content" checked={checks.content} onChange={(value) => setChecks((c) => ({ ...c, content: value }))} />
        <CheckboxField label="I confirm the supporting exhibits are correct" checked={checks.exhibits} onChange={(value) => setChecks((c) => ({ ...c, exhibits: value }))} />
        <CheckboxField label="I approve mailing this response to USCIS before the deadline" checked={checks.mailing} onChange={(value) => setChecks((c) => ({ ...c, mailing: value }))} />
      </div>
    </SectionCard>
    <RecommendedStepsRow
      steps={[{ label: "Confirm content" }, { label: "Confirm exhibits" }, { label: "Confirm mailing settings" }]}
      continueLabel="Continue to Mail"
      continueDisabled={!allChecked}
      onContinue={handleApprove}
    />
    </>
  );
}
