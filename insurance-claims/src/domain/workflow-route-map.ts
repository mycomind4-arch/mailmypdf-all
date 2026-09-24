import type { InsuranceWorkflowId } from "./insurance-workflows.js"

export const INSURANCE_WORKFLOW_ROUTE_TO_ID = {
  "prepare-insurance-claim": "new-claim",
  "homeowners-insurance-claim": "homeowners-claim",
  "auto-insurance-claim": "auto-claim",
  "commercial-property-claim": "commercial-property-claim",
  "renters-insurance-claim": "renters-insurance-claim",
  "denied-insurance-claim": "denied-claim",
  "denied-home-claim": "denied-home-claim",
  "denied-auto-insurance-claim": "auto-claim-denial",
  "denied-life-insurance-claim": "life-insurance-denial",
  "medical-insurance-denial": "health-medical-denial",
  "disability-insurance-denial": "disability-claim-denial",
  "workers-comp-denial": "workers-comp-denial",
  "medical-necessity-appeal": "medical-necessity-appeal",
  "prior-auth-denial": "prior-auth-denial",
  "out-of-network-denial": "out-of-network-denial",
  "water-damage-insurance-claim": "water-damage-claim",
  "roof-damage-insurance-claim": "roof-damage-claim",
  "fire-smoke-damage-claim": "fire-smoke-claim",
  "property-damage-insurance-claim": "property-damage-claim",
  "hail-damage-insurance-claim": "hail-damage-claim",
  "theft-vandalism-claim": "theft-vandalism-claim",
  "mold-damage-claim": "mold-damage-claim",
  "flood-damage-insurance-claim": "flood-damage-claim",
  "underpaid-insurance-claim": "underpaid-claim",
  "dispute-insurance-claim": "claim-dispute",
  "coverage-denial": "coverage-denial",
  "insurance-claim-appeal": "insurance-appeal",
  "supplemental-claim": "supplemental-claim",
  "business-interruption-claim": "business-interruption-claim",
  "total-loss-claim": "total-loss-claim",
} as const satisfies Record<string, InsuranceWorkflowId>

export type InsuranceWorkflowRouteSlug =
  keyof typeof INSURANCE_WORKFLOW_ROUTE_TO_ID

export function resolveInsuranceWorkflowId(
  routeSlug: string,
): InsuranceWorkflowId | undefined {
  return INSURANCE_WORKFLOW_ROUTE_TO_ID[
    routeSlug as InsuranceWorkflowRouteSlug
  ]
}

export function routeSlugForInsuranceWorkflow(
  workflowId: InsuranceWorkflowId,
): InsuranceWorkflowRouteSlug | undefined {
  for (const [routeSlug, id] of Object.entries(
    INSURANCE_WORKFLOW_ROUTE_TO_ID,
  )) {
    if (id === workflowId) {
      return routeSlug as InsuranceWorkflowRouteSlug
    }
  }

  return undefined
}
