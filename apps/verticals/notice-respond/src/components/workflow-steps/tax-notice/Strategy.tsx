import { useState } from "react";
import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import {
  getCombinedIntake,
  getSelectedNoticeOption,
  getResponsePathOptions,
  RESPONSE_PATH_OPTIONS,
} from "@/domain/step-workflows/tax-notice";

export function StrategyStep({ matter, onUpdateData, onComplete }: StepComponentProps) {
  const data = getCombinedIntake(matter);
  const option = getSelectedNoticeOption(matter);
  const pathOptions = getResponsePathOptions(data.noticeCategory);
  const [selectedPath, setSelectedPath] = useState((matter.steps.strategy?.data.responsePath as string) ?? data.responsePath ?? "");
  const documentCount = ((matter.steps.documents?.data.files as unknown[]) ?? []).length;

  const hasDeadline = Boolean(data.responseDeadline);
  const chosenOption = RESPONSE_PATH_OPTIONS.find((p) => p.value === selectedPath);
  const isTimeSensitive = selectedPath === "petition_tax_court_90day" || selectedPath === "request_cdp_hearing_30day" || selectedPath === "request_abatement_60day";

  async function handleConfirm() {
    await onUpdateData({ responsePath: selectedPath });
    await onComplete();
  }

  return (
    <>
      <SectionCard
        title="Confirm the deadline and your rights"
        description={option ? option.label : "Notice type not yet identified — go back to Identify."}
        headerAside={<StatusPill tone={hasDeadline ? "success" : "warning"} label={hasDeadline ? "Deadline confirmed" : "Deadline missing"} />}
      >
        {option ? (
          <>
            <p style={{ fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>{option.deadlineGuidance}</p>
            <div className="wf-card-eyebrow" style={{ marginTop: "1rem" }}>Your rights for this notice type</div>
            <ul style={{ marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {option.rightsGuidance.map((right) => (
                <li key={right} style={{ fontSize: "0.82rem", color: "var(--wf-color-stone)" }}>{right}</li>
              ))}
            </ul>
          </>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>Go back to Identify to select a notice type before choosing a response path.</p>
        )}
        {!hasDeadline && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--wf-color-warning, #b45309)" }}>
            No response deadline was confirmed in Identify. Confirm the exact date on your notice before proceeding — do not assume a default number of days.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Choose your response path"
        description="Pick the action that matches what you actually want to happen. Options are filtered to what applies to this notice type."
        headerAside={<span className="wf-pill wf-pill--warning">Required</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={!selectedPath} onClick={handleConfirm}>
            Confirm strategy →
          </button>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {pathOptions.map((path) => (
            <label
              key={path.value}
              className="wf-card"
              style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", cursor: "pointer", border: selectedPath === path.value ? "1.5px solid var(--wf-color-navy, #1e293b)" : undefined }}
            >
              <input type="radio" name="responsePath" checked={selectedPath === path.value} onChange={() => setSelectedPath(path.value)} style={{ marginTop: "0.2rem" }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{path.label}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--wf-color-stone)" }}>{path.description}</div>
              </div>
            </label>
          ))}
        </div>
        {isTimeSensitive && (
          <div className="wf-card" style={{ background: "var(--wf-color-warning-bg, #fff7ed)", marginTop: "1rem" }}>
            <strong>This path has a strict, non-extendable deadline.</strong>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem" }}>
              {selectedPath === "petition_tax_court_90day" && "Only file this if your notice is an actual Notice of Deficiency (“90-day letter”) — the petition goes to the U.S. Tax Court, not the agency address in this letter."}
              {selectedPath === "request_cdp_hearing_30day" && "Only file this if your notice is a Final Notice of Intent to Levy or Notice of Federal Tax Lien. An earlier reminder notice (like CP504) does not by itself start this 30-day clock."}
              {selectedPath === "request_abatement_60day" && "This right applies only within 60 days of the math-error notice date."}
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Readiness" description={`We checked your response path against ${documentCount} uploaded document${documentCount === 1 ? "" : "s"} and your facts.`}>
        <DataTable
          columns={[
            { key: "item", label: "Item" },
            { key: "status", label: "Status" },
          ]}
          rows={[
            { item: "Notice type identified", status: <StatusPill tone={option ? "success" : "warning"} label={option ? "Ready" : "Missing"} /> },
            { item: "Deadline confirmed from the notice", status: <StatusPill tone={hasDeadline ? "success" : "warning"} label={hasDeadline ? "Ready" : "Missing"} /> },
            { item: "Facts explained", status: <StatusPill tone={data.issueDescription?.trim() ? "success" : "warning"} label={data.issueDescription?.trim() ? "Ready" : "Missing"} /> },
            { item: "Response path selected", status: <StatusPill tone={selectedPath ? "success" : "warning"} label={selectedPath ? "Ready" : "Missing"} /> },
            { item: "Supporting documents", status: <StatusPill tone={documentCount > 0 ? "success" : "warning"} label={documentCount > 0 ? `${documentCount} attached` : "None yet"} /> },
          ]}
        />
        {chosenOption && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--wf-color-stone)" }}>
            Selected: <strong>{chosenOption.label}</strong> — {chosenOption.description}
          </p>
        )}
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Review the deadline and rights" }, { label: "Choose a response path" }, { label: "Confirm strategy" }]}
        continueLabel="Continue to Draft"
        continueDisabled={!selectedPath}
        onContinue={handleConfirm}
      />
    </>
  );
}
