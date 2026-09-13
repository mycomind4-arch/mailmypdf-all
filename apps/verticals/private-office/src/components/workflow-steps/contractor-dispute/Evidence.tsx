import { useState } from "react";
import { SectionCard, StatusPill, DataTable, TextArea, Field, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";

const ISSUES = [
  {
    id: "incomplete-work",
    title: "Issue 1 — Incomplete work",
    tone: "success" as const,
    badge: "Strong",
    summary: "The contractor did not complete the deck construction project according to the written agreement.",
    files: ["Construction_Agreement.pdf", "Invoice.pdf"],
    factSummary: "The agreement and payment record show the scope was accepted and paid for, while the uploaded photo shows the deck remains unfinished.",
    defaultRemedy: "Complete the remaining contracted work or refund the portion paid for incomplete performance.",
  },
  {
    id: "defective-waterproofing",
    title: "Issue 2 — Defective waterproofing and visible defects",
    tone: "info" as const,
    badge: "Good",
    summary: "Uploaded photos and notes indicate improper waterproofing and visible workmanship problems.",
    files: ["Deck_Defect.jpg", "Inspection_Notes.pdf"],
    factSummary: "The defect photo and inspection notes identify waterproofing and workmanship concerns that may require correction or remediation.",
    defaultRemedy: "Repair defective work to professional standard or pay the documented cost of remediation.",
  },
  {
    id: "unresolved-communications",
    title: "Issue 3 — Unresolved communications",
    tone: "warning" as const,
    badge: "Needs review",
    summary: "Messages show attempts to resolve the dispute, but the final demand position is not yet fully defined.",
    files: ["Text_Messages.docx"],
    factSummary: "The uploaded communications show repeated efforts to seek resolution, but a final deadline and settlement position should still be clarified.",
    defaultRemedy: "Set a firm response deadline and request written confirmation of the contractor's intended resolution.",
  },
];

export function EvidenceStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const savedRemedies = (matter.steps.evidence?.data.remedies as Record<string, string>) ?? {};
  const [remedies, setRemedies] = useState<Record<string, string>>(savedRemedies);

  async function handleSave() {
    await onUpdateData({ remedies });
    await onComplete();
  }

  const linkedCount = ISSUES.reduce((sum, issue) => sum + issue.files.length, 0);

  return (
    <>
      <SectionCard
        title="Evidence builder"
        description="Organize the dispute into clear issues. For each issue, attach supporting documents, notes, and the remedy you want reflected in the notice."
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
              <p style={{ margin: "0.35rem 0 0.6rem", fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>{issue.summary}</p>
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
                <Field label="Requested remedy for this issue">
                  <TextArea
                    rows={2}
                    value={remedies[issue.id] ?? issue.defaultRemedy}
                    onChange={(e) => setRemedies((current) => ({ ...current, [issue.id]: e.target.value }))}
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

      <SectionCard title="Evidence map" description="This record will help draft a clear, fact-based notice.">
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
        steps={[{ label: "Finish issue summaries" }, { label: "Link any missing files" }, { label: "Mark strongest exhibits" }, { label: "Continue to timeline" }]}
        continueLabel="Continue to Timeline"
        onContinue={handleSave}
      />
    </>
  );
}
