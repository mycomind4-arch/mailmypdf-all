import { useState } from "react";
import { SectionCard, CheckboxField, StatusPill } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { TRANSUNION_DISPUTE_PRICING } from "@/domain/step-workflows/transunion-dispute";

const MAILING_CHECKLIST = [
  { label: "TransUnion Consumer Dispute Center address confirmed", ready: true },
  { label: "Dispute letter and exhibits complete", ready: true },
  { label: "Certified mail selected", ready: true },
  { label: "Return receipt selected", ready: true },
];

export function MailStep({ onComplete, matter }: StepComponentProps) {
  const [confirmed, setConfirmed] = useState({ address: false, mailing: false, record: false });
  const allConfirmed = confirmed.address && confirmed.mailing && confirmed.record;
  const isSent = matter.steps.mail?.status === "complete";

  const pricing = TRANSUNION_DISPUTE_PRICING;
  const estimatedTotal = pricing.preparationFee + pricing.certifiedMail;

  if (isSent) {
    return (
      <SectionCard title="Your dispute letter is ready." headerAside={<StatusPill tone="success" label="Workflow complete" />}>
        <p style={{ color: "var(--wf-color-stone)" }}>Your TransUnion dispute packet has been generated and is now in the mailing queue.</p>
        <div className="wf-card" style={{ background: "var(--wf-color-success-bg)", marginTop: "1rem" }}>
          Tracking will be available soon — you'll receive an email with tracking details once it ships.
        </div>
        <div style={{ marginTop: "1.25rem" }}>
          <div className="wf-card-eyebrow">What's next?</div>
          <ul style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>
            <li>TransUnion has 30 days from receipt to investigate (45 if you send more information during that period) — mark your calendar.</li>
            <li>If any item is verified as accurate, you can request the method of verification within 15 days, or add a statement of dispute to your file.</li>
            <li>If TransUnion doesn't respond or the item stays wrong after investigation, you can escalate with a follow-up letter, a CFPB complaint, or a consumer law attorney.</li>
          </ul>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Mailing and proof"
      description="Your dispute letter is finalized. Confirm the recipient and delivery method before sending — certified mail starts the FCRA 30-day clock with proof of the date TransUnion received it."
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
          <p style={{ fontSize: "0.9rem", margin: "0.25rem 0 0.75rem" }}>TransUnion LLC — Consumer Dispute Center, P.O. Box 2000, Chester, PA 19016</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
            <span>● Certified mail — USPS certified mail with proof of delivery</span>
            <span>☑ Return receipt — starts and documents the FCRA investigation clock</span>
            <span>☐ Signature confirmation (optional)</span>
          </div>
        </div>
        <div>
          <div className="wf-card-eyebrow">Postage and package summary</div>
          <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.25rem" }}>
            <span>Preparation fee (includes {pricing.includedResponsePages} response pages) — ${pricing.preparationFee.toFixed(2)}</span>
            <span>Certified mail — ${pricing.certifiedMail.toFixed(2)}</span>
            <strong>Estimated total: ${estimatedTotal.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <CheckboxField label="I confirm the TransUnion mailing address is correct" checked={confirmed.address} onChange={(v) => setConfirmed((c) => ({ ...c, address: v }))} />
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
