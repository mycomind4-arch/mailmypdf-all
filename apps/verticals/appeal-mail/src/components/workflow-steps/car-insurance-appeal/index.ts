import type { ComponentType } from "react";
import type { StepComponentProps } from "../types";
import { OverviewStep } from "./Overview";
import { IntakeStep } from "./Intake";
import { DocumentsStep } from "./Documents";
import { AnalyzeStep } from "./Analyze";
import { EvidenceStep } from "./Evidence";
import { DraftStep } from "./Draft";
import { ReviewStep } from "./Review";
import { MailStep } from "./Mail";

/**
 * "overview" is a synthetic page (matter dashboard), not one of the stepper
 * steps. There is no separate "timeline" step for this workflow — a car
 * claim's dates (accident, denial, deadline) are collected in Intake and
 * confirmed in a compact panel at the top of Evidence; see the comment on
 * `carInsuranceAppealStepWorkflow` for why.
 */
export const carInsuranceAppealStepComponents: Record<string, ComponentType<StepComponentProps>> = {
  overview: OverviewStep,
  intake: IntakeStep,
  documents: DocumentsStep,
  analyze: AnalyzeStep,
  evidence: EvidenceStep,
  draft: DraftStep,
  review: ReviewStep,
  mail: MailStep,
};
