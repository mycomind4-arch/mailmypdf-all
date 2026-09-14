import type { ComponentType } from "react";
import type { StepComponentProps } from "../types";
import { OverviewStep } from "./Overview";
import { IdentifyStep } from "./Identify";
import { IntakeStep } from "./Intake";
import { DocumentsStep } from "./Documents";
import { StrategyStep } from "./Strategy";
import { DraftStep } from "./Draft";
import { ReviewStep } from "./Review";
import { MailStep } from "./Mail";

/**
 * "overview" is a synthetic page (matter dashboard), not one of the 7
 * stepper steps. See the comment on `taxNoticeStepWorkflow` in
 * `domain/step-workflows/tax-notice.ts` for why this workflow has an
 * "Identify" and "Strategy" step that the credit-bureau conversions don't.
 */
export const taxNoticeStepComponents: Record<string, ComponentType<StepComponentProps>> = {
  overview: OverviewStep,
  identify: IdentifyStep,
  intake: IntakeStep,
  documents: DocumentsStep,
  strategy: StrategyStep,
  draft: DraftStep,
  review: ReviewStep,
  mail: MailStep,
};
