import { useState } from "react";
import { SectionCard, StatusPill, DataTable, TextArea, Field, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "@mailmypdf/workflow-ui";

/**
 * Each "issue" here is a disputed fact or contradiction raised against the
 * decision — the appeal-mail analog of Contractor Dispute's per-issue
 * evidence builder. `authority` mirrors the real analyze endpoint's
 * `citedAuthority` field so a strengthening response can reference the
 * specific rule or statute at stake.
 */
/** Exported so Draft.tsx can pull each issue's saved response into the generated letter. */
export const ISSUES = [
  {
    id: "disputed-finding",
    title: "Issue 1 — Disputed factual finding",
    tone: "success" as const,
    badge: "Strong",
    summary: "The decision states a finding that conflicts with your records or correspondence.",
    files: ["Decision_Notice.pdf", "Correspondence.pdf"],
    authority: "Cited authority: agency regulation governing the underlying determination",
    factSummary: "Your uploaded correspondence and records support a different account of the facts than the one stated in the decision notice.",
    defaultResponse: "Request that the decision-maker reconsider the finding in light of the attached records.",
  },
  {
    id: "evidence-gap",
    title: "Issue 2 — Evidence gap in the decision",
    tone: "info" as const,
    badge: "Good",
    summary: "The decision does not address evidence that was submitted or available before it was issued.",
    files: ["Supporting_Record.pdf"],
    authority: "Cited authority: procedural requirement to consider the full record",
    factSummary: "The decision notice does not reference this supporting record, which may not have been considered.",
    defaultResponse: "Ask the decision-maker to consider this evidence and explain how it affects the outcome.",
  },
  {
    id: "procedural-uncertainty",
    title: "Issue 3 — Procedural uncertainty",
    tone: "warning" as const,
    badge: "Needs review",
    summary: "The applicable appeal path, deadline, or exhaustion requirement is not yet fully confirmed.",
    files: ["Appeal_Instructions.pdf"],
    authority: "Authority not yet independently verified",
    factSummary: "The notice describes an appeal process, but the governing deadline and forum should be confirmed against current authoritative sources.",
    defaultResponse: "Confirm the correct appeal forum and deadline before finalizing the response.",
  },
];

export function EvidenceStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const savedResponses = (matter.steps.evidence?.data.responses as Record<string, string>) ?? {};
  const [responses, setResponses] = useState<Record<string, string>>(savedResponses);

  async function handleSave() {
    await onUpdateData({ responses });
    await onComplete();
  }

  const linkedCount = ISSUES.reduce((sum, issue) => sum + issue.files.length, 0);

  return (
    <>
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
        steps={[{ label: "Finish issue summaries" }, { label: "Link any missing files" }, { label: "Mark strongest exhibits" }, { label: "Continue to timeline" }]}
        continueLabel="Continue to Timeline"
        onContinue={handleSave}
      />
    </>
  );
}
