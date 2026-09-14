import { useState } from "react";
import { SectionCard, StatusPill, CheckboxField, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";

const REVIEW_ITEMS = [
  { label: "Recipient and subject", detail: "Notice of Contractor Dispute and Demand for Resolution", status: "Ready" as const },
  { label: "Facts and issue summary", detail: "Incomplete work, waterproofing defects, and workmanship issues", status: "Ready" as const },
  { label: "Requested resolution", detail: "Completion of work or refund/remediation costs for identified defects", status: "Ready" as const },
  { label: "Supporting exhibits", detail: "8 documents attached, including contract, photos, correspondence, and invoices", status: "Ready" as const },
  { label: "Timeline and dates", detail: "Agreement date, discovery date, response deadline", status: "Ready" as const },
  { label: "Mailing settings", detail: "Certified mail with proof of delivery", status: "Needs confirmation" as const },
];

const PACKAGE_ITEMS = [
  { title: "Final notice", meta: "1–2 pages", description: "Completed contractor dispute notice with all details, requests, and deadlines." },
  { title: "Evidence summary", meta: "1 page", description: "Summary of key facts, issues, and evidence included in the package." },
  { title: "Exhibits bundle", meta: "8 attachments", description: "Contract, photos, correspondence, invoices, and supporting documents." },
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
        description="This is your final opportunity to confirm the notice, evidence packet, and mailing instructions before certified mailing."
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
          <CheckboxField label="I reviewed the notice content" checked={checks.content} onChange={(value) => setChecks((c) => ({ ...c, content: value }))} />
          <CheckboxField label="I confirm the supporting exhibits are correct" checked={checks.exhibits} onChange={(value) => setChecks((c) => ({ ...c, exhibits: value }))} />
          <CheckboxField label="I approve mailing once payment and postage are confirmed" checked={checks.mailing} onChange={(value) => setChecks((c) => ({ ...c, mailing: value }))} />
        </div>
      </SectionCard>

      <SectionCard title="Notice package preview" description="Here's what will be included in your certified mailing package.">
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
