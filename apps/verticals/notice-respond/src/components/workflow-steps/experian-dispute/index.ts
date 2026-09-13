import type { ComponentType } from "react";
import type { StepComponentProps } from "../types";
import { OverviewStep } from "./Overview";
import { IntakeStep } from "./Intake";
import { DocumentsStep } from "./Documents";
import { AnalyzeStep } from "./Analyze";
import { DraftStep } from "./Draft";
import { ReviewStep } from "./Review";
import { MailStep } from "./Mail";

/**
 * "overview" is a synthetic page (matter dashboard), not one of the 6
 * stepper steps. There is no separate "Evidence" or "Timeline" step for this
 * workflow — see the comment on `experianDisputeStepWorkflow` in
 * `domain/step-workflows/experian-dispute.ts` for why.
 */
export const experianDisputeStepComponents: Record<string, ComponentType<StepComponentProps>> = {
  overview: OverviewStep,
  intake: IntakeStep,
  documents: DocumentsStep,
  analyze: AnalyzeStep,
  draft: DraftStep,
  review: ReviewStep,
  mail: MailStep,
};
