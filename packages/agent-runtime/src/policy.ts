export interface ActionPolicy { consequential: boolean; requiresHumanApproval: boolean; reason: string }

const CONSEQUENT_ACTIONS = new Set(['send_mail', 'charge_customer', 'publish', 'change_account', 'grant_access', 'delete_data', 'production_deploy'])

export function evaluateActionPolicy(action: string): ActionPolicy {
  const consequential = CONSEQUENT_ACTIONS.has(action)
  return {
    consequential,
    requiresHumanApproval: consequential,
    reason: consequential ? 'Consequential action requires explicit human approval' : 'Non-consequential action may run autonomously',
  }
}
