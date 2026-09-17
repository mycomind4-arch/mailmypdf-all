import { useState } from "react";
import { SectionCard, StatusPill, CheckboxField, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";

/**
 * Mirrors the fields the real independent validator
 * (`/api/workflows/car-insurance-appeal/draft.ts` and
 * `src/domain/draft-validator.ts`) checks for — unsupported claims,
 * missing evidence, contradictions, and deadline problems — so a future
 * wiring of that validator's real output maps directly onto this checklist.
 */
const REVIEW_ITEMS = [
  { label: "Recipient and subject", detail: "Appeal of Claim Denial, addressed to the insurer's claims department", status: "Ready" as const },
  { label: "Liability and damage disputes", detail: "Disputed liability determination, damage/repair valuation, and coverage disputes are addressed", status: "Ready" as const },
  { label: "Policy language cited", detail: "Coverage provisions or exclusions referenced are consistent with the denial letter", status: "Ready" as const },
  { label: "Supporting exhibits", detail: "6 documents attached, including the denial letter, police report, and repair estimate", status: "Ready" as const },
  { label: "Key dates confirmed", detail: "Accident date, denial date, and appeal deadline", status: "Ready" as const },
  { label: "Mailing settings", detail: "Certified mail with proof of delivery", status: "Needs confirmation" as const },
];

const PACKAGE_ITEMS = [
  { title: "Final appeal", meta: "1–2 pages", description: "Completed car insurance appeal with claim details, disputes, and requested outcome." },
  { title: "Evidence summary", meta: "1 page", description: "Summary of liability, damage, and coverage disputes included in the package." },
  { title: "Exhibits bundle", meta: "6 attachments", description: "Denial letter, police report, repair estimate, photos, and policy declarations." },
  { title: "Mailing proof sheet", meta: "1 page", description: "Coversheet with recipient address and certified mail details." },
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
        description="This is your final opportunity to confirm the appeal, evidence packet, and mailing instructions before certified mailing."
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
          <CheckboxField label="I reviewed the appeal content" checked={checks.content} onChange={(value) => setChecks((c) => ({ ...c, content: value }))} />
          <CheckboxField label="I confirm the supporting exhibits are correct" checked={checks.exhibits} onChange={(value) => setChecks((c) => ({ ...c, exhibits: value }))} />
          <CheckboxField label="I approve mailing once payment and postage are confirmed" checked={checks.mailing} onChange={(value) => setChecks((c) => ({ ...c, mailing: value }))} />
        </div>
      </SectionCard>

      <SectionCard title="Appeal package preview" description="Here's what will be included in your certified mailing package.">
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
