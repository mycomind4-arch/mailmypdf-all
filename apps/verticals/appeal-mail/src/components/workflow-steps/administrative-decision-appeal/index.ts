import type { ComponentType } from "react";
import type { StepComponentProps } from "../types";
import { OverviewStep } from "./Overview";
import { IntakeStep } from "./Intake";
import { DocumentsStep } from "./Documents";
import { AnalyzeStep } from "./Analyze";
import { EvidenceStep } from "./Evidence";
import { TimelineStep } from "./Timeline";
import { DraftStep } from "./Draft";
import { ReviewStep } from "./Review";
import { MailStep } from "./Mail";

/** "overview" is a synthetic page (matter dashboard), not one of the 8 stepper steps. */
export const administrativeDecisionAppealStepComponents: Record<string, ComponentType<StepComponentProps>> = {
  overview: OverviewStep,
  intake: IntakeStep,
  documents: DocumentsStep,
  analyze: AnalyzeStep,
  evidence: EvidenceStep,
  timeline: TimelineStep,
  draft: DraftStep,
  review: ReviewStep,
  mail: MailStep,
};
