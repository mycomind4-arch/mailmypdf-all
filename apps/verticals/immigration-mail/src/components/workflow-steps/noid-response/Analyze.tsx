import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { NoidResponseIntake } from "@/domain/step-workflows/noid-response";
import { getFormProfile } from "@/domain/form-adapters";

export function AnalyzeStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as NoidResponseIntake;
  const profile = intake.formType ? getFormProfile(intake.formType) : undefined;
  const documentCount = ((matter.steps.documents?.data.files as unknown[]) ?? []).length;

  const rows = [
    { key: "form", label: "Form type", value: intake.formType ? `${intake.formType} — ${profile?.formName ?? ""}` : "—" },
    { key: "receipt", label: "Receipt number", value: intake.receiptNumber ?? "—" },
    { key: "applicant", label: "Applicant", value: intake.applicantName ?? "—" },
    { key: "issued", label: "NOID issued", value: intake.noidIssuedDate ?? "—" },
    { key: "deadline", label: "Response deadline", value: intake.responseDeadline ?? "—" },
    { key: "outcome", label: "Requested outcome", value: intake.requestedOutcome ?? "—" },
  ];

  const grounds = profile?.commonNOIDGrounds ?? [];

  return (
    <>
      <SectionCard
        title="Case analysis"
        description="We identified the likely denial grounds based on your form type and intake. Review the summary below and correct anything that appears incomplete or inaccurate."
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
          <div className="wf-card-eyebrow">Denied grounds summary</div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--wf-color-stone)" }}>
            {intake.deniedGroundsSummary || "Complete Intake to generate a denied-grounds summary."}
          </p>
        </div>
      </SectionCard>

      {profile && (
        <SectionCard title={`Common ${profile.formType} NOID grounds`} description="These are the grounds USCIS most often cites for this form type — confirm which apply to your case.">
          <DataTable
            columns={[
              { key: "ground", label: "Ground" },
              { key: "status", label: "Status" },
            ]}
            rows={grounds.map((ground) => ({
              ground,
              status: <StatusPill tone="warning" label="Needs review" />,
            }))}
          />
        </SectionCard>
      )}

      <RecommendedStepsRow
        steps={[{ label: "Confirm analysis" }, { label: "Add any missing evidence" }, { label: "Build issue-by-issue response" }]}
        continueLabel="Continue to Evidence"
        onContinue={onComplete}
      />
    </>
  );
}
