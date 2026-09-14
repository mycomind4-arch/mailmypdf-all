import { SectionCard, DataTable, StatusPill, RecommendedStepsRow } from "@mailmypdf/workflow-ui";
import type { StepComponentProps } from "../types";
import { analyzeDisputedItems, type TransUnionDisputeIntake } from "@/domain/step-workflows/transunion-dispute";

const STRENGTH_TONE: Record<string, "success" | "warning" | "info"> = {
  strong: "success",
  needs_more: "warning",
  incomplete: "warning",
};

const STRENGTH_LABEL: Record<string, string> = {
  strong: "Well supported",
  needs_more: "Could be stronger",
  incomplete: "Incomplete",
};

export function AnalyzeStep({ matter, onComplete }: StepComponentProps) {
  const intake = (matter.steps.intake?.data ?? {}) as TransUnionDisputeIntake;
  const analyses = analyzeDisputedItems(matter);
  const documentCount = ((matter.steps.documents?.data.files as unknown[]) ?? []).length;
  const allIncomplete = analyses.length > 0 && analyses.every((a) => a.strength === "incomplete");

  return (
    <>
      <SectionCard
        title="Dispute analysis"
        description="We reviewed each disputed item against what a TransUnion reinvestigation actually needs for its category. Review the findings below and go back to Intake or Documents to close any gaps."
        headerAside={<span className="wf-pill wf-pill--info">Category-by-category review</span>}
        footer={
          <button type="button" className="wf-btn wf-btn--primary" disabled={allIncomplete} onClick={onComplete}>
            Confirm analysis →
          </button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <div className="wf-card-eyebrow">Consumer</div>
            <div style={{ fontSize: "0.9rem" }}>{intake.consumerName ?? "—"}</div>
          </div>
          <div>
            <div className="wf-card-eyebrow">Report date</div>
            <div style={{ fontSize: "0.9rem" }}>{intake.reportDate ?? "—"}</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Disputed items (${analyses.length})`} description={`We checked each item's category against ${documentCount} uploaded document${documentCount === 1 ? "" : "s"} and its own explanation.`}>
        {analyses.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>No disputed items yet — go back to Intake to add at least one.</p>
        ) : (
          <DataTable
            columns={[
              { key: "item", label: "Item" },
              { key: "status", label: "Status" },
            ]}
            rows={analyses.map((a, i) => ({
              item: (
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {i + 1}. {a.item.creditorName || "Account"} {a.item.accountNumber ? `(${a.item.accountNumber})` : ""}
                  </div>
                  <div style={{ color: "var(--wf-color-stone)", fontSize: "0.8rem" }}>{a.categoryLabel}</div>
                  {a.gap && <div style={{ color: "var(--wf-color-warning, #b45309)", fontSize: "0.78rem", marginTop: "0.2rem" }}>{a.gap}</div>}
                </div>
              ),
              status: <StatusPill tone={STRENGTH_TONE[a.strength]} label={STRENGTH_LABEL[a.strength]} />,
            }))}
          />
        )}
      </SectionCard>

      <SectionCard title="Your FCRA rights and the investigation timeline" description="These apply automatically once TransUnion receives your dispute — the letter you draft next will reference them.">
        <ul style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem", color: "var(--wf-color-stone)" }}>
          <li><strong style={{ color: "var(--wf-color-ink, inherit)" }}>30 days to investigate</strong> — TransUnion must reinvestigate each disputed item within 30 days of receiving your letter (45 days if you send more information during that window), under FCRA Section 611(a).</li>
          <li><strong style={{ color: "var(--wf-color-ink, inherit)" }}>Correction and notice</strong> — if an item can't be verified as accurate, TransUnion must delete or correct it, send you a free updated report, and notify the furnisher, under Section 611(a)(6) and 611(d).</li>
          <li><strong style={{ color: "var(--wf-color-ink, inherit)" }}>Recipients notified</strong> — you can ask TransUnion to send corrected reports to anyone who received your report in the past 6 months (2 years for employment purposes), under Section 611(d).</li>
          <li><strong style={{ color: "var(--wf-color-ink, inherit)" }}>If TransUnion disagrees</strong> — you can request the method of verification within 15 days, and if you still disagree, add a personal statement of dispute (up to 100 words) to your file, under Section 611(a)(7) and 611(b)-(c).</li>
        </ul>
      </SectionCard>

      <RecommendedStepsRow
        steps={[{ label: "Review each item's status" }, { label: "Add missing evidence in Documents" }, { label: "Confirm analysis" }]}
        continueLabel="Continue to Draft"
        continueDisabled={allIncomplete}
        onContinue={onComplete}
      />
    </>
  );
}
