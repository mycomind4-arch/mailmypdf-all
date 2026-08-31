import type { MailMyPDFFulfillment } from './fulfillment'

const runtimeKey = '__MAILMYPDF_RECORDS_FULFILLMENT__'

type RuntimeGlobal = typeof globalThis & {
  [runtimeKey]?: MailMyPDFFulfillment
}

export function getMailMyPDFFulfillment(): MailMyPDFFulfillment | null {
  return (globalThis as RuntimeGlobal)[runtimeKey] ?? null
}

export function installMailMyPDFFulfillment(adapter: MailMyPDFFulfillment): void {
  ;(globalThis as RuntimeGlobal)[runtimeKey] = adapter
}
