import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { CarInsuranceAppealIntake } from "@/domain/step-workflows/car-insurance-appeal";
import { LIABILITY_DETERMINATION_LABELS } from "./Intake";

/**
 * Illustrative findings/gaps — same static-analysis presentation pattern as
 * Administrative Decision Appeal's Analyze step. Field names mirror the real
 * `claimNumber` / `policyNumber` / `liabilityFinding` / `liabilityPercentage`
 * / `damageFinding` / `repairEstimateAmount` / `policeReportNumber` JSON keys
 * already produced by
 * `/api/workflows/car-insurance-appeal/analyze.ts`, so wiring that endpoint's
 * real output into this table later is a drop-in swap.
 */
const KEY_FINDINGS = [
  { label: "Claim number and insurer confirmed", detail: "The denial letter states the claim number, policy number, and the insurer's claims department.", tone: "success" as const, badge: "Strong" },
  { label: "Stated denial reason located", detail: "The insurer's exact stated reason for denying or reducing the claim was identified in the letter.", tone: "success" as const, badge: "Strong" },
  { label: "Liability determination extracted", detail: "The insurer's fault finding — full fault, comparative negligence split, or undetermined — was identified for review.", tone: "info" as const, badge: "Good" },
  { label: "Damage and repair figures identified", detail: "The damage description and any repair estimate or total-loss valuation referenced in the file were located.", tone: "info" as const, badge: "Good" },
  { label: "Adjuster correspondence shows prior contact", detail: "Uploaded correspondence with the adjuster shows attempts to clarify or contest the finding before this appeal.", tone: "warning" as const, badge: "Needs review" },
];

const POTENTIAL_GAPS = [
  { label: "Police report not yet uploaded", detail: "A police report can corroborate the accident facts and liability determination — upload it if one was filed.", tone: "warning" as const, badge: "Needs review" },
  { label: "Independent repair estimate not on file", detail: "A second repair estimate or appraisal could strengthen a dispute over the insurer's damage valuation.", tone: "info" as const, badge: "Recommended" },
  { label: "Policy declarations page not confirmed", detail: "Verifying the exact coverage and exclusion language in your declarations page could strengthen your appeal.", tone: "info" as const, badge: "Recommended" },
  { label: "Comparative-negligence percentage not verified", detail: "If the insurer assigned you a percentage of fault, confirm it against the accident report and any witness statements.", tone: "neutral" as const, badge: "Consider" },
];

export function AnalyzeStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as CarInsuranceAppealIntake;
  const documentCount = ((matter.steps.documents?.data.files as unknown[]) ?? []).length;

  const rows = [
    { key: "insurer", label: "Insurer", value: intake.insurer ?? "—" },
    { key: "claimNumber", label: "Claim number", value: intake.claimNumber ?? "—" },
    { key: "policyNumber", label: "Policy number", value: intake.policyNumber ?? "—" },
    { key: "adjuster", label: "Adjuster", value: intake.adjusterName ?? "—" },
    { key: "accidentDate", label: "Accident date", value: intake.accidentDate ?? "—" },
    { key: "decisionDate", label: "Denial date", value: intake.decisionDate ?? "—" },
    { key: "deadline", label: "Appeal deadline", value: intake.deadline ?? "—" },
    {
      key: "liability",
      label: "Liability determination",
      value: intake.liabilityDetermination ? (LIABILITY_DETERMINATION_LABELS[intake.liabilityDetermination] ?? intake.liabilityDetermination) : "—",
    },
    { key: "repairEstimate", label: "Repair estimate amount", value: intake.repairEstimateAmount ?? "—" },
    { key: "policeReport", label: "Police report number", value: intake.policeReportNumber ?? "—" },
  ];

  return (
    <>
      <SectionCard
        title="Matter analysis"
        description="We extracted the main claim facts from your intake and supporting documents. Review the summary below and correct anything that appears incomplete or inaccurate."
        headerAside={<span className="wf-pill wf-pill--info">AI-assisted review</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" onClick={onComplete}>
            Confirm analysis →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {rows.map((row) => (
            <div key={row.key}>
              <div className="wf-card-eyebrow" style={{ marginBottom: "0.15rem" }}>
                {row.label}
              </div>
              <div style={{ fontSize: "0.9rem" }}>{row.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1.25rem" }}>
          <div className="wf-card-eyebrow">Denial reason</div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--wf-color-stone)" }}>
            {intake.denialReason || "Complete Intake to generate a denial-reason summary."}
          </p>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <div className="wf-card-eyebrow">Damage description</div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--wf-color-stone)" }}>
            {intake.damageDescription || "Complete Intake to generate a damage summary."}
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Key findings from documents" description={`We analyzed ${documentCount} uploaded documents and found the following key information.`}>
        <DataTable
          columns={[
            { key: "label", label: "Finding" },
            { key: "status", label: "Status" },
          ]}
          rows={KEY_FINDINGS.map((finding) => ({
            label: (
              <div>
                <div style={{ fontWeight: 600 }}>{finding.label}</div>
                <div style={{ color: "var(--wf-color-stone)", fontSize: "0.8rem" }}>{finding.detail}</div>
              </div>
            ),
            status: <StatusPill tone={finding.tone} label={finding.badge} />,
          }))}
        />
      </SectionCard>

      <SectionCard title="Potential gaps or risks" description="Consider addressing the following items to strengthen your appeal.">
        <DataTable
          columns={[
            { key: "label", label: "Item" },
            { key: "status", label: "Status" },
          ]}
          rows={POTENTIAL_GAPS.map((gap) => ({
            label: (
              <div>
                <div style={{ fontWeight: 600 }}>{gap.label}</div>
                <div style={{ color: "var(--wf-color-stone)", fontSize: "0.8rem" }}>{gap.detail}</div>
              </div>
            ),
            status: <StatusPill tone={gap.tone} label={gap.badge} />,
          }))}
        />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Confirm analysis" }, { label: "Add any missing evidence" }, { label: "Build issue-by-issue evidence summary" }]}
        continueLabel="Continue to Evidence"
        onContinue={onComplete}
      />
    </>
  );
}
