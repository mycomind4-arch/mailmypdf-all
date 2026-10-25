import assert from 'node:assert/strict'
import test from 'node:test'
import { scanRecoveryTransactions, type RecoveryTransaction } from '../src/recovery-scan.js'
const tx = (id: string, patch: Partial<RecoveryTransaction> = {}): RecoveryTransaction => ({ id, accountId: 'account-1', merchant: 'Merchant Inc.', amountMinor: 8900, currency: 'USD', postedAt: '2026-10-01T12:00:00Z', state: 'settled', kind: 'debit', ...patch })
test('scanner identifies possible duplicates and never promises money owed', () => {
  const result = scanRecoveryTransactions([tx('1'), tx('2'), tx('3')])
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0]?.confidence, 'needs-review')
  assert.equal(result.potentialByCurrency.USD, 17800)
  assert.deepEqual(result.candidates[0]?.duplicateTransactionIds, ['2', '3'])
})
test('verified invoice identity provides stronger evidence while preserving separate purchases', () => {
  const result = scanRecoveryTransactions([tx('1', { invoiceId: 'invoice-1' }), tx('2', { invoiceId: 'invoice-1', postedAt: '2026-10-03T18:00:00Z' }), tx('3', { invoiceId: 'invoice-2' })])
  assert.equal(result.candidates[0]?.confidence, 'strong-evidence')
  assert.deepEqual(result.candidates[0]?.transactionIds, ['1', '2'])
})
test('pending authorizations, reversed payments, and explicitly refunded charges are excluded', () => {
  const result = scanRecoveryTransactions([tx('1'), tx('2'), tx('3', { state: 'pending' }), tx('4', { state: 'reversed' }), tx('refund', { kind: 'credit', reversesTransactionId: '2' })])
  assert.equal(result.candidates.length, 0); assert.equal(result.excluded, 4)
})
test('partial refunds reduce candidate value and refunds never cross accounts or currencies', () => {
  const result = scanRecoveryTransactions([tx('1'), tx('2'), tx('refund', { kind: 'credit', amountMinor: 1000, reversesTransactionId: '2' }), tx('bad-refund', { kind: 'credit', accountId: 'other', reversesTransactionId: '2' })])
  assert.equal(result.potentialByCurrency.USD, 7900)
})
test('a refund on either duplicate reduces the net excess and fully refunded excess disappears', () => {
  for (const reversed of ['1', '2']) {
    const result = scanRecoveryTransactions([tx('1'), tx('2'), tx('refund', { kind: 'credit', amountMinor: 1000, reversesTransactionId: reversed })])
    assert.equal(result.potentialByCurrency.USD, 7900)
  }
  const result = scanRecoveryTransactions([tx('1'), tx('2'), tx('r1', { kind: 'credit', amountMinor: 5000, reversesTransactionId: '1' }), tx('r2', { kind: 'credit', amountMinor: 5000, reversesTransactionId: '2' })])
  assert.equal(result.candidates.length, 0)
})
test('currency totals remain separate and account boundaries are retained', () => {
  const result = scanRecoveryTransactions([tx('u1'), tx('u2'), tx('e1', { currency: 'EUR' }), tx('e2', { currency: 'EUR' }), tx('other', { accountId: 'other' })])
  assert.deepEqual(result.potentialByCurrency, { USD: 8900, EUR: 8900 })
})
test('time windows do not chain across unrelated purchases and source ordering is deterministic', () => {
  const rows = [tx('1'), tx('2', { postedAt: '2026-10-03T00:00:00Z' }), tx('3', { postedAt: '2026-10-04T12:00:00Z' })]
  assert.deepEqual(scanRecoveryTransactions(rows), scanRecoveryTransactions([...rows].reverse()))
  assert.deepEqual(scanRecoveryTransactions(rows).candidates[0]?.transactionIds, ['1', '2'])
})
test('duplicate source IDs, noninteger money, invalid dates, and unsafe amounts fail closed', () => {
  assert.throws(() => scanRecoveryTransactions([tx('1'), tx('1')]), /SOURCE_ID/)
  assert.throws(() => scanRecoveryTransactions([tx('1', { amountMinor: 1.2 })]), /INVALID/)
  assert.throws(() => scanRecoveryTransactions([tx('1', { postedAt: 'invalid' })]), /INVALID/)
  assert.throws(() => scanRecoveryTransactions([tx('1', { amountMinor: Number.MAX_SAFE_INTEGER }), tx('2', { amountMinor: Number.MAX_SAFE_INTEGER }), tx('3', { amountMinor: Number.MAX_SAFE_INTEGER })]), /OVERFLOW/)
})
