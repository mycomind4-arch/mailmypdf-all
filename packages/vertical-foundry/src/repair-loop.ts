export interface RepairAttempt { iteration: number; blockers: string[]; resolved: string[] }

export function nextRepairAttempt(previous: RepairAttempt | undefined, blockers: readonly string[]): RepairAttempt {
  const iteration = (previous?.iteration ?? 0) + 1
  return { iteration, blockers: [...blockers], resolved: previous?.blockers.filter((b) => !blockers.includes(b)) ?? [] }
}

export function assertRepairBudget(attempt: RepairAttempt, maxIterations = 5): void {
  if (attempt.iteration > maxIterations) throw new Error(`Repair budget exceeded: ${maxIterations}`)
}
