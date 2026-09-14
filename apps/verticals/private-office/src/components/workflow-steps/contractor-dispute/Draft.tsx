import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { ContractorDisputeIntake } from "@/domain/step-workflows/contractor-dispute";

const QUALITY_CHECKS = [
  { label: "Clear identification of parties and property", status: "Ready" as const },
  { label: "Issue-by-issue facts included", status: "Ready" as const },
  { label: "Supporting exhibits referenced", status: "Good" as const },
  { label: "Response deadline language", status: "Needs review" as const },
  { label: "Tone and professionalism", status: "Ready" as const },
];

const toneFor: Record<string, "success" | "info" | "warning"> = { Ready: "success", Good: "info", "Needs review": "warning" };

export function DraftStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as ContractorDisputeIntake;
  const today = new Date().toISOString().slice(0, 10);

  const letter = [
    today,
    "",
    `${intake.contractorName ?? "[Contractor]"}`,
    "",
    `Re: Notice of Contractor Dispute and Demand for Resolution`,
    "",
    "Dear Sir or Madam,",
    "",
    `I am writing regarding the construction work performed by ${intake.contractorName ?? "[Contractor]"} at ${intake.propertyAddress ?? "[property address]"}, pursuant to our written agreement dated ${intake.dateAgreementSigned ?? "[date]"}.`,
    "",
    "Background",
    `We entered into a contract on ${intake.dateAgreementSigned ?? "[date]"} for work at ${intake.propertyAddress ?? "[property address]"}. The agreement outlined the scope of work, timeline, and payment terms.`,
    "",
    "Issue Summary",
    intake.disputeSummary || "[Dispute summary from Intake will appear here.]",
    "",
    "Requested Resolution",
    intake.requestedResolution || "[Requested resolution from Intake will appear here.]",
    "",
    "We hope to resolve this matter promptly. Please contact me if you have any questions.",
    "",
    "Sincerely,",
  ].join("\n");

  return (
    <>
      <SectionCard
        title="Draft notice"
        description="We assembled your contractor dispute notice from your intake, evidence, and timeline. Review each section and make any needed edits."
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
              { label: "Recipient and subject", value: `To: ${intake.contractorName ?? "—"}\nSubject: Notice of Contractor Dispute and Demand for Resolution` },
              { label: "Project background", value: `Agreement signed ${intake.dateAgreementSigned ?? "—"} for work at ${intake.propertyAddress ?? "—"}.` },
              { label: "Issue summary", value: intake.disputeSummary || "—" },
              { label: "Requested resolution", value: intake.requestedResolution || "—" },
              { label: "Supporting exhibits", value: "Contract, invoices, photos, inspection notes, and correspondence (see Evidence)." },
              { label: "Response deadline", value: "Set on the Timeline step." },
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
        steps={[{ label: "Confirm draft structure" }, { label: "Refine remedy language" }, { label: "Review deadline wording" }]}
        continueLabel="Continue to Review"
        onContinue={onComplete}
      />
    </>
  );
}
