import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StepShell, StatusCard, ReadinessChecklist, NextActionCard, SummaryListCard } from "@mailmypdf/workflow-ui";
import { getStepMatterProgress, type StepMatterState, type ChecklistItemState, type StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { administrativeDecisionAppealStepWorkflow } from "@/domain/step-workflows/administrative-decision-appeal";
import { carInsuranceAppealStepWorkflow } from "@/domain/step-workflows/car-insurance-appeal";
import { workflowStepUiRegistry } from "@/components/workflow-steps/registry";
import { MatterAppHeader } from "@/components/matter-app-header";

export const Route = createFileRoute("/dev/matter-preview/$step")({ component: DevMatterPreview });

/**
 * Dev-only, no-auth, no-server preview of step-based matter workflow UI —
 * exists purely so this UI can be visually verified without a logged-in
 * Supabase session, since `accountAuthMiddleware` gates every real
 * step-matter server function. Ported from Private Office's
 * `src/routes/dev/matter-preview.$step.tsx`.
 *
 * Unlike Private Office (where this was deleted once QA'd for its one
 * workflow), Appeal Mail is converting ~37 workflows onto this engine one at
 * a time — this route is kept as a standing dev tool. Pick which workflow's
 * mock matter to preview with `?workflow=<id>`, e.g.
 * `/dev/matter-preview/intake?workflow=car-insurance-appeal`
 * (defaults to administrative-decision-appeal when omitted or unknown).
 * Add a `MOCK_MATTER_BUILDERS` entry per workflow as each one is converted —
 * no other changes to this route are needed.
 *
 * Not linked from anywhere in the real app.
 */
type MockMatterBuilder = (currentStepId: string) => StepMatterState;

function buildAdministrativeDecisionAppealMockMatter(currentStepId: string): StepMatterState {
  const workflowId = administrativeDecisionAppealStepWorkflow.id;
  const steps = administrativeDecisionAppealStepWorkflow.steps.map((s) => s.id);
  const currentIndex = steps.indexOf(currentStepId);

  const documentFiles = [
    { id: "1", name: "Decision_Notice.pdf", category: "Decision Notice" },
    { id: "2", name: "Appeal_Instructions.pdf", category: "Appeal Instructions" },
    { id: "3", name: "Correspondence.pdf", category: "Correspondence" },
    { id: "4", name: "Supporting_Record.pdf", category: "Supporting Records" },
    { id: "5", name: "Prior_Filing.pdf", category: "Prior Filings" },
    { id: "6", name: "Cited_Regulation.pdf", category: "Cited Authority" },
  ];

  const intakeData = {
    issuer: "Department of Motor Vehicles",
    jurisdiction: "State of Illinois",
    referenceNumber: "DMV-2026-004821",
    decisionDate: "2026-06-02",
    deadline: "2026-09-30",
    matterType: "Licensing decision",
    decisionSummary:
      "The agency denied renewal of the applicant's professional license, citing an unresolved compliance finding from a 2024 inspection. Correspondence submitted at the time shows the finding was already remediated before the renewal application was filed.",
    requestedOutcome: "Reverse the denial and reinstate the license, or grant a hearing to present the remediation evidence.",
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
    workflowId,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStepId,
    steps: Object.fromEntries(stepEntries),
    approved: currentIndex >= steps.indexOf("review"),
    approvedAt: null,
  };
}

function buildCarInsuranceAppealMockMatter(currentStepId: string): StepMatterState {
  const workflowId = carInsuranceAppealStepWorkflow.id;
  const steps = carInsuranceAppealStepWorkflow.steps.map((s) => s.id);
  const currentIndex = steps.indexOf(currentStepId);

  const documentFiles = [
    { id: "1", name: "Denial_Letter.pdf", category: "Denial Letter" },
    { id: "2", name: "Policy_Declarations.pdf", category: "Insurance Policy / Declarations Page" },
    { id: "3", name: "Police_Report.pdf", category: "Police Report" },
    { id: "4", name: "Repair_Estimate.pdf", category: "Repair Estimate / Appraisal" },
    { id: "5", name: "Photos_of_Damage.pdf", category: "Photos of Damage" },
    { id: "6", name: "Adjuster_Correspondence.pdf", category: "Correspondence with Adjuster" },
  ];

  const intakeData = {
    insurer: "Progressive Auto Insurance",
    claimNumber: "CLM-2026-004821",
    policyNumber: "POL-8834471-02",
    adjusterName: "Marcus Webb",
    accidentDate: "2026-05-14",
    decisionDate: "2026-06-02",
    deadline: "2026-09-30",
    policeReportNumber: "PD-2026-118834",
    liabilityDetermination: "shared_fault",
    repairEstimateAmount: "$6,240.00",
    denialReason:
      "Progressive found the insured 70% at fault for the collision and reduced the claim payout accordingly, citing the responding officer's initial assessment. The insured's own dashcam footage was not addressed in the denial letter.",
    damageDescription:
      "Front-end collision damage to the driver's side fender, headlight assembly, and bumper. An independent body shop estimate of $6,240.00 is $1,850 higher than the amount Progressive approved, citing use of aftermarket parts pricing instead of OEM parts.",
    requestedOutcome:
      "Reassess liability using the dashcam footage and revise the fault determination, and approve the full repair estimate using OEM parts pricing.",
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
    workflowId,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStepId,
    steps: Object.fromEntries(stepEntries),
    approved: currentIndex >= steps.indexOf("review"),
    approvedAt: null,
  };
}

const WORKFLOW_DEFINITIONS: Record<string, StepWorkflowDefinition> = {
  [administrativeDecisionAppealStepWorkflow.id]: administrativeDecisionAppealStepWorkflow,
  [carInsuranceAppealStepWorkflow.id]: carInsuranceAppealStepWorkflow,
};

const MOCK_MATTER_BUILDERS: Record<string, MockMatterBuilder> = {
  [administrativeDecisionAppealStepWorkflow.id]: buildAdministrativeDecisionAppealMockMatter,
  [carInsuranceAppealStepWorkflow.id]: buildCarInsuranceAppealMockMatter,
};

const DEFAULT_WORKFLOW_ID = administrativeDecisionAppealStepWorkflow.id;

/**
 * Resolves `?workflow=<id>` to a known mock-matter builder, falling back to
 * the default preview workflow when omitted or unrecognized. Reads the value
 * from the router's own parsed search (`Route.useSearch()`), NOT
 * `window.location.search` — this route is server-rendered, and branching a
 * render (or a `useState` lazy initializer) on `typeof window` produces a
 * server/client text mismatch that crashes hydration, since the router's
 * search parsing runs identically during SSR and CSR.
 */
function resolveWorkflowId(requested: string | undefined): string {
  return requested && MOCK_MATTER_BUILDERS[requested] ? requested : DEFAULT_WORKFLOW_ID;
}

function DevMatterPreview() {
  const { step } = Route.useParams();
  const search = Route.useSearch() as { workflow?: string };
  const workflowId = resolveWorkflowId(search.workflow);
  const buildMockMatter = MOCK_MATTER_BUILDERS[workflowId] ?? MOCK_MATTER_BUILDERS[DEFAULT_WORKFLOW_ID];
  const [matter, setMatter] = useState<StepMatterState>(() => buildMockMatter(step));

  const definition = WORKFLOW_DEFINITIONS[workflowId] ?? WORKFLOW_DEFINITIONS[DEFAULT_WORKFLOW_ID];
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
    window.location.href = `/dev/matter-preview/${stepId}?workflow=${workflowId}`;
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
