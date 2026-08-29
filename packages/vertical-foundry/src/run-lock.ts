export interface RunLockProvider { acquire(key: string): Promise<boolean>; release(key: string): Promise<void> }

export async function withRunLock<T>(provider: RunLockProvider, key: string, work: () => Promise<T>): Promise<T> {
  if (!(await provider.acquire(key))) throw new Error(`Foundry run already active: ${key}`)
  try { return await work() } finally { await provider.release(key) }
}
