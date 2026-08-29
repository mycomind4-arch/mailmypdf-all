export interface IdempotencyStore { seen(key: string): Promise<boolean>; mark(key: string): Promise<void> }
export async function once<T>(store: IdempotencyStore, key: string, work: () => Promise<T>): Promise<T | undefined> {
  if (await store.seen(key)) return undefined
  const result = await work()
  await store.mark(key)
  return result
}
