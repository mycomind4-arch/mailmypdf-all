import { useState } from "react";
import { SectionCard, StatusPill, CheckboxField, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { ExperianDisputeIntake } from "@/domain/step-workflows/experian-dispute";

const PACKAGE_ITEMS = [
  { title: "Final dispute letter", meta: "1–2 pages", description: "Completed FCRA dispute letter addressed to Experian's National Consumer Assistance Center." },
  { title: "Itemized disputed accounts", meta: "1 page", description: "Every disputed item with its FCRA category and explanation." },
  { title: "Exhibits bundle", meta: "varies", description: "Proof of identity, statements, and any other supporting documents you uploaded." },
  { title: "Mailing proof sheet", meta: "1 page", description: "Coversheet with the Experian address and certified mail details." },
];

export function ReviewStep({ matter, onApprove, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as ExperianDisputeIntake;
  const items = intake.disputedItems ?? [];
  const documentCount = ((matter.steps.documents?.data.files as unknown[]) ?? []).length;
  const [checks, setChecks] = useState({ content: false, exhibits: false, mailing: false });
  const allChecked = checks.content && checks.exhibits && checks.mailing;

  const reviewItems = [
    { label: "Consumer name and address", detail: intake.consumerName && intake.consumerAddress ? `${intake.consumerName} — ${intake.consumerAddress}` : "Missing — go back to Intake.", status: intake.consumerName && intake.consumerAddress ? "Ready" : "Needs confirmation" },
    { label: "Disputed items", detail: `${items.length} item${items.length === 1 ? "" : "s"} with an FCRA category and explanation`, status: items.length > 0 ? "Ready" : "Needs confirmation" },
    { label: "Supporting exhibits", detail: `${documentCount} document${documentCount === 1 ? "" : "s"} attached`, status: documentCount > 0 ? "Ready" : "Needs confirmation" },
    { label: "FCRA rights and timeline", detail: "30/45-day investigation, method of verification, and statement-of-dispute rights", status: "Ready" },
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
        description="This is your last chance to confirm the letter, exhibits, and mailing instructions before it's sent to Experian."
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
          <CheckboxField label="I reviewed the letter content and every disputed item" checked={checks.content} onChange={(value) => setChecks((c) => ({ ...c, content: value }))} />
          <CheckboxField label="I confirm the supporting exhibits are correct" checked={checks.exhibits} onChange={(value) => setChecks((c) => ({ ...c, exhibits: value }))} />
          <CheckboxField label="I approve mailing once payment and postage are confirmed" checked={checks.mailing} onChange={(value) => setChecks((c) => ({ ...c, mailing: value }))} />
        </div>
      </SectionCard>

      <SectionCard title="Dispute package preview" description="Here's what will be included in your certified mailing package.">
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
        steps={[{ label: "Confirm content" }, { label: "Confirm exhibits" }, { label: "Confirm mailing settings" }]}
        continueLabel="Continue to Mail"
        continueDisabled={!allChecked}
        onContinue={handleApprove}
      />
    </>
  );
}
