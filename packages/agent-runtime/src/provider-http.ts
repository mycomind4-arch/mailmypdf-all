/** Credential-bearing requests never follow redirects or expose provider error bodies. */
export async function providerJsonRequest(
  url: URL,
  init: RequestInit,
  limits: { timeoutMs?: number; maxBytes?: number; fetch?: typeof fetch } = {},
): Promise<Record<string, unknown>> {
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('PROVIDER_ENDPOINT_INVALID')
  const timeoutMs = limits.timeoutMs ?? 30_000
  const maxBytes = limits.maxBytes ?? 2 * 1024 * 1024
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000
    || !Number.isSafeInteger(maxBytes) || maxBytes < 1024 || maxBytes > 16 * 1024 * 1024) throw new Error('PROVIDER_LIMIT_INVALID')
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs)
  try {
    const response = await (limits.fetch ?? fetch)(url, { ...init, redirect: 'error', signal })
    if (!response.ok) {
      await response.body?.cancel().catch(() => {})
      throw new Error(`PROVIDER_HTTP_${response.status}`)
    }
    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > maxBytes) {
      await response.body?.cancel().catch(() => {})
      throw new Error('PROVIDER_RESPONSE_TOO_LARGE')
    }
    const reader = response.body?.getReader()
    if (!reader) throw new Error('PROVIDER_EMPTY_RESPONSE')
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > maxBytes) { await reader.cancel(); throw new Error('PROVIDER_RESPONSE_TOO_LARGE') }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    const result: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('PROVIDER_RESPONSE_INVALID')
    return result as Record<string, unknown>
  } catch (error) {
    if (signal.aborted) throw new Error('PROVIDER_REQUEST_ABORTED')
    if (error instanceof Error && /^PROVIDER_[A-Z0-9_]+$/.test(error.message)) throw error
    throw new Error('PROVIDER_REQUEST_FAILED')
  }
}
