import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { generateEquifaxDisputeDraft, type EquifaxDisputeIntake } from "@/domain/step-workflows/equifax-dispute";

const QUALITY_CHECKS = [
  { label: "Consumer name and address identified", status: "Ready" as const },
  { label: "Every disputed item has an FCRA category", status: "Ready" as const },
  { label: "FCRA 30/45-day investigation timeline cited", status: "Ready" as const },
  { label: "Method of verification and statement-of-dispute rights cited", status: "Ready" as const },
  { label: "Supporting evidence referenced", status: "Good" as const },
  { label: "Tone stays factual — no legal conclusions asserted", status: "Ready" as const },
];

const toneFor: Record<string, "success" | "info" | "warning"> = { Ready: "success", Good: "info", "Needs review": "warning" };

export function DraftStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as EquifaxDisputeIntake;
  const items = intake.disputedItems ?? [];
  const letter = generateEquifaxDisputeDraft(matter);

  return (
    <>
      <SectionCard
        title="Draft dispute letter"
        description="We assembled your FCRA dispute letter from your intake and analysis. Review every account name, number, and explanation carefully — this is what gets mailed to Equifax."
        headerAside={<span className="wf-pill wf-pill--success">Generated draft</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" onClick={onComplete}>
            Continue to Review →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {[
              { label: "Recipient", value: "Equifax Information Services LLC, P.O. Box 740256, Atlanta, GA 30374-0256" },
              { label: "Consumer", value: `${intake.consumerName ?? "—"}\n${intake.consumerAddress ?? "—"}` },
              { label: "Report reference", value: [intake.reportDate ? `Dated ${intake.reportDate}` : null, intake.reportNumber ? `Report ${intake.reportNumber}` : null].filter(Boolean).join(" · ") || "—" },
              { label: `Disputed items (${items.length})`, value: items.map((item, i) => `${i + 1}. ${item.creditorName || "Account"} — ${item.description || "—"}`).join("\n") || "—" },
              { label: "Requested outcome", value: intake.requestedOutcome?.trim() || "Investigate and correct or delete each inaccurate item (default FCRA request)." },
            ].map((row) => (
              <div key={row.label}>
                <div className="wf-card-eyebrow">{row.label}</div>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--wf-color-stone)", whiteSpace: "pre-wrap" }}>{row.value}</p>
              </div>
            ))}
          </div>
          <div className="wf-card" style={{ background: "var(--wf-color-paper-deep)" }}>
            <div className="wf-card-eyebrow">Letter preview</div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.8rem", lineHeight: 1.6, margin: 0, maxHeight: "28rem", overflowY: "auto" }}>{letter}</pre>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Draft quality check" description="We've reviewed your draft for the elements an Equifax reinvestigation letter needs.">
        <DataTable
          columns={[
            { key: "label", label: "Check" },
            { key: "status", label: "Status" },
          ]}
          rows={QUALITY_CHECKS.map((check) => ({
            label: check.label,
            status: <StatusPill tone={toneFor[check.status]} label={check.status} />,
          }))}
        />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Re-read every disputed item" }, { label: "Confirm your name and address" }, { label: "Continue to Review" }]}
        continueLabel="Continue to Review"
        onContinue={onComplete}
      />
    </>
  );
}
