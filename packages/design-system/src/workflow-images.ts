/**
 * Canonical visuals for workflows that are actually connected to the new
 * execution architecture. Placeholder/catalog-only workflows intentionally do
 * not resolve to an image, so visual availability never implies executability.
 */
const EXECUTABLE_WORKFLOW_IMAGE_IDS = new Set([
  'appeal-car-insurance-claim',
  'appeal-denied-claim',
  'appeal-dental-insurance-denial',
  'appeal-insurance-claim-denial',
  'appeal-insurance-coverage-denial',
  'appeal-life-insurance-denial',
  'appeal-medical-insurance-denial',
  'appeal-medical-necessity-denial',
  'appeal-out-of-network-denial',
  'appeal-prior-authorization-denial',
  'appeal-ssdi-denial',
  'appeal-ssi-denial',
  'appeal-timely-filing-denial',
  'immigration-filing-cover-letter',
  'cp2000-response',
  'cp504-response',
  'agency-records-request',
  'government-documents-request',
  'open-records-request',
  'public-information-request',
  'public-records-request',
])

export function getWorkflowImageSrc(workflowId: string): string | undefined {
  return EXECUTABLE_WORKFLOW_IMAGE_IDS.has(workflowId)
    ? `/workflow-images/${workflowId}.png`
    : undefined
}

export const executableWorkflowImageIds = [...EXECUTABLE_WORKFLOW_IMAGE_IDS] as const
