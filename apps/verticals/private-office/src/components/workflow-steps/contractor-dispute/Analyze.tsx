import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import type { ContractorDisputeIntake } from "@/domain/step-workflows/contractor-dispute";

const KEY_FINDINGS = [
  { label: "Signed construction agreement located", detail: "Contract terms, scope of work, and project details were identified in your uploaded agreement.", tone: "success" as const, badge: "Strong" },
  { label: "Invoices and payment records found", detail: "Billing records show payments made to the contractor and outstanding amounts.", tone: "success" as const, badge: "Strong" },
  { label: "Photo evidence supports visible defects", detail: "Uploaded photos show deck condition, waterproofing issues, and related structural damage.", tone: "info" as const, badge: "Good" },
  { label: "Inspection notes mention unresolved deficiencies", detail: "Inspection reports identify code and workmanship concerns that remain unaddressed.", tone: "info" as const, badge: "Good" },
  { label: "Messages show ongoing dispute communications", detail: "Email and text records show your attempts to resolve the matter with the contractor.", tone: "warning" as const, badge: "Needs review" },
];

const POTENTIAL_GAPS = [
  { label: "Final payment total not fully confirmed", detail: "The total amount paid and any remaining balance should be verified.", tone: "warning" as const, badge: "Needs review" },
  { label: "No third-party expert report uploaded yet", detail: "An independent inspection or expert report could strengthen your claim.", tone: "info" as const, badge: "Recommended" },
  { label: "Permit history may still be incomplete", detail: "Consider uploading all related permits and inspection records.", tone: "info" as const, badge: "Recommended" },
  { label: "Response deadline to contractor not yet set", detail: "You may want to set a formal response deadline in your demand letter.", tone: "neutral" as const, badge: "Consider" },
];

export function AnalyzeStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as ContractorDisputeIntake;
  const documentCount = ((matter.steps.documents?.data.files as unknown[]) ?? []).length;

  const rows = [
    { key: "property", label: "Property", value: intake.propertyAddress ?? "—" },
    { key: "contractor", label: "Contractor", value: intake.contractorName ?? "—" },
    { key: "agreement", label: "Agreement type", value: intake.agreementType ?? "—" },
    { key: "signed", label: "Agreement signed", value: intake.dateAgreementSigned ?? "—" },
    { key: "began", label: "Work began", value: intake.dateWorkBegan ?? "—" },
    { key: "discovered", label: "Issue discovered", value: intake.dateIssueDiscovered ?? "—" },
    { key: "resolution", label: "Requested resolution", value: intake.requestedResolution ?? "—" },
  ];

  return (
    <>
      <SectionCard
        title="Matter analysis"
        description="We extracted the main dispute facts from your intake and supporting documents. Review the summary below and correct anything that appears incomplete or inaccurate."
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
          <div className="wf-card-eyebrow">Detected issue summary</div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "var(--wf-color-stone)" }}>
            {intake.disputeSummary || "Complete Intake to generate a detected issue summary."}
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

      <SectionCard title="Potential gaps or risks" description="Consider addressing the following items to strengthen your case.">
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
