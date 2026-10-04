import { providerJsonRequest } from './provider-http.js'
import type { TriggerTaskClient, TriggerTaskHandle } from './trigger-adapter.js'

export interface TriggerHttpTaskClientConfig {
  /** One deployed generic task routes only reviewed platform tasks internally. */
  registeredTaskId: string
  secretKey: string
  endpoint?: string
  timeoutMs?: number
  fetch?: typeof fetch
}
/** Real Trigger.dev REST binding for the existing vendor-neutral client contract. */
export class TriggerHttpTaskClient implements TriggerTaskClient {
  private readonly endpoint: URL
  constructor(private readonly config: TriggerHttpTaskClientConfig) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(config.registeredTaskId)) throw new Error('TRIGGER_TASK_ID_INVALID')
    if (!config.secretKey.trim() || /[\r\n]/.test(config.secretKey)) throw new Error('TRIGGER_KEY_REQUIRED')
    this.endpoint = new URL(config.endpoint ?? 'https://api.trigger.dev')
    if (this.endpoint.protocol !== 'https:' || this.endpoint.username || this.endpoint.password
      || this.endpoint.search || this.endpoint.hash || this.endpoint.pathname !== '/') throw new Error('TRIGGER_ENDPOINT_INVALID')
  }
  async trigger(taskId: string, payload: unknown, options?: { idempotencyKey?: string }): Promise<TriggerTaskHandle> {
    if (!taskId.trim() || taskId.length > 256 || !options?.idempotencyKey?.trim() || options.idempotencyKey.length > 256) {
      throw new Error('TRIGGER_IDENTITY_REQUIRED')
    }
    const result = await providerJsonRequest(new URL(`/api/v1/tasks/${this.config.registeredTaskId}/trigger`, this.endpoint), {
      method: 'POST', headers: { Authorization: `Bearer ${this.config.secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: { taskId, payload }, options: { idempotencyKey: options.idempotencyKey } }),
    }, { timeoutMs: this.config.timeoutMs, maxBytes: 64 * 1024, fetch: this.config.fetch })
    if (typeof result.id !== 'string' || !result.id.trim() || result.id.length > 256) throw new Error('TRIGGER_RESPONSE_INVALID')
    return { id: result.id }
  }
}
