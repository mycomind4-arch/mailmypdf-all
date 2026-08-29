export interface FactValidationResult { valid: boolean; missing: string[] }

export function validateRequiredFacts(requiredFacts: string[], facts: Record<string, unknown>): FactValidationResult {
  const missing = requiredFacts.filter((key) => {
    const value = facts[key]
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  })
  return { valid: missing.length === 0, missing }
}
