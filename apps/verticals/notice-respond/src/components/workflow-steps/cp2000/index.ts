import type { ComponentType } from "react";
import type { StepComponentProps } from "../types";
import { OverviewStep } from "./Overview";
import { IntakeStep } from "./Intake";
import { NoticeDetailsStep } from "./NoticeDetails";
import { DocumentsStep } from "./Documents";
import { AnalysisStep } from "./Analysis";
import { ResponsePositionStep } from "./ResponsePosition";
import { DraftStep } from "./Draft";
import { ReviewStep } from "./Review";
import { MailStep } from "./Mail";

export const cp2000StepComponents: Record<string, ComponentType<StepComponentProps>> = {
  overview: OverviewStep,
  intake: IntakeStep,
  "notice-details": NoticeDetailsStep,
  documents: DocumentsStep,
  analysis: AnalysisStep,
  "response-position": ResponsePositionStep,
  draft: DraftStep,
  review: ReviewStep,
  mail: MailStep,
};
