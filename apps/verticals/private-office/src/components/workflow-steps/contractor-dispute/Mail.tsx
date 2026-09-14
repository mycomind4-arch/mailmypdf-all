import { useState } from "react";
import { SectionCard, CheckboxField, StatusPill } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { ContractorDisputeIntake } from "@/domain/step-workflows/contractor-dispute";

const MAILING_CHECKLIST = [
  { label: "Recipient address verified", ready: true },
  { label: "Notice package complete", ready: true },
  { label: "Supporting exhibits included", ready: true },
  { label: "Certified mail selected", ready: true },
  { label: "Return receipt selected", ready: true },
];

export function MailStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as ContractorDisputeIntake;
  const [confirmed, setConfirmed] = useState({ address: false, mailing: false, record: false });
  const allConfirmed = confirmed.address && confirmed.mailing && confirmed.record;
  const isSent = matter.steps.mail?.status === "complete";

  if (isSent) {
    return (
      <SectionCard title="Your documents are ready." headerAside={<StatusPill tone="success" label="Workflow complete" />}>
        <p style={{ color: "var(--wf-color-stone)" }}>
          Your Contractor Dispute packet has been generated and is now in the mailing queue.
        </p>
        <div className="wf-card" style={{ background: "var(--wf-color-success-bg)", marginTop: "1rem" }}>
          Tracking will be available soon — you'll receive an email with tracking details once it ships.
        </div>
        <div style={{ marginTop: "1.25rem" }}>
          <div className="wf-card-eyebrow">What's next?</div>
          <ul style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>
            <li>Monitor for a response — track deadlines and any incoming correspondence in your matter timeline.</li>
            <li>If you don't receive a response, we can help you send a follow-up letter.</li>
            <li>If the issue isn't resolved, explore next steps like a lien notice or small claims support.</li>
          </ul>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Mailing and proof"
      description="Your notice package is finalized. Confirm recipient details, delivery method, and proof settings before sending."
      headerAside={<StatusPill tone="success" label="Ready to send" />}
      footer={
        <button type="button" className="wf-btn wf-btn--primary" disabled={!allConfirmed} onClick={onComplete}>
          Purchase postage and send →
        </button>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <div>
          <div className="wf-card-eyebrow">Recipient and delivery</div>
          <p style={{ fontSize: "0.9rem", margin: "0.25rem 0 0.75rem" }}>{intake.contractorName ?? "—"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
            <span>● Certified mail — USPS certified mail with proof of delivery</span>
            <span>☑ Return receipt — Add delivery confirmation to the mailing record</span>
            <span>☐ Signature confirmation (optional)</span>
          </div>
        </div>
        <div>
          <div className="wf-card-eyebrow">Postage and package summary</div>
          <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.25rem" }}>
            <span>Final notice — 2 pages</span>
            <span>Evidence summary — 1 page</span>
            <span>Exhibits — 8 attachments</span>
            <strong>Estimated total: $33.88</strong>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <CheckboxField label="I confirm the recipient address is correct" checked={confirmed.address} onChange={(v) => setConfirmed((c) => ({ ...c, address: v }))} />
        <CheckboxField label="I approve certified mailing with proof of delivery" checked={confirmed.mailing} onChange={(v) => setConfirmed((c) => ({ ...c, mailing: v }))} />
        <CheckboxField label="I understand a permanent mailing record will be created" checked={confirmed.record} onChange={(v) => setConfirmed((c) => ({ ...c, record: v }))} />
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <div className="wf-card-eyebrow">Mailing checklist</div>
        <ul style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {MAILING_CHECKLIST.map((item) => (
            <li key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
              <StatusPill tone={item.ready ? "success" : "warning"} label={item.ready ? "Ready" : "Needs confirmation"} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
