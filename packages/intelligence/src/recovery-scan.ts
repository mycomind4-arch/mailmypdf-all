/** Deterministic screening of explicitly authorized transaction data, not an entitlement decision. */
export interface RecoveryTransaction {
  id: string
  accountId: string
  merchant: string
  amountMinor: number
  currency: string
  postedAt: string
  state: 'settled' | 'pending' | 'reversed'
  kind: 'debit' | 'credit'
  /** Set only from a verified invoice/receipt, never guessed from the amount. */
  invoiceId?: string
  /** Explicit provider/evidence link; never infer a refund from amount alone. */
  reversesTransactionId?: string
}
export interface RecoveryCandidate {
  id: string
  type: 'possible-duplicate-charge'
  merchant: string
  accountId: string
  amountMinor: number
  currency: string
  confidence: 'strong-evidence' | 'needs-review'
  transactionIds: readonly string[]
  duplicateTransactionIds: readonly string[]
  reason: string
  nextStep: string
}
export interface RecoveryScan {
  candidates: readonly RecoveryCandidate[]
  /** Candidate ceiling by currency; this is neither money owed nor guaranteed recovery. */
  potentialByCurrency: Readonly<Record<string, number>>
  considered: number
  excluded: number
}
function required(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 512) throw new Error('RECOVERY_TRANSACTION_INVALID')
  return value.trim()
}
function merchantKey(value: string): string {
  return required(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}
export function scanRecoveryTransactions(transactions: readonly RecoveryTransaction[], options: { duplicateWindowHours?: number } = {}): RecoveryScan {
  if (!Array.isArray(transactions) || transactions.length > 50_000) throw new Error('RECOVERY_SCAN_TOO_LARGE')
  const windowHours = options.duplicateWindowHours ?? 48
  if (!Number.isSafeInteger(windowHours) || windowHours < 1 || windowHours > 168) throw new Error('RECOVERY_WINDOW_INVALID')
  const windowMs = windowHours * 3_600_000
  const identities = new Set<string>()
  const byId = new Map<string, RecoveryTransaction>()
  for (const transaction of transactions) {
    required(transaction.id); required(transaction.accountId); required(transaction.merchant)
    if (identities.has(transaction.id)) throw new Error('RECOVERY_DUPLICATE_SOURCE_ID')
    identities.add(transaction.id)
    if (!Number.isSafeInteger(transaction.amountMinor) || transaction.amountMinor <= 0 || !/^[A-Z]{3}$/.test(transaction.currency)
      || typeof transaction.postedAt !== 'string' || !Number.isFinite(Date.parse(transaction.postedAt)) || !['settled', 'pending', 'reversed'].includes(transaction.state)
      || !['debit', 'credit'].includes(transaction.kind)) throw new Error('RECOVERY_TRANSACTION_INVALID')
    if (transaction.invoiceId !== undefined) required(transaction.invoiceId)
    if (transaction.reversesTransactionId !== undefined) required(transaction.reversesTransactionId)
    byId.set(transaction.id, transaction)
  }
  const refunds = new Map<string, number>()
  for (const transaction of transactions) {
    if (transaction.kind !== 'credit' || transaction.state !== 'settled' || !transaction.reversesTransactionId) continue
    const original = byId.get(transaction.reversesTransactionId)
    if (!original || original.kind !== 'debit' || original.accountId !== transaction.accountId || original.currency !== transaction.currency) continue
    const total = (refunds.get(original.id) ?? 0) + transaction.amountMinor
    if (!Number.isSafeInteger(total)) throw new Error('RECOVERY_AMOUNT_OVERFLOW')
    refunds.set(original.id, total)
  }
  const eligible = transactions.filter((transaction) => transaction.kind === 'debit' && transaction.state === 'settled'
    && (refunds.get(transaction.id) ?? 0) < transaction.amountMinor)
  const buckets = new Map<string, RecoveryTransaction[]>()
  for (const transaction of eligible) {
    const merchant = merchantKey(transaction.merchant)
    if (!merchant) throw new Error('RECOVERY_MERCHANT_INVALID')
    const key = JSON.stringify([transaction.accountId, merchant, transaction.currency, transaction.amountMinor, transaction.invoiceId ?? null])
    const bucket = buckets.get(key) ?? []; bucket.push(transaction); buckets.set(key, bucket)
  }
  const candidates: RecoveryCandidate[] = []
  const totals: Record<string, number> = {}
  const emit = (group: RecoveryTransaction[]) => {
    if (group.length < 2) return
    const first = group[0]!
    const duplicates = group.slice(1)
    const remaining = group.reduce((sum, item) => sum + item.amountMinor - (refunds.get(item.id) ?? 0), 0)
    if (!Number.isSafeInteger(remaining)) throw new Error('RECOVERY_AMOUNT_OVERFLOW')
    const amountMinor = Math.max(0, remaining - first.amountMinor)
    if (amountMinor === 0) return
    if (!Number.isSafeInteger(amountMinor) || !Number.isSafeInteger((totals[first.currency] ?? 0) + amountMinor)) throw new Error('RECOVERY_AMOUNT_OVERFLOW')
    totals[first.currency] = (totals[first.currency] ?? 0) + amountMinor
    const strong = Boolean(first.invoiceId)
    candidates.push({
      id: `duplicate:${encodeURIComponent(first.id)}`, type: 'possible-duplicate-charge', merchant: first.merchant,
      accountId: first.accountId, amountMinor, currency: first.currency,
      confidence: strong ? 'strong-evidence' : 'needs-review', transactionIds: group.map((item) => item.id), duplicateTransactionIds: duplicates.map((item) => item.id),
      reason: strong ? 'Multiple settled charges reference the same verified invoice, merchant, account, currency, and amount.'
        : 'Multiple settled charges share a merchant, account, currency, and amount within the review window; separate purchases remain possible.',
      nextStep: 'Review invoices, purchases, and refund evidence before creating a recovery case. Do not send a dispute automatically.',
    })
  }
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt) || a.id.localeCompare(b.id))
    let group: RecoveryTransaction[] = []
    for (const transaction of bucket) {
      // Invoice identity is stronger than timing. No invoice: anchor windows to avoid transitive chains.
      if (group.length && !transaction.invoiceId && Date.parse(transaction.postedAt) - Date.parse(group[0]!.postedAt) > windowMs) {
        emit(group); group = []
      }
      group.push(transaction)
    }
    emit(group)
  }
  candidates.sort((a, b) => a.currency.localeCompare(b.currency) || b.amountMinor - a.amountMinor || a.id.localeCompare(b.id))
  return { candidates, potentialByCurrency: totals, considered: eligible.length, excluded: transactions.length - eligible.length }
}
