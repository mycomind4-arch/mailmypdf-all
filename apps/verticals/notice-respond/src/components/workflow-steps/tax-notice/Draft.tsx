import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { generateTaxNoticeDraft, getCombinedIntake, getSelectedNoticeOption, RESPONSE_PATH_OPTIONS } from "@/domain/step-workflows/tax-notice";

export function DraftStep({ matter, onComplete }: StepComponentProps) {
  const data = getCombinedIntake(matter);
  const option = getSelectedNoticeOption(matter);
  const path = RESPONSE_PATH_OPTIONS.find((p) => p.value === data.responsePath);
  const letter = generateTaxNoticeDraft(matter);

  const qualityChecks = [
    { label: "Notice type and reference confirmed", ready: Boolean(option) },
    { label: "Deadline taken from the notice, not assumed", ready: Boolean(data.responseDeadline) },
    { label: "Taxpayer and agency mailing addresses included", ready: Boolean(data.taxpayerName && data.taxpayerAddress && data.agencyName && data.agencyAddress) },
    { label: "Facts describe only what you can support", ready: Boolean(data.issueDescription?.trim()) },
    { label: "Response path matches a right that applies to this notice type", ready: Boolean(path) },
    { label: "Tone stays factual — no legal conclusions asserted", ready: true },
  ];

  return (
    <>
      <SectionCard
        title="Draft response letter"
        description="We assembled this letter from your intake, notice identification, and chosen response path. Review every name, date, amount, and statement carefully — this is what gets mailed."
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
              { label: "Notice type", value: option?.label ?? "—" },
              { label: "Recipient", value: `${data.agencyName ?? "—"}\n${data.agencyAddress ?? "—"}` },
              { label: "Taxpayer", value: `${data.taxpayerName ?? "—"}\n${data.taxpayerAddress ?? "—"}` },
              { label: "Notice reference", value: [data.noticeNumber, data.noticeDate ? `dated ${data.noticeDate}` : null, data.taxYear ? `tax year ${data.taxYear}` : null].filter(Boolean).join(" · ") || "—" },
              { label: "Response deadline", value: data.responseDeadline || "Not confirmed — go back to Identify" },
              { label: "Response path", value: path ? `${path.label} — ${path.description}` : "—" },
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

      <SectionCard title="Draft quality check" description="We've reviewed your draft for the elements a tax authority response needs.">
        <DataTable
          columns={[
            { key: "label", label: "Check" },
            { key: "status", label: "Status" },
          ]}
          rows={qualityChecks.map((check) => ({
            label: check.label,
            status: <StatusPill tone={check.ready ? "success" : "warning"} label={check.ready ? "Ready" : "Needs attention"} />,
          }))}
        />
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Re-read every fact and figure" }, { label: "Confirm the deadline" }, { label: "Continue to Review" }]}
        continueLabel="Continue to Review"
        onContinue={onComplete}
      />
    </>
  );
}
