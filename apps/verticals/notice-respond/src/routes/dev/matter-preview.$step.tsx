import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { StepShell, StatusCard, ReadinessChecklist, NextActionCard, SummaryListCard } from "@mailmypdf/workflow-ui";
import { getStepMatterProgress, type StepMatterState, type ChecklistItemState, type StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { transunionDisputeStepWorkflow, type DisputedItemDraft } from "@/domain/step-workflows/transunion-dispute";
import { experianDisputeStepWorkflow, type DisputedItemDraft as ExperianDisputedItemDraft } from "@/domain/step-workflows/experian-dispute";
import { equifaxDisputeStepWorkflow, type DisputedItemDraft as EquifaxDisputedItemDraft } from "@/domain/step-workflows/equifax-dispute";
import { taxNoticeStepWorkflow, type TaxNoticeIntake } from "@/domain/step-workflows/tax-notice";
import { cp2000StepWorkflow, type CP2000Data } from "@/domain/step-workflows/cp2000";
import { workflowStepUiRegistry } from "@/components/workflow-steps/registry";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/dev/matter-preview/$step")({ component: DevMatterPreview });

/**
 * Dev-only, no-auth, no-server preview of step-based matter workflow UI —
 * exists purely so this UI can be visually verified without a logged-in
 * Supabase session, since `accountAuthMiddleware` gates every real
 * step-matter server function. Ported from Appeal Mail's
 * `src/routes/dev/matter-preview.$step.tsx`.
 *
 * Pick which workflow's mock matter to preview with `?workflow=<id>`, e.g.
 * `/dev/matter-preview/intake?workflow=transunion-dispute`,
 * `/dev/matter-preview/intake?workflow=experian-dispute`,
 * `/dev/matter-preview/intake?workflow=equifax-dispute`, or
 * `/dev/matter-preview/identify?workflow=tax-notice`
 * (defaults to transunion-dispute when omitted or unknown). Add a
 * `MOCK_MATTER_BUILDERS` entry per workflow as each one is converted — no
 * other changes to this route are needed.
 *
 * `tax-notice` additionally supports `&scenario=assessment` (default — a
 * CP2000-style proposed-assessment notice, response path "dispute with
 * evidence") or `&scenario=collection` (a Final Notice of Intent to Levy,
 * response path "request a CDP hearing") — see
 * `TAX_NOTICE_SCENARIO_BUILDERS` below. That's the only workflow here whose
 * generic flow actually branches on notice type, so it's the only one that
 * needs more than one mock scenario.
 *
 * Not linked from anywhere in the real app.
 */
type MockMatterBuilder = (currentStepId: string) => StepMatterState;

const MOCK_DISPUTED_ITEMS: DisputedItemDraft[] = [
  {
    id: "item-1",
    creditorName: "Synchrony Bank / Care Credit",
    accountNumber: "****7734",
    category: "incorrect_amount",
    description: "This account shows a balance of $2,140.00, but I paid it in full on 04/02/2026. I have the payment confirmation email from Synchrony.",
    correctInformation: "Balance should be $0.00 and status should be Paid in Full",
  },
  {
    id: "item-2",
    creditorName: "Portfolio Recovery Associates",
    accountNumber: "****2201",
    category: "not_mine",
    description: "I have never opened an account with this company. This appears to be the result of identity theft — I filed an FTC Identity Theft Report on 03/18/2026.",
    correctInformation: "Account should be removed entirely",
  },
  {
    id: "item-3",
    creditorName: "Discover Bank",
    accountNumber: "****9042",
    category: "outdated",
    description: "This charge-off is from an account that went delinquent in 2017. It has been more than 7 years and should have aged off my report already.",
    correctInformation: "Date of first delinquency: 06/2017 — should have been removed by 06/2024",
  },
];

function buildTransUnionDisputeMockMatter(currentStepId: string): StepMatterState {
  const workflowId = transunionDisputeStepWorkflow.id;
  const steps = transunionDisputeStepWorkflow.steps.map((s) => s.id);
  const currentIndex = steps.indexOf(currentStepId);

  const documentFiles = [
    { id: "1", name: "TransUnion_Credit_Report.pdf", category: "TransUnion Credit Report" },
    { id: "2", name: "Drivers_License.pdf", category: "Proof of Identity (ID or license)" },
    { id: "3", name: "Synchrony_Payment_Confirmation.pdf", category: "Payment Records / Receipts" },
    { id: "4", name: "FTC_Identity_Theft_Report.pdf", category: "Police Report / FTC Identity Theft Report" },
  ];

  const intakeData = {
    consumerName: "Morgan T. Ellis",
    consumerAddress: "482 Birchwood Lane, Springfield, IL 62704",
    reportDate: "2026-08-15",
    reportNumber: "TU-2026-0043821",
    disputedItems: MOCK_DISPUTED_ITEMS,
    additionalContext: "",
    requestedOutcome: "Please delete the Portfolio Recovery Associates account entirely, correct the Synchrony Bank balance to $0.00, and remove the Discover Bank charge-off as obsolete.",
  };

  const stepEntries = steps.map((id, index) => {
    const status = index < currentIndex ? "complete" : index === currentIndex ? "in_progress" : "not_started";
    const data: Record<string, unknown> = id === "intake" ? intakeData : id === "documents" ? { files: documentFiles } : {};
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

const MOCK_EXPERIAN_DISPUTED_ITEMS: ExperianDisputedItemDraft[] = [
  {
    id: "item-1",
    creditorName: "Nordstrom / TD Bank",
    accountNumber: "****5518",
    category: "incorrect_status",
    description: "This retail card is reported 60 days late for March 2026, but I set up autopay in January 2026 and every payment since has posted on time. I have the bank statements showing on-time payments.",
    correctInformation: "Status should show current / paid as agreed for every month in 2026",
  },
  {
    id: "item-2",
    creditorName: "Midland Credit Management",
    accountNumber: "****3390",
    category: "not_mine",
    description: "I have never done business with this collector or the original creditor listed. I filed an FTC Identity Theft Report on 07/02/2026 after finding this and two other unfamiliar accounts on my Experian report.",
    correctInformation: "Account should be removed entirely",
  },
  {
    id: "item-3",
    creditorName: "Verizon Wireless",
    accountNumber: "****7710",
    category: "duplicate",
    description: "This collection account for a closed Verizon line appears twice on my Experian report — once listed as \"Verizon Wireless\" and again as \"Verizon\" with the same balance and the same last-4 account digits.",
    correctInformation: "One of the two duplicate listings should be removed",
  },
];

function buildExperianDisputeMockMatter(currentStepId: string): StepMatterState {
  const workflowId = experianDisputeStepWorkflow.id;
  const steps = experianDisputeStepWorkflow.steps.map((s) => s.id);
  const currentIndex = steps.indexOf(currentStepId);

  const documentFiles = [
    { id: "1", name: "Experian_Credit_Report.pdf", category: "Experian Credit Report" },
    { id: "2", name: "State_ID.pdf", category: "Proof of Identity (ID or license)" },
    { id: "3", name: "TD_Bank_Autopay_Statements.pdf", category: "Payment Records / Receipts" },
    { id: "4", name: "FTC_Identity_Theft_Report.pdf", category: "Police Report / FTC Identity Theft Report" },
  ];

  const intakeData = {
    consumerName: "Priya N. Chandrasekaran",
    consumerAddress: "1140 Fig Grove Court, Austin, TX 78702",
    reportDate: "2026-08-22",
    reportNumber: "EX-2026-0091144",
    disputedItems: MOCK_EXPERIAN_DISPUTED_ITEMS,
    additionalContext: "",
    requestedOutcome: "Please correct the Nordstrom/TD Bank account to show on-time payment status for 2026, remove the Midland Credit Management account entirely, and remove one of the two duplicate Verizon Wireless collection listings.",
  };

  const stepEntries = steps.map((id, index) => {
    const status = index < currentIndex ? "complete" : index === currentIndex ? "in_progress" : "not_started";
    const data: Record<string, unknown> = id === "intake" ? intakeData : id === "documents" ? { files: documentFiles } : {};
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

const MOCK_EQUIFAX_DISPUTED_ITEMS: EquifaxDisputedItemDraft[] = [
  {
    id: "item-1",
    creditorName: "Ally Financial (Auto Loan)",
    accountNumber: "****6642",
    category: "incorrect_status",
    description: "This auto loan is reported 30 days late for February 2026, but my bank's autopay confirmation shows the payment posted on time on 02/03/2026. I have the bank statement showing the on-time transfer.",
    correctInformation: "Status should show current / paid as agreed for February 2026",
  },
  {
    id: "item-2",
    creditorName: "LVNV Funding LLC",
    accountNumber: "****4417",
    category: "not_mine",
    description: "I have never had any account or relationship with this collector or the original creditor it lists. I filed an FTC Identity Theft Report on 06/11/2026 after finding this and one other unfamiliar account on my Equifax report.",
    correctInformation: "Account should be removed entirely",
  },
  {
    id: "item-3",
    creditorName: "Kohl's / Capital One",
    accountNumber: "****3305",
    category: "incorrect_amount",
    description: "This retail card shows a balance of $1,860.00, but I paid it in full on 05/09/2026. I have the payment confirmation from Capital One.",
    correctInformation: "Balance should be $0.00 — paid in full",
  },
];

function buildEquifaxDisputeMockMatter(currentStepId: string): StepMatterState {
  const workflowId = equifaxDisputeStepWorkflow.id;
  const steps = equifaxDisputeStepWorkflow.steps.map((s) => s.id);
  const currentIndex = steps.indexOf(currentStepId);

  const documentFiles = [
    { id: "1", name: "Equifax_Credit_Report.pdf", category: "Equifax Credit Report" },
    { id: "2", name: "State_ID.pdf", category: "Proof of Identity (ID or license)" },
    { id: "3", name: "Ally_Autopay_Statement.pdf", category: "Payment Records / Receipts" },
    { id: "4", name: "FTC_Identity_Theft_Report.pdf", category: "Police Report / FTC Identity Theft Report" },
  ];

  const intakeData = {
    consumerName: "Deshawn R. Okafor",
    consumerAddress: "27 Maple Ridge Drive, Columbus, OH 43215",
    reportDate: "2026-08-29",
    reportNumber: "EQ-2026-0055271",
    disputedItems: MOCK_EQUIFAX_DISPUTED_ITEMS,
    additionalContext: "",
    requestedOutcome: "Please correct the Ally Financial account to show on-time payment status for February 2026, remove the LVNV Funding LLC account entirely, and correct the Kohl's/Capital One balance to $0.00.",
  };

  const stepEntries = steps.map((id, index) => {
    const status = index < currentIndex ? "complete" : index === currentIndex ? "in_progress" : "not_started";
    const data: Record<string, unknown> = id === "intake" ? intakeData : id === "documents" ? { files: documentFiles } : {};
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

/**
 * Tax Notice needs two mock scenarios (not just one) to actually exercise
 * the branching this workflow exists for: a proposed-assessment notice
 * (CP2000-style, response path = dispute with evidence) and a
 * collection/levy notice (Final Notice of Intent to Levy, response path =
 * request a CDP hearing). Selected with `&scenario=assessment` or
 * `&scenario=collection` on top of `?workflow=tax-notice` (defaults to
 * "assessment"). Every other workflow above only needs one scenario since
 * they don't have notice-type-dependent branching.
 */
function buildTaxNoticeMockMatter(scenario: "assessment" | "collection") {
  return (currentStepId: string): StepMatterState => {
    const workflowId = taxNoticeStepWorkflow.id;
    const steps = taxNoticeStepWorkflow.steps.map((s) => s.id);
    const currentIndex = steps.indexOf(currentStepId);

    const isCollection = scenario === "collection";

    const identifyData: TaxNoticeIntake = isCollection
      ? {
          pastedNoticeText: "Internal Revenue Service — Final Notice of Intent to Levy and Notice of Your Right to a Hearing (Letter 1058)",
          noticeTypeOption: "irs_final_levy_or_lien",
          noticeCategory: "collection",
          noticeNumber: "Letter 1058",
          noticeDate: "2026-08-01",
          taxYear: "2023",
          amountAtIssue: "$8,412.00",
          responseDeadline: "2026-08-31",
        }
      : {
          pastedNoticeText: "Internal Revenue Service — CP2000 — Proposed changes to your 2024 Form 1040 based on income reported by third parties",
          noticeTypeOption: "irs_cp2000",
          noticeCategory: "proposed_assessment",
          noticeNumber: "CP2000",
          noticeDate: "2026-07-10",
          taxYear: "2024",
          amountAtIssue: "$1,940.00",
          responseDeadline: "2026-08-09",
        };

    const intakeData: TaxNoticeIntake = isCollection
      ? {
          taxpayerName: "Renata M. Okafor",
          taxpayerAddress: "88 Larkspur Ave, Denver, CO 80203",
          agencyName: "Internal Revenue Service",
          agencyAddress: "Internal Revenue Service, PO Box 24017, Fresno, CA 93779",
          issueDescription:
            "I have an outstanding balance from tax year 2023 following a CP504 notice earlier this year. I did not respond to CP504 because I was not aware it did not itself preserve a hearing right, and I have now received this Final Notice of Intent to Levy. I want to request a Collection Due Process hearing and be considered for an installment agreement, since I can pay the balance over time but not in a lump sum.",
          additionalContext: "I have not previously requested a CDP hearing or an installment agreement for this balance.",
        }
      : {
          taxpayerName: "Devon T. Marchetti",
          taxpayerAddress: "215 Willow Bend Court, Austin, TX 78745",
          agencyName: "Internal Revenue Service",
          agencyAddress: "Internal Revenue Service, PO Box 931100, Louisville, KY 40293-1100",
          issueDescription:
            "This notice proposes an additional $1,940 in tax based on a Form 1099-NEC for $9,200 that it says I did not report. That 1099 was issued in error by a client who double-reported a payment already included on a different 1099 from the same client for the same project. I have both 1099s and my complete invoice records showing only one payment was actually made.",
          additionalContext: "I contacted the client and they have acknowledged the duplicate filing but have not yet corrected it with the IRS.",
        };

    const strategyData: TaxNoticeIntake = isCollection ? { responsePath: "request_cdp_hearing_30day" } : { responsePath: "dispute_with_evidence" };

    const documentFiles = isCollection
      ? [
          { id: "1", name: "Letter_1058_Final_Notice.pdf", category: "The notice itself (all pages)" },
          { id: "2", name: "CP504_Prior_Notice.pdf", category: "Prior correspondence with the agency" },
          { id: "3", name: "Form_12153_Draft.pdf", category: "Financial information (if requesting a payment plan or Offer in Compromise)" },
        ]
      : [
          { id: "1", name: "CP2000_Notice.pdf", category: "The notice itself (all pages)" },
          { id: "2", name: "1099-NEC_Original.pdf", category: "W-2s, 1099s, or other third-party statements for the tax year" },
          { id: "3", name: "1099-NEC_Duplicate.pdf", category: "W-2s, 1099s, or other third-party statements for the tax year" },
          { id: "4", name: "Invoice_Records_2024.pdf", category: "The filed return for the tax year in question" },
        ];

    const stepEntries = steps.map((id, index) => {
      const status = index < currentIndex ? "complete" : index === currentIndex ? "in_progress" : "not_started";
      const data: Record<string, unknown> =
        id === "identify" ? identifyData : id === "intake" ? intakeData : id === "documents" ? { files: documentFiles } : id === "strategy" ? strategyData : {};
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
  };
}

const buildTaxNoticeAssessmentMockMatter = buildTaxNoticeMockMatter("assessment");
const buildTaxNoticeCollectionMockMatter = buildTaxNoticeMockMatter("collection");

function buildCP2000MockMatter(currentStepId: string): StepMatterState {
  const steps = cp2000StepWorkflow.steps.map((s) => s.id);
  const currentIndex = steps.indexOf(currentStepId);

  const intakeData: CP2000Data = {
    taxYear: "2023",
    noticeDate: "2024-03-15",
    responseDeadline: "2024-05-14",
    proposedChangeAmount: "$1,200",
    primaryIssueType: "unreported_income",
    filingStatus: "single",
    taxpayerName: "Jordan Smith",
    mailingAddress: "1234 Oak Ridge Drive, San Diego, CA 92130",
    contactEmail: "jordan.smith@example.com",
    contactPhone: "(619) 555-0123",
    whatHappened: "The IRS indicates a mismatch between the income I reported on my 2023 tax return and information they received from a third party (likely a 1099-MISC).",
    whatResponseSought: "I believe the income was reported in error. I would like to dispute the unreported income and provide supporting documentation to show the correct amount.",
  };

  const noticeDetailsData: CP2000Data = {
    noticeNumber: "CP2000-2024-12345-A",
    ssnLast4: "4821",
    reportedBySource: "1099-MISC, Bank reporting",
    reportedIncome: "$45,000",
    irsReportedIncome: "$52,000",
    irsExplanationSummary: "The IRS believes there is an income mismatch between the income you reported on your 2023 tax return and income reported to the IRS by third parties, such as employers, financial institutions, or other payers (e.g., 1099 forms). Please review the details below and provide a response if you disagree or have additional information.",
    taxReturnFiledDate: "2024-04-18",
    irsResponseAddress: "IRS — Automated Underreporter\nP.O. Box 9019\nHoltsville, NY 11742-9019",
  };

  const documentFiles = [
    { id: "1", name: "CP2000_Notice.pdf", category: "The CP2000 notice itself (all pages)" },
    { id: "2", name: "2023_Tax_Return.pdf", category: "Tax return for the year in question (Form 1040)" },
    { id: "3", name: "1099-MISC.pdf", category: "W-2s, 1099s, or other information returns" },
    { id: "4", name: "Bank_Statement_April.pdf", category: "IRS account transcript" },
  ];

  const responsePositionData: CP2000Data = { responsePosition: "disagree" };
  const analysisData: CP2000Data = { discrepancyResolutions: { amount_mismatch: "user_correct" } };

  const stepEntries = steps.map((id, index) => {
    const status = index < currentIndex ? "complete" : index === currentIndex ? "in_progress" : "not_started";
    const data: Record<string, unknown> =
      id === "intake" ? intakeData
      : id === "notice-details" ? noticeDetailsData
      : id === "documents" ? { files: documentFiles }
      : id === "analysis" ? analysisData
      : id === "response-position" ? responsePositionData
      : {};
    return [id, { status, checklist: [] as ChecklistItemState[], data, completedAt: null }] as const;
  });

  return {
    id: "dev-preview-matter",
    ownerId: "dev-preview-owner",
    workflowId: cp2000StepWorkflow.id,
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
  [transunionDisputeStepWorkflow.id]: transunionDisputeStepWorkflow,
  [experianDisputeStepWorkflow.id]: experianDisputeStepWorkflow,
  [equifaxDisputeStepWorkflow.id]: equifaxDisputeStepWorkflow,
  [taxNoticeStepWorkflow.id]: taxNoticeStepWorkflow,
  [cp2000StepWorkflow.id]: cp2000StepWorkflow,
};

const MOCK_MATTER_BUILDERS: Record<string, MockMatterBuilder> = {
  [transunionDisputeStepWorkflow.id]: buildTransUnionDisputeMockMatter,
  [experianDisputeStepWorkflow.id]: buildExperianDisputeMockMatter,
  [equifaxDisputeStepWorkflow.id]: buildEquifaxDisputeMockMatter,
  [taxNoticeStepWorkflow.id]: buildTaxNoticeAssessmentMockMatter,
  [cp2000StepWorkflow.id]: buildCP2000MockMatter,
};

/** Tax Notice only: which mock scenario to render for `?scenario=`. */
const TAX_NOTICE_SCENARIO_BUILDERS: Record<string, MockMatterBuilder> = {
  assessment: buildTaxNoticeAssessmentMockMatter,
  collection: buildTaxNoticeCollectionMockMatter,
};

const DEFAULT_WORKFLOW_ID = transunionDisputeStepWorkflow.id;

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
  const search = Route.useSearch() as { workflow?: string; scenario?: string };
  const workflowId = resolveWorkflowId(search.workflow);
  const buildMockMatter =
    workflowId === taxNoticeStepWorkflow.id
      ? (TAX_NOTICE_SCENARIO_BUILDERS[search.scenario ?? ""] ?? buildTaxNoticeAssessmentMockMatter)
      : (MOCK_MATTER_BUILDERS[workflowId] ?? MOCK_MATTER_BUILDERS[DEFAULT_WORKFLOW_ID]);
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
    const scenarioParam = search.scenario ? `&scenario=${search.scenario}` : "";
    window.location.href = `/dev/matter-preview/${stepId}?workflow=${workflowId}${scenarioParam}`;
  }

  return (
    <>
      <SiteHeader />
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
