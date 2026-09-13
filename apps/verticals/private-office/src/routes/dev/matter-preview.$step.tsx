import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StepShell, StatusCard, ReadinessChecklist, NextActionCard, SummaryListCard } from "@mailmypdf/workflow-ui";
import { getStepMatterProgress, type StepMatterState, type ChecklistItemState } from "@mailmypdf/step-workflow";
import { contractorDisputeStepWorkflow } from "@/domain/step-workflows/contractor-dispute";
import { workflowStepUiRegistry } from "@/components/workflow-steps/registry";
import { MatterAppHeader } from "@/components/matter-app-header";

export const Route = createFileRoute("/dev/matter-preview/$step")({ component: DevMatterPreview });

/**
 * Dev-only, no-auth, no-server preview of the Contractor Dispute matter UI —
 * exists purely so this UI can be visually verified against the design
 * mockups without a logged-in Supabase session. Not linked from anywhere in
 * the real app; safe to delete once visual QA is done.
 */
function buildMockMatter(currentStepId: string): StepMatterState {
  const steps = contractorDisputeStepWorkflow.steps.map((s) => s.id);
  const currentIndex = steps.indexOf(currentStepId);

  const documentFiles = [
    { id: "1", name: "Construction_Agreement.pdf", category: "Contract" },
    { id: "2", name: "Invoice_04252024.pdf", category: "Invoices" },
    { id: "3", name: "Deck_Defect_1.jpg", category: "Photos" },
    { id: "4", name: "Inspection_Notes.pdf", category: "Inspection Reports" },
    { id: "5", name: "Text_Messages.docx", category: "Messages" },
    { id: "6", name: "Estimate_Redwoods.pdf", category: "Estimates" },
    { id: "7", name: "Deck_Wide_View.jpg", category: "Photos" },
    { id: "8", name: "City_Permit.pdf", category: "Permits" },
  ];

  const intakeData = {
    propertyAddress: "1234 Oak Ridge Drive, San Diego, CA 92130",
    contractorName: "BrightBuild Construction LLC",
    agreementType: "Written contract",
    dateAgreementSigned: "2024-03-12",
    dateWorkBegan: "2024-04-01",
    dateIssueDiscovered: "2024-06-15",
    disputeSummary:
      "Contractor failed to complete the deck construction project in accordance with our agreement. The available evidence indicates issues with improper waterproofing and damage to existing structures, and the work remains incomplete.",
    requestedResolution: "Completion of agreed work or refund for amounts paid.",
  };

  const stepEntries = steps.map((id, index) => {
    const status = index < currentIndex ? "complete" : index === currentIndex ? "in_progress" : "not_started";
    const data: Record<string, unknown> =
      id === "intake" ? intakeData : id === "documents" ? { files: documentFiles } : {};
    return [id, { status, checklist: [] as ChecklistItemState[], data, completedAt: null }] as const;
  });

  return {
    id: "dev-preview-matter",
    ownerId: "dev-preview-owner",
    workflowId: "contractor-dispute",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStepId,
    steps: Object.fromEntries(stepEntries),
    approved: currentIndex >= steps.indexOf("review"),
    approvedAt: null,
  };
}

function DevMatterPreview() {
  const { step } = Route.useParams();
  const [matter, setMatter] = useState<StepMatterState>(() => buildMockMatter(step));

  const definition = contractorDisputeStepWorkflow;
  const uiConfig = workflowStepUiRegistry[matter.workflowId];
  const StepComponent = uiConfig?.stepComponents[step];
  if (!uiConfig || !StepComponent) {
    return <div style={{ padding: "3rem", textAlign: "center" }}>Unknown step: {step}</div>;
  }

  const currentStepDef = definition.steps.find((s) => s.id === step);
  const completedStepIds = definition.steps.filter((s) => matter.steps[s.id]?.status === "complete").map((s) => s.id);
  const progress = getStepMatterProgress(definition, matter);
  const readiness = uiConfig.getReadiness(matter);
  const sidebarItems = [{ id: "overview", label: "Overview" }, ...definition.steps.filter((s) => s.id !== "analyze")];
  const activeSidebarId = sidebarItems.some((item) => item.id === step) ? step : "overview";

  async function handleUpdateData(patch: Record<string, unknown>) {
    setMatter((current) => ({
      ...current,
      steps: { ...current.steps, [step]: { ...current.steps[step], data: { ...current.steps[step].data, ...patch } } },
    }));
  }
  async function handleSetChecklistItem(item: ChecklistItemState) {
    setMatter((current) => {
      const existing = current.steps[step].checklist;
      const idx = existing.findIndex((c) => c.id === item.id);
      const checklist = idx >= 0 ? existing.map((c, i) => (i === idx ? item : c)) : [...existing, item];
      return { ...current, steps: { ...current.steps, [step]: { ...current.steps[step], checklist } } };
    });
  }
  async function handleComplete() {
    setMatter((current) => ({ ...current, steps: { ...current.steps, [step]: { ...current.steps[step], status: "complete" } } }));
  }
  async function handleApprove() {
    setMatter((current) => ({ ...current, approved: true }));
  }
  function goToStep(stepId: string) {
    window.location.href = `/dev/matter-preview/${stepId}`;
  }

  return (
    <>
      <MatterAppHeader />
      <StepShell
      breadcrumb={[{ label: "My Matters (dev preview)" }, { label: definition.title }]}
      title={`${definition.title} Matter`}
      lastSavedLabel="Dev preview — not persisted"
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
            state={matter.steps[step]?.status === "complete" ? "complete" : "in_progress"}
            summary="We reviewed your intake and documents. Confirm the key findings before continuing."
          />
          <ReadinessChecklist title="Readiness checklist" items={readiness} />
          <NextActionCard title="Continue" description="Dev preview — actions are local only." actionLabel="Refresh" onAction={() => setMatter(buildMockMatter(step))} />
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
    </>
  );
}
