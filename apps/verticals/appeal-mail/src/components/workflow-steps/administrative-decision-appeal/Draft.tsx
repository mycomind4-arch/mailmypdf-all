import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "@mailmypdf/workflow-ui";
import type { AdministrativeDecisionAppealIntake } from "@/domain/step-workflows/administrative-decision-appeal";
import { ISSUES } from "./Evidence";

const QUALITY_CHECKS = [
  { label: "Decision-maker and jurisdiction identified", status: "Ready" as const },
  { label: "Disputed facts and evidence gaps addressed", status: "Ready" as const },
  { label: "Cited authority referenced", status: "Good" as const },
  { label: "Appeal deadline language", status: "Needs review" as const },
  { label: "Tone and professionalism", status: "Ready" as const },
];

const toneFor: Record<string, "success" | "info" | "warning"> = { Ready: "success", Good: "info", "Needs review": "warning" };

export function DraftStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as AdministrativeDecisionAppealIntake;
  const evidenceResponses = (matter.steps.evidence?.data.responses as Record<string, string>) ?? {};
  const today = new Date().toISOString().slice(0, 10);

  const specificPoints = ISSUES.map(
    (issue, i) => `${i + 1}. ${issue.title.replace(/^Issue \d — /, "")}: ${evidenceResponses[issue.id]?.trim() || issue.defaultResponse}`,
  ).join("\n");

  const letter = [
    today,
    "",
    `${intake.issuer ?? "[Decision-maker]"}`,
    "",
    `Re: Appeal of Administrative Decision${intake.referenceNumber ? ` — Reference ${intake.referenceNumber}` : ""}`,
    "",
    "Dear Sir or Madam,",
    "",
    `I am writing to appeal the decision issued on ${intake.decisionDate ?? "[decision date]"} by ${intake.issuer ?? "[decision-maker]"} in ${intake.jurisdiction ?? "[jurisdiction]"}.`,
    "",
    "Background",
    `This decision (${intake.matterType || "the matter described above"}) was issued on ${intake.decisionDate ?? "[date]"}${intake.deadline ? `, with a response deadline of ${intake.deadline}` : ""}.`,
    "",
    "Decision Summary",
    intake.decisionSummary || "[Decision summary from Intake will appear here.]",
    "",
    "Specific Points of Appeal",
    specificPoints,
    "",
    "Requested Outcome",
    intake.requestedOutcome || "[Requested outcome from Intake will appear here.]",
    "",
    "I appreciate your prompt reconsideration of this matter. Please contact me if you have any questions.",
    "",
    "Sincerely,",
  ].join("\n");

  return (
    <>
      <SectionCard
        title="Draft appeal"
        description="We assembled your administrative decision appeal from your intake, evidence, and timeline. Review each section and make any needed edits."
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
              { label: "Recipient and subject", value: `To: ${intake.issuer ?? "—"}\nSubject: Appeal of Administrative Decision${intake.referenceNumber ? ` — Reference ${intake.referenceNumber}` : ""}` },
              { label: "Decision background", value: `Decision issued ${intake.decisionDate ?? "—"} by ${intake.issuer ?? "—"} in ${intake.jurisdiction ?? "—"}.` },
              { label: "Decision summary", value: intake.decisionSummary || "—" },
              { label: "Specific points of appeal", value: specificPoints },
              { label: "Requested outcome", value: intake.requestedOutcome || "—" },
              { label: "Supporting exhibits", value: "Decision notice, correspondence, cited authority, and supporting records (see Evidence)." },
              { label: "Appeal deadline", value: intake.deadline || "Set on the Timeline step." },
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
