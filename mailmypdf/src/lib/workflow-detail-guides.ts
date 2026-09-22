import type { WorkflowDetailGuide } from "@mailmypdf/workflow-ui"
import { detail as carInsurance } from "../../../appeal-mail/workflows/appeal-car-insurance-claim/detail"
import { detail as deniedClaim } from "../../../appeal-mail/workflows/appeal-denied-claim/detail"
import { detail as dentalInsurance } from "../../../appeal-mail/workflows/appeal-dental-insurance-denial/detail"

/** Curated, source-reviewed authenticated guides. No generic content is invented for unreviewed workflows. */
const guides: Readonly<Record<string, WorkflowDetailGuide>> = {
  "appeal-mail/appeal-car-insurance-claim": carInsurance,
  "appeal-mail/appeal-denied-claim": deniedClaim,
  "appeal-mail/appeal-dental-insurance-denial": dentalInsurance,
}

export function workflowDetailGuide(sectionId: string, workflowId: string): WorkflowDetailGuide | undefined {
  return guides[`${sectionId}/${workflowId}`]
}
