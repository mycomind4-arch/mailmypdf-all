import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { CarInsuranceAppealIntake } from "@/domain/step-workflows/car-insurance-appeal";
import { LIABILITY_DETERMINATION_LABELS } from "./Intake";

const QUALITY_CHECKS = [
  { label: "Insurer, claim number, and policy number identified", status: "Ready" as const },
  { label: "Liability and damage disputes addressed", status: "Ready" as const },
  { label: "Repair estimate or total-loss valuation referenced", status: "Good" as const },
  { label: "Appeal deadline language", status: "Needs review" as const },
  { label: "Tone and professionalism", status: "Ready" as const },
];

const toneFor: Record<string, "success" | "info" | "warning"> = { Ready: "success", Good: "info", "Needs review": "warning" };

export function DraftStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as CarInsuranceAppealIntake;
  const today = new Date().toISOString().slice(0, 10);
  const liabilityLabel = intake.liabilityDetermination ? (LIABILITY_DETERMINATION_LABELS[intake.liabilityDetermination] ?? intake.liabilityDetermination) : undefined;

  const letter = [
    today,
    "",
    `${intake.insurer ?? "[Insurer]"} — Claims Department`,
    "",
    `Re: Appeal of Claim Denial${intake.claimNumber ? ` — Claim ${intake.claimNumber}` : ""}${intake.policyNumber ? ` / Policy ${intake.policyNumber}` : ""}`,
    "",
    "Dear Claims Department,",
    "",
    `I am writing to appeal the decision on my auto insurance claim${intake.decisionDate ? ` issued on ${intake.decisionDate}` : ""}${intake.adjusterName ? `, handled by adjuster ${intake.adjusterName}` : ""}, regarding the accident on ${intake.accidentDate ?? "[accident date]"}.`,
    "",
    "The Insurer's Stated Reason",
    intake.denialReason || "[Denial reason from Intake will appear here.]",
    liabilityLabel ? `Stated liability determination: ${liabilityLabel}.` : "",
    "",
    "Why This Determination Should Be Reconsidered",
    intake.damageDescription || "[Damage description from Intake will appear here.]",
    intake.repairEstimateAmount ? `My own repair estimate documents a cost of ${intake.repairEstimateAmount}, attached to this appeal.` : "",
    "The enclosed police report, photographs, and any witness statements or footage on file support a different account of the facts than the one used to reach this determination, and I ask that they be weighed directly against it.",
    "",
    "Requested Outcome",
    intake.requestedOutcome || "[Requested outcome from Intake will appear here.]",
    "",
    "I have enclosed supporting documentation with this letter and am available to provide any additional information you need. I appreciate your prompt reconsideration of this claim.",
    "",
    "Sincerely,",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return (
    <>
      <SectionCard
        title="Draft appeal"
        description="We assembled your car insurance appeal from your intake and evidence. Review each section and make any needed edits."
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
              { label: "Recipient and subject", value: `To: ${intake.insurer ?? "—"} — Claims Department\nSubject: Appeal of Claim Denial${intake.claimNumber ? ` — Claim ${intake.claimNumber}` : ""}` },
              { label: "Accident and claim background", value: `Accident on ${intake.accidentDate ?? "—"}; claim ${intake.claimNumber ?? "—"} denied ${intake.decisionDate ?? "—"} by ${intake.insurer ?? "—"}.` },
              { label: "Denial reason and disputed facts", value: intake.denialReason || "—" },
              { label: "Liability determination", value: liabilityLabel || "—" },
              { label: "Damage description and repair estimate", value: [intake.damageDescription, intake.repairEstimateAmount].filter(Boolean).join(" — ") || "—" },
              { label: "Requested outcome", value: intake.requestedOutcome || "—" },
              { label: "Supporting exhibits", value: "Denial letter, police report, repair estimate, photos, and policy declarations (see Evidence)." },
              { label: "Appeal deadline", value: intake.deadline || "Not yet entered — add it in Intake." },
            ].map((item) => (
              <div key={item.label}>
                <div className="wf-card-eyebrow">{item.label}</div>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--wf-color-stone)", whiteSpace: "pre-wrap" }}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="wf-card" style={{ background: "var(--wf-color-paper-deep)" }}>
            <div className="wf-card-eyebrow">Letter preview</div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>{letter}</pre>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Draft quality check" description="We've reviewed your draft for key elements. Address any items that need attention.">
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
        steps={[{ label: "Confirm draft structure" }, { label: "Refine requested outcome language" }, { label: "Review deadline wording" }]}
        continueLabel="Continue to Review"
        onContinue={onComplete}
      />
    </>
  );
}
