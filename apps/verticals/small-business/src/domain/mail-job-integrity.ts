export type MailJobIntegrityInput = { intentId: string; mailJobId: string; recipientId: string; documentId: string; idempotencyKey: string };

export function validatePreparedMailJob(input: MailJobIntegrityInput): void {
  for (const [name, value] of Object.entries(input)) {
    if (!value || !value.trim()) throw new Error(`${name} is required`);
  }
  if (input.idempotencyKey !== `mailing-intent:${input.intentId}`) throw new Error("Mail job idempotency key does not match mailing intent");
}

export function canQueueMailJob(status: string): boolean {
  return status === "draft" || status === "queued";
}
