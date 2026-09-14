import { useState } from "react";
import { SectionCard, StatusPill, DataTable, TextArea, Field, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { CarInsuranceAppealIntake } from "@/domain/step-workflows/car-insurance-appeal";

/**
 * Each "issue" here is a disputed fact or contradiction raised against the
 * insurer's denial — the appeal-mail analog of Administrative Decision
 * Appeal's per-issue evidence builder, tailored to the three disputes a car
 * insurance denial actually turns on: liability, damage/repair valuation,
 * and coverage/policy language.
 */
const ISSUES = [
  {
    id: "liability-dispute",
    title: "Issue 1 — Disputed liability determination",
    tone: "success" as const,
    badge: "Strong",
    summary: "The insurer's fault finding conflicts with the accident report, photos, or witness statements.",
    files: ["Denial_Letter.pdf", "Police_Report.pdf"],
    authority: "Supporting record: police report and any witness statements",
    factSummary: "The police report and available witness accounts support a different account of fault than the one the insurer assigned.",
    defaultResponse: "Request that the insurer reconsider the liability determination in light of the attached police report and witness statements.",
  },
  {
    id: "damage-valuation-gap",
    title: "Issue 2 — Damage assessment or repair estimate gap",
    tone: "info" as const,
    badge: "Good",
    summary: "The insurer's damage assessment or total-loss valuation does not match an independent repair estimate or appraisal.",
    files: ["Repair_Estimate.pdf", "Photos_of_Damage.pdf"],
    authority: "Supporting record: independent repair estimate or appraisal",
    factSummary: "The attached repair estimate documents a higher repair cost, or a lower total-loss valuation, than the amount the insurer used.",
    defaultResponse: "Ask the insurer to reconcile its valuation with the attached independent repair estimate and photos, or explain the discrepancy.",
  },
  {
    id: "coverage-dispute",
    title: "Issue 3 — Coverage or policy language dispute",
    tone: "warning" as const,
    badge: "Needs review",
    summary: "The cited exclusion, limitation, or coverage provision has not yet been independently verified against the policy declarations page.",
    files: ["Policy_Declarations.pdf"],
    authority: "Policy language not yet independently verified",
    factSummary: "The denial cites a specific policy provision or exclusion; confirm it matches the actual language in your declarations page and endorsements.",
    defaultResponse: "Confirm the cited policy provision applies as stated, and request a written explanation if it does not appear in the declarations page.",
  },
];

export function EvidenceStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as CarInsuranceAppealIntake;
  const savedResponses = (matter.steps.evidence?.data.responses as Record<string, string>) ?? {};
  const [responses, setResponses] = useState<Record<string, string>>(savedResponses);

  async function handleSave() {
    await onUpdateData({ responses });
    await onComplete();
  }

  const linkedCount = ISSUES.reduce((sum, issue) => sum + issue.files.length, 0);
  const keyDates = [
    { label: "Accident", value: intake.accidentDate },
    { label: "Denial letter", value: intake.decisionDate },
    { label: "Appeal deadline", value: intake.deadline },
  ];

  return (
    <>
      <SectionCard title="Key dates" description="A car insurance appeal only turns on a few dates — confirm these are right before you draft. There's no separate timeline to build.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {keyDates.map((item) => (
            <div key={item.label}>
              <div className="wf-card-eyebrow">{item.label}</div>
              <div style={{ fontSize: "0.9rem", marginTop: "0.15rem" }}>{item.value || "Not yet entered"}</div>
            </div>
          ))}
        </div>
        {!intake.deadline && (
          <p style={{ marginTop: "0.9rem", fontSize: "0.8rem", color: "var(--wf-color-warning, #b45309)" }}>
            No appeal deadline on file yet — add it in Intake once you find it on your denial letter, or ask your adjuster to confirm one in writing.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Evidence builder"
        description="Organize the appeal into clear disputed facts and evidence gaps. For each issue, attach supporting documents and the response you want reflected in the appeal."
        headerAside={<span className="wf-pill wf-pill--info">Structured record</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" onClick={handleSave}>
            Save evidence record →
          </button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {ISSUES.map((issue) => (
            <div key={issue.id} style={{ borderTop: "1px solid var(--wf-color-rule)", paddingTop: "1.1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <div style={{ fontWeight: 600 }}>{issue.title}</div>
                <StatusPill tone={issue.tone} label={issue.badge} />
              </div>
              <p style={{ margin: "0.35rem 0 0.2rem", fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>{issue.summary}</p>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", color: "var(--wf-color-stone-light)" }}>{issue.authority}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
                {issue.files.map((file) => (
                  <span key={file} className="wf-pill wf-pill--neutral">
                    {file}
                  </span>
                ))}
              </div>
              <div className="wf-card-eyebrow">Supporting fact summary</div>
              <p style={{ fontSize: "0.85rem", color: "var(--wf-color-stone)", marginTop: "0.25rem" }}>{issue.factSummary}</p>
              <div style={{ marginTop: "0.75rem" }}>
                <Field label="Requested response for this issue">
                  <TextArea
                    rows={2}
                    value={responses[issue.id] ?? issue.defaultResponse}
                    onChange={(e) => setResponses((current) => ({ ...current, [issue.id]: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--wf-color-stone-light)" }}>
          {ISSUES.length} issues organized · {linkedCount} evidence items linked
        </p>
      </SectionCard>

      <SectionCard title="Evidence map" description="This record will help draft a clear, fact-based appeal.">
        <DataTable
          columns={[
            { key: "issue", label: "Issue" },
            { key: "documents", label: "Documents" },
            { key: "status", label: "Status" },
            { key: "notes", label: "Notes" },
          ]}
          rows={ISSUES.map((issue) => ({
            issue: issue.title.replace(/^Issue \d — /, ""),
            documents: `${issue.files.length} linked`,
            status: <StatusPill tone={issue.tone === "warning" ? "warning" : "success"} label={issue.tone === "warning" ? "Needs review" : "Ready"} />,
            notes: issue.summary,
          }))}
        />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Confirm key dates" }, { label: "Finish issue summaries" }, { label: "Link any missing files" }, { label: "Mark strongest exhibits" }]}
        continueLabel="Continue to Draft"
        onContinue={handleSave}
      />
    </>
  );
}
