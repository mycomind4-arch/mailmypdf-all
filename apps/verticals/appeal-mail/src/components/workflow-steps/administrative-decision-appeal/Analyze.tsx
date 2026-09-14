import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { AdministrativeDecisionAppealIntake } from "@/domain/step-workflows/administrative-decision-appeal";

/**
 * Illustrative findings/gaps — same static-analysis presentation pattern as
 * Contractor Dispute's and NOID Response's Analyze step. Field names mirror
 * the real `findings` / `citedAuthority` / `evidenceGaps` / `contradictions`
 * JSON keys already produced by
 * `/api/workflows/administrative-decision-appeal/analyze.ts`, so wiring that
 * endpoint's real output into this table later is a drop-in swap.
 */
const KEY_FINDINGS = [
  { label: "Decision notice identified and issuer confirmed", detail: "The uploaded decision states who issued it, the reference number, and the decision date.", tone: "success" as const, badge: "Strong" },
  { label: "Stated grounds for the decision located", detail: "The decision-maker's stated reasons and cited findings were identified in the notice.", tone: "success" as const, badge: "Strong" },
  { label: "Cited authority extracted", detail: "Statutes, regulations, or agency rules referenced in the decision were identified for verification.", tone: "info" as const, badge: "Good" },
  { label: "Appeal instructions present", detail: "The notice describes a process for challenging the decision, though the deadline should be verified.", tone: "info" as const, badge: "Good" },
  { label: "Correspondence shows prior contact with the decision-maker", detail: "Uploaded correspondence shows attempts to clarify or contest the decision before this appeal.", tone: "warning" as const, badge: "Needs review" },
];

const POTENTIAL_GAPS = [
  { label: "Deadline computation not independently verified", detail: "The number of days to appeal, how they're counted (calendar vs. business days), and the exact date they start running from have not yet been confirmed against current authoritative sources — deadlines this short are usually the single biggest risk in an administrative appeal.", tone: "warning" as const, badge: "Needs review" },
  { label: "Exhaustion of administrative remedies unclear", detail: "It is not yet confirmed whether every required lower-level review or internal appeal step was completed before this filing. Skipping a required step can get the appeal dismissed regardless of its merits.", tone: "warning" as const, badge: "Needs review" },
  { label: "No independent authority citation uploaded", detail: "Verifying the cited statute or regulation against an official source could strengthen your appeal.", tone: "info" as const, badge: "Recommended" },
  { label: "Contradiction between notice and correspondence", detail: "One or more dates or facts in your correspondence may not match the decision notice — review before drafting.", tone: "info" as const, badge: "Recommended" },
];

export function AnalyzeStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as AdministrativeDecisionAppealIntake;
  const documentCount = ((matter.steps.documents?.data.files as unknown[]) ?? []).length;

  const rows = [
    { key: "issuer", label: "Decision-maker", value: intake.issuer ?? "—" },
    { key: "jurisdiction", label: "Jurisdiction", value: intake.jurisdiction ?? "—" },
    { key: "reference", label: "Reference number", value: intake.referenceNumber ?? "—" },
    { key: "matterType", label: "Matter type", value: intake.matterType ?? "—" },
    { key: "decisionDate", label: "Decision date", value: intake.decisionDate ?? "—" },
    { key: "deadline", label: "Appeal deadline", value: intake.deadline ?? "—" },
    { key: "outcome", label: "Requested outcome", value: intake.requestedOutcome ?? "—" },
  ];

  return (
    <>
      <SectionCard
        title="Matter analysis"
        description="We extracted the main decision facts from your intake and supporting documents. Review the summary below and correct anything that appears incomplete or inaccurate."
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
          <div className="wf-card-eyebrow">Decision summary</div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--wf-color-stone)" }}>
            {intake.decisionSummary || "Complete Intake to generate a decision summary."}
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
        steps={[{ label: "Confirm analysis" }, { label: "Add any missing evidence" }, { label: "Build issue-by-issue evidence summary" }, { label: "Review timeline of events" }]}
        continueLabel="Continue to Evidence"
        onContinue={onComplete}
      />
    </>
  );
}
