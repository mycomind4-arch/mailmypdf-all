import { scanRecoveryTransactions, type RecoveryTransaction } from '@mailmypdf/intelligence';

/** No persistence or provider lookup. This screens only data supplied in this authenticated request. */
export function screenProvidedRecoveryTransactions(args: Record<string, unknown>) {
  if (Object.keys(args).some((key) => key !== 'transactions') || !Array.isArray(args.transactions) || args.transactions.length > 2000) {
    throw new Error('transactions must be an array of at most 2000 explicitly supplied records');
  }
  const allowed = ['id', 'accountId', 'merchant', 'amountMinor', 'currency', 'postedAt', 'state', 'kind', 'invoiceId', 'reversesTransactionId'];
  const transactions = args.transactions.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Each transaction must be an object');
    const row = value as Record<string, unknown>;
    if (Object.keys(row).some((key) => !allowed.includes(key))) throw new Error('Transactions must omit credentials, account numbers, and unsupported fields');
    // The shared scanner performs field/value validation before any grouping.
    return row as unknown as RecoveryTransaction;
  });
  const scan = scanRecoveryTransactions(transactions);
  return {
    scan,
    dataSource: 'user-provided-transactions',
    reviewRequired: true,
    externalActionsAuthorized: false,
    note: 'These are possible duplicate charges, not confirmed money owed. Review original purchases, invoice links, and refund evidence before starting a case. No accounts were accessed and no correspondence was sent.',
    nextAction: scan.candidates.length ? 'Review each candidate with the user. Once evidence confirms the problem, find a certified workflow; if none is available, prepare a draft for review without inventing an executable workflow.' : 'No duplicate-charge candidate matched these records. This scan does not rule out other billing or recovery problems.',
  };
}
