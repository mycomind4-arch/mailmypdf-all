import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { NoidResponseIntake } from "@/domain/step-workflows/noid-response";
import { getFormProfile } from "@/domain/form-adapters";

const QUALITY_CHECKS = [
  { label: "Receipt number and form type identified", status: "Ready" as const },
  { label: "Each denial ground addressed", status: "Good" as const },
  { label: "Supporting exhibits referenced", status: "Good" as const },
  { label: "Response deadline honored", status: "Needs review" as const },
  { label: "Tone and professionalism", status: "Ready" as const },
];

const toneFor: Record<string, "success" | "info" | "warning"> = { Ready: "success", Good: "info", "Needs review": "warning" };

export function DraftStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as NoidResponseIntake;
  const profile = intake.formType ? getFormProfile(intake.formType) : undefined;
  const responses = (matter.steps.evidence?.data.responses as Record<string, string>) ?? {};
  const today = new Date().toISOString().slice(0, 10);

  const groundParagraphs = Object.entries(responses)
    .map(([ground, response], index) => `${index + 1}. ${ground}\n${response}`)
    .join("\n\n");

  const letter = [
    today,
    "",
    "U.S. Citizenship and Immigration Services",
    "",
    `Re: Response to Notice of Intent to Deny — ${intake.formType ?? "[Form]"}, Receipt No. ${intake.receiptNumber ?? "[Receipt Number]"}`,
    "",
    "To Whom It May Concern,",
    "",
    `This letter responds to the Notice of Intent to Deny (NOID) issued on ${intake.noidIssuedDate ?? "[date]"} regarding ${intake.applicantName ?? "the applicant"}'s ${profile?.formName ?? intake.formType ?? "petition"}.`,
    "",
    "Response to Denial Grounds",
    groundParagraphs || "[Ground-by-ground responses from Evidence will appear here.]",
    "",
    "Requested Outcome",
    intake.requestedOutcome || "[Requested outcome from Intake will appear here.]",
    "",
    `We respectfully request that USCIS approve this petition. Please contact us if any additional information is needed before the response deadline of ${intake.responseDeadline ?? "[deadline]"}.`,
    "",
    "Sincerely,",
  ].join("\n");

  return (
    <>
      <SectionCard
        title="Draft response"
        description="We assembled your NOID response from your intake, evidence, and timeline. Review each section and make any needed edits."
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
              { label: "Recipient and subject", value: `To: USCIS\nSubject: Response to NOID — ${intake.formType ?? "—"}, Receipt ${intake.receiptNumber ?? "—"}` },
              { label: "Denial grounds addressed", value: `${Object.keys(responses).length} ground(s) addressed (see Evidence).` },
              { label: "Requested outcome", value: intake.requestedOutcome || "—" },
              { label: "Response deadline", value: intake.responseDeadline || "—" },
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
        steps={[{ label: "Confirm each ground is addressed" }, { label: "Verify the deadline" }, { label: "Review tone" }]}
        continueLabel="Continue to Review"
        onContinue={onComplete}
      />
    </>
  );
}
