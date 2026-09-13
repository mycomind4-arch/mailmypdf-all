import { useEffect, useState } from "react";
import { SectionCard, CheckboxField, StatusPill, PagePreviewGrid } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { TAX_NOTICE_PRICING, getCombinedIntake } from "@/domain/step-workflows/tax-notice";
import { assembleMatterPacket, type AssembledMatterPacket } from "@/lib/tax-notice-packet";
// @ts-expect-error — bundler handles the ?url import
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MAILING_CHECKLIST = [
  { label: "Agency mailing address confirmed", ready: true },
  { label: "Response letter and exhibits complete", ready: true },
  { label: "Certified mail selected", ready: true },
  { label: "Return receipt selected", ready: true },
];

export function MailStep({ onComplete, matter, goToStep }: StepComponentProps) {
  const data = getCombinedIntake(matter);
  const [confirmed, setConfirmed] = useState({ address: false, mailing: false, record: false });
  const allConfirmed = confirmed.address && confirmed.mailing && confirmed.record;
  const isSent = matter.steps.mail?.status === "complete";

  // Pages the user removed in the preview, scoped per-source (the letter,
  // or a specific uploaded document) — passed straight to assembleMatterPacket,
  // which forwards them to @mailmypdf/packet-builder's assemblePacket.
  const [excludedResponsePages, setExcludedResponsePages] = useState<number[]>([]);
  const [excludedDocumentPages, setExcludedDocumentPages] = useState<Record<string, number[]>>({});
  const [packet, setPacket] = useState<AssembledMatterPacket | null>(null);
  const [packetError, setPacketError] = useState<string | null>(null);

  useEffect(() => {
    if (isSent) return;
    let cancelled = false;
    assembleMatterPacket(matter, { excludedResponsePages, excludedDocumentPages })
      .then((result) => {
        if (!cancelled) {
          setPacket(result);
          setPacketError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setPacketError(error instanceof Error ? error.message : "Unable to build the packet preview.");
      });
    return () => {
      cancelled = true;
    };
    // Only the matter's own data (documents/draft content) and the user's
    // page-removal choices should trigger a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matter, excludedResponsePages, excludedDocumentPages, isSent]);

  function handleDeletePage(pageIndex: number) {
    const owner = packet?.pageOwners[pageIndex];
    if (!owner) return;
    if (owner.kind === "response") {
      setExcludedResponsePages((current) => [...current, owner.pageWithinResponse]);
    } else {
      setExcludedDocumentPages((current) => ({
        ...current,
        [owner.documentId]: [...(current[owner.documentId] ?? []), owner.pageWithinDocument],
      }));
    }
  }

  const pricing = TAX_NOTICE_PRICING;
  const estimatedTotal = pricing.preparationFee + pricing.certifiedMail;

  if (isSent) {
    return (
      <SectionCard title="Your response is ready." headerAside={<StatusPill tone="success" label="Workflow complete" />}>
        <p style={{ color: "var(--wf-color-stone)" }}>Your tax notice response packet has been generated and is now in the mailing queue.</p>
        <div className="wf-card" style={{ background: "var(--wf-color-success-bg)", marginTop: "1rem" }}>
          Tracking will be available soon — you'll receive an email with tracking details once it ships.
        </div>
        <div style={{ marginTop: "1.25rem" }}>
          <div className="wf-card-eyebrow">What's next?</div>
          <ul style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>
            <li>Keep your certified mail receipt and tracking number — it's your proof of timely response if the deadline is ever disputed.</li>
            <li>Mark your calendar for any follow-up deadline mentioned in your notice (e.g. an investigation period, an appeals window, or a court filing deadline).</li>
            <li>If you don't hear back by the timeframe your notice describes, or the situation changes, you can start a follow-up response or consult a tax professional.</li>
          </ul>
        </div>
      </SectionCard>
    );
  }

  return (
    <>
    <SectionCard
      title="Mailing and proof"
      description="Your response is finalized. Confirm the recipient and delivery method before sending — certified mail documents the exact date the agency received your response, which matters if your deadline is ever questioned."
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
          <p style={{ fontSize: "0.9rem", margin: "0.25rem 0 0.75rem", whiteSpace: "pre-wrap" }}>{data.agencyName ?? "—"}{"\n"}{data.agencyAddress ?? "—"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
            <span>● Certified mail — USPS certified mail with proof of delivery</span>
            <span>☑ Return receipt — documents the date the agency received your response</span>
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
        <CheckboxField label="I confirm the agency mailing address is correct" checked={confirmed.address} onChange={(v) => setConfirmed((c) => ({ ...c, address: v }))} />
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

    <SectionCard
      title="Packet preview"
      description="Every page that will be mailed, in order. Remove a page you don't want enclosed, or add more documents — the packet rebuilds instantly."
    >
      {packetError && <p style={{ color: "var(--wf-color-error)", fontSize: "0.85rem" }}>{packetError}</p>}
      {!packetError && !packet && <p style={{ color: "var(--wf-color-stone)", fontSize: "0.85rem" }}>Building preview…</p>}
      {packet && (
        <PagePreviewGrid
          pdfBytes={packet.bytes}
          pageLabels={packet.pageLabels}
          onDeletePage={handleDeletePage}
          onAddDocuments={() => goToStep("documents")}
          workerSrc={pdfWorkerUrl}
        />
      )}
    </SectionCard>
    </>
  );
}
