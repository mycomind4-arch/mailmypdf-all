import { useState } from "react";
import { SectionCard, StatusPill, CheckboxField, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { getCombinedIntake, getSelectedNoticeOption } from "@/domain/step-workflows/tax-notice";

const PACKAGE_ITEMS = [
  { title: "Final response letter", meta: "1–2 pages", description: "Completed response letter addressed to the issuing tax authority." },
  { title: "Notice-specific forms", meta: "if applicable", description: "e.g. Form 12153 for a Collection Due Process hearing request." },
  { title: "Exhibits bundle", meta: "varies", description: "Copies of returns, statements, and any other supporting documents you uploaded." },
  { title: "Mailing proof sheet", meta: "1 page", description: "Coversheet with the agency address and certified mail details." },
];

export function ReviewStep({ matter, onApprove, onComplete }: StepComponentProps) {
  const data = getCombinedIntake(matter);
  const option = getSelectedNoticeOption(matter);
  const documentCount = ((matter.steps.documents?.data.files as unknown[]) ?? []).length;
  const [checks, setChecks] = useState({ content: false, deadline: false, mailing: false });
  const allChecked = checks.content && checks.deadline && checks.mailing;

  const reviewItems = [
    { label: "Taxpayer and agency mailing addresses", detail: data.taxpayerName && data.agencyAddress ? `${data.taxpayerName} → ${data.agencyName}` : "Missing — go back to Intake.", status: data.taxpayerName && data.agencyAddress ? "Ready" : "Needs confirmation" },
    { label: "Notice type and deadline", detail: option ? `${option.label}${data.responseDeadline ? ` — due ${data.responseDeadline}` : " — deadline not confirmed"}` : "Not identified — go back to Identify.", status: option && data.responseDeadline ? "Ready" : "Needs confirmation" },
    { label: "Response path", detail: data.responsePath ? "Selected in Strategy" : "Not selected — go back to Strategy.", status: data.responsePath ? "Ready" : "Needs confirmation" },
    { label: "Supporting exhibits", detail: `${documentCount} document${documentCount === 1 ? "" : "s"} attached`, status: documentCount > 0 ? "Ready" : "Needs confirmation" },
    { label: "Mailing settings", detail: "Certified mail with proof of delivery", status: "Needs confirmation" },
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
          <button type="button" className="wf-btn wf-btn--primary" disabled={!allChecked} onClick={handleApprove}>
            Approve for Mailing →
          </button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {reviewItems.map((item, index) => (
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
          <CheckboxField label="I reviewed the letter content, notice reference, and every fact" checked={checks.content} onChange={(value) => setChecks((c) => ({ ...c, content: value }))} />
          <CheckboxField label="I confirmed the response deadline against my actual notice" checked={checks.deadline} onChange={(value) => setChecks((c) => ({ ...c, deadline: value }))} />
          <CheckboxField label="I approve mailing once payment and postage are confirmed" checked={checks.mailing} onChange={(value) => setChecks((c) => ({ ...c, mailing: value }))} />
        </div>
      </SectionCard>

      <SectionCard title="Response package preview" description="Here's what will be included in your certified mailing package.">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {PACKAGE_ITEMS.map((item) => (
            <div key={item.title} className="wf-card" style={{ background: "var(--wf-color-paper-deep)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: "0.9rem" }}>
                <span>{item.title}</span>
                <StatusPill tone="success" label="Ready" />
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--wf-color-stone-light)", margin: "0.15rem 0 0.4rem" }}>{item.meta}</div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--wf-color-stone)" }}>{item.description}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Confirm content" }, { label: "Confirm deadline" }, { label: "Confirm mailing settings" }]}
        continueLabel="Continue to Mail"
        continueDisabled={!allChecked}
        onContinue={handleApprove}
      />
    </>
  );
}
