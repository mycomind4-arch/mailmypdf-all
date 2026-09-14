import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { StepShell, StatusCard, ReadinessChecklist, NextActionCard, SummaryListCard } from "@mailmypdf/workflow-ui";
import { getStepMatter, updateStepMatterData, setStepMatterChecklistItem, completeStepMatterStep, approveStepMatter } from "@/lib/fns/step-matter";
import { findStepWorkflow } from "@/domain/step-workflows";
import { getStepMatterProgress, type StepMatterState, type ChecklistItemState } from "@mailmypdf/step-workflow";
import { workflowStepUiRegistry } from "@/components/workflow-steps/registry";

export const Route = createFileRoute("/matters/$matterId/$step")({ component: MatterStepPage });

// Generic, workflow-agnostic copy — this page is shared by every workflow in
// workflowStepUiRegistry (administrative-decision-appeal, car-insurance-appeal,
// and any future addition), so this must not name a specific agency, notice
// type, or recipient (it previously read "Upload your NOID notice..." and
// "...to USCIS", copied from immigration-mail's NOID Response workflow, which
// don't apply to any Appeal Mail workflow).
const NEXT_ACTION_COPY: Record<string, { title: string; description: string }> = {
  intake: { title: "Add supporting documents", description: "Upload your decision notice and any evidence that supports your appeal." },
  documents: { title: "Confirm analysis", description: "Review the analysis above and make any needed corrections. Once confirmed, continue to build your evidence record." },
  analyze: { title: "Confirm analysis", description: "Review the analysis above and make any needed corrections. Once confirmed, continue to build your evidence record." },
  evidence: { title: "Finalize issue-by-issue responses", description: "Review your evidence and responses to make sure each disputed issue is clearly addressed before moving to the timeline." },
  timeline: { title: "Finalize chronology", description: "Review your key dates to make sure your timeline is accurate and the deadline is confirmed." },
  draft: { title: "Review the draft response", description: "Read through your draft carefully and make any needed edits before proceeding to the review step." },
  review: { title: "Approve the final package", description: "Review the complete response package and confirm mailing settings before sending." },
  mail: { title: "Send the mailing package", description: "Finish the workflow by purchasing postage and sending your certified mailing package to the decision-maker." },
  overview: { title: "Continue your matter", description: "Pick up where you left off." },
};

function MatterStepPage() {
  const { matterId, step } = Route.useParams();
  const navigate = useNavigate();
  const [matter, setMatter] = useState<StepMatterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStepMatter({ data: { matterId } });
      setMatter(result.matter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load this matter.");
    } finally {
      setLoading(false);
    }
  }, [matterId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const goToStep = useCallback(
    (stepId: string) => navigate({ to: "/matters/$matterId/$step", params: { matterId, step: stepId } }),
    [navigate, matterId],
  );

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--wf-color-stone, #6b6963)" }}>Loading matter…</div>
    );
  }
  if (error || !matter) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--wf-color-error, #b8442e)" }}>
        {error ?? "This matter could not be found."}
      </div>
    );
  }

  const definition = findStepWorkflow(matter.workflowId);
  const uiConfig = workflowStepUiRegistry[matter.workflowId];
  if (!definition || !uiConfig) {
    return <div style={{ padding: "3rem", textAlign: "center" }}>Unknown workflow: {matter.workflowId}</div>;
  }

  const StepComponent = uiConfig.stepComponents[step];
  if (!StepComponent) {
    return <div style={{ padding: "3rem", textAlign: "center" }}>Unknown step: {step}</div>;
  }

  const currentStepDef = definition.steps.find((candidate) => candidate.id === step);
  const completedStepIds = definition.steps.filter((candidate) => matter.steps[candidate.id]?.status === "complete").map((candidate) => candidate.id);
  const progress = getStepMatterProgress(definition, matter);
  const currentStepState = matter.steps[step];
  const readiness = uiConfig.getReadiness(matter);
  const nextAction = NEXT_ACTION_COPY[step] ?? NEXT_ACTION_COPY.overview;

  // "overview" isn't one of the stepper's 8 steps — highlight nothing there,
  // and fall back to it whenever the current step (e.g. "analyze") has no
  // matching left-nav entry of its own.
  const sidebarItems = [{ id: "overview", label: "Overview" }, ...definition.steps.filter((s) => s.id !== "analyze")];
  const activeSidebarId = sidebarItems.some((item) => item.id === step) ? step : "overview";

  async function handleUpdateData(patch: Record<string, unknown>) {
    const result = await updateStepMatterData({ data: { matterId, expectedVersion: matter!.version, stepId: step, patch } });
    setMatter(result.matter);
  }
  async function handleSetChecklistItem(item: ChecklistItemState) {
    const result = await setStepMatterChecklistItem({ data: { matterId, expectedVersion: matter!.version, stepId: step, item } });
    setMatter(result.matter);
  }
  async function handleComplete() {
    const result = await completeStepMatterStep({ data: { matterId, expectedVersion: matter!.version, stepId: step } });
    setMatter(result.matter);
    const index = definition!.steps.findIndex((candidate) => candidate.id === step);
    const next = definition!.steps[index + 1];
    if (next) goToStep(next.id);
  }
  async function handleApprove() {
    const result = await approveStepMatter({ data: { matterId, expectedVersion: matter!.version } });
    setMatter(result.matter);
  }

  return (
    <StepShell
      breadcrumb={[{ label: "My Cases", href: "/matters" }, { label: definition.title }]}
      title={`${definition.title} Matter`}
      subtitle={currentStepDef ? undefined : "A summary of this matter and quick links to each step."}
      lastSavedLabel="Last saved a moment ago"
      steps={definition.steps}
      currentStepId={step === "overview" ? (definition.steps[0]?.id ?? step) : step}
      completedStepIds={completedStepIds}
      onStepClick={goToStep}
      sidebar={
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{definition.title}</div>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToStep(item.id)}
              className="wf-btn"
              style={{
                justifyContent: "flex-start",
                background: item.id === activeSidebarId ? "var(--wf-color-navy-bg)" : "transparent",
                color: item.id === activeSidebarId ? "var(--wf-color-navy)" : "var(--wf-color-stone)",
                fontWeight: item.id === activeSidebarId ? 600 : 500,
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      }
      rail={
        <>
          <StatusCard
            current={progress.completed}
            total={progress.total}
            stepLabel={currentStepDef?.label ?? "Overview"}
            state={currentStepState?.status === "complete" ? "complete" : "in_progress"}
            summary="We reviewed your intake and documents. Confirm the key findings before continuing."
          />
          <ReadinessChecklist title="Readiness checklist" items={readiness} />
          <NextActionCard
            title={nextAction.title}
            description={nextAction.description}
            actionLabel={currentStepDef ? `Go to ${currentStepDef.label}` : "Continue"}
            onAction={() => goToStep(step)}
          />
          <SummaryListCard title="Estimated mailing package" items={uiConfig.mailingPackage} note="Final contents may vary based on your information and selected options." />
        </>
      }
    >
      <StepComponent
        matter={matter}
        onUpdateData={handleUpdateData}
        onSetChecklistItem={handleSetChecklistItem}
        onComplete={handleComplete}
        onApprove={handleApprove}
        goToStep={goToStep}
      />
    </StepShell>
  );
}
