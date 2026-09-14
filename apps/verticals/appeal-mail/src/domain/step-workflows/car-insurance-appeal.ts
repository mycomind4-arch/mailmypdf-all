import type { ChecklistItemState, StepMatterState, StepWorkflowDefinition } from "@mailmypdf/step-workflow";
import { CAR_INSURANCE_APPEAL_PRICING } from "@/domain/car-insurance-appeal-pricing";

/**
 * Steps deliberately differ in count from Administrative Decision Appeal's
 * 8-step template: that template's shape is not a mandatory contract, and a
 * car-insurance claim appeal doesn't carry the same kind of procedural
 * chronology an administrative or benefits appeal does. There is no separate
 * "Timeline" step here — a car claim's dates are just three data points
 * (accident date, denial date, appeal deadline), all already collected in
 * Intake, with nothing to chronologically build beyond confirming them. That
 * confirmation lives as a compact "Key dates" panel at the top of the
 * Evidence step instead of consuming its own step. What a car-insurance
 * appeal DOES need its own step for is exactly what Evidence already
 * provides: organizing the three disputes a claim denial actually turns on
 * (liability, damage/repair valuation, coverage/policy language).
 */
export const carInsuranceAppealStepWorkflow: StepWorkflowDefinition = {
  id: "car-insurance-appeal",
  title: "Car Insurance Appeal",
  steps: [
    { id: "intake", label: "Intake" },
    { id: "documents", label: "Documents" },
    { id: "analyze", label: "Analyze" },
    { id: "evidence", label: "Evidence" },
    { id: "draft", label: "Draft" },
    { id: "review", label: "Review" },
    { id: "mail", label: "Mail" },
  ],
  requiresApprovalBeforeStep: "mail",
};

/**
 * Intake fields collected in the "Matter intake" step — shape of
 * steps.intake.data. Distinct from Administrative Decision Appeal's fields:
 * an auto-claim denial turns on the claim/policy identifiers, the insurer's
 * liability determination, the damage/repair figures, and the specific
 * denial reason — not a generic "decision summary". Field names mirror what
 * the real `/api/workflows/car-insurance-appeal/analyze` endpoint's AI
 * extraction schema captures (claimNumber, policyNumber, adjusterName,
 * accidentDate, liabilityFinding, denialReasons, damageFinding,
 * repairEstimateAmount, policeReportNumber) so a future wiring of that
 * endpoint into this step maps directly onto this shape.
 */
export type CarInsuranceAppealIntake = {
  insurer?: string;
  claimNumber?: string;
  policyNumber?: string;
  adjusterName?: string;
  accidentDate?: string;
  decisionDate?: string;
  deadline?: string;
  liabilityDetermination?: string;
  denialReason?: string;
  damageDescription?: string;
  repairEstimateAmount?: string;
  policeReportNumber?: string;
  requestedOutcome?: string;
};

/**
 * The "Readiness checklist" shown in the right rail is the same core-matter
 * completeness check on every screen — derived from the intake step's data,
 * not tied to whichever step is currently open (same pattern as
 * Administrative Decision Appeal's readiness list).
 */
export function getCarInsuranceAppealReadiness(matter: StepMatterState): ChecklistItemState[] {
  const intake = (matter.steps.intake?.data ?? {}) as CarInsuranceAppealIntake;
  return [
    { id: "insurer", label: "Insurer and claim number", done: Boolean(intake.insurer && intake.claimNumber) },
    { id: "policy", label: "Policy number", done: Boolean(intake.policyNumber) },
    { id: "accidentDate", label: "Accident and decision dates", done: Boolean(intake.accidentDate && intake.decisionDate) },
    { id: "deadline", label: "Appeal deadline", done: Boolean(intake.deadline) },
    { id: "liability", label: "Liability determination", done: Boolean(intake.liabilityDetermination) },
    { id: "denialReason", label: "Denial reason", done: Boolean(intake.denialReason) },
    { id: "damage", label: "Damage description and repair estimate", done: Boolean(intake.damageDescription) },
    { id: "outcome", label: "Requested outcome", done: Boolean(intake.requestedOutcome) },
  ];
}

/**
 * The "Estimated mailing package" summary is the same across every screen.
 * Pulled from the real pricing profile (CAR_INSURANCE_APPEAL_PRICING, backed
 * by the canonical @mailmypdf/pricing catalog entry for
 * "car-insurance-appeal") rather than hardcoded numbers, so it can't drift
 * from what checkout actually charges.
 */
export const carInsuranceAppealMailingPackage = [
  { label: "Response letter to the insurer's claims department" },
  { label: "Evidence summary (liability, damage, and coverage disputes)" },
  { label: "Supporting exhibits (police report, repair estimate, photos)" },
  {
    label: `Preparation fee ($${CAR_INSURANCE_APPEAL_PRICING.preparationFee.toFixed(2)}, includes ${CAR_INSURANCE_APPEAL_PRICING.includedResponsePages} response pages)`,
  },
  { label: "Proof of delivery (certified mail)" },
];
