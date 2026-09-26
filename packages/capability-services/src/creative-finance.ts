export type DealStructureKind = "seller_finance" | "lease_option" | "land_contract" | "subject_to" | "wraparound" | "private_loan";

export type AmortizationInput = {
  principal: number;
  annualRatePercent: number;
  paymentCount: number;
  paymentsPerYear: number;
  balloonAfterPayments?: number;
};

export type AmortizationRow = { paymentNumber: number; payment: number; interest: number; principal: number; balance: number };

export function buildAmortizationSchedule(input: AmortizationInput): readonly AmortizationRow[] {
  if (![input.principal, input.annualRatePercent, input.paymentCount, input.paymentsPerYear].every(Number.isFinite)) throw new Error("Amortization inputs must be finite.");
  if (input.principal <= 0 || input.paymentCount <= 0 || input.paymentsPerYear <= 0 || input.annualRatePercent < 0) throw new Error("Amortization inputs are outside supported ranges.");
  const rate = input.annualRatePercent / 100 / input.paymentsPerYear;
  const payment = rate === 0 ? input.principal / input.paymentCount : input.principal * rate / (1 - Math.pow(1 + rate, -input.paymentCount));
  let balance = input.principal;
  const rows: AmortizationRow[] = [];
  for (let number = 1; number <= input.paymentCount; number += 1) {
    const interest = balance * rate;
    const principal = Math.min(balance, payment - interest);
    balance = Math.max(0, balance - principal);
    rows.push({ paymentNumber: number, payment: principal + interest, interest, principal, balance });
    if (input.balloonAfterPayments === number) break;
  }
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

export function validateDealStructure(input: { kind: DealStructureKind; partyCount: number; hasPropertyOrCollateral: boolean; hasWrittenTerms: boolean }): string[] {
  const errors: string[] = [];
  if (input.partyCount < 2) errors.push("At least two parties are required.");
  if (!input.hasPropertyOrCollateral) errors.push("Property or collateral facts are unresolved.");
  if (!input.hasWrittenTerms) errors.push("Written terms are required before document generation.");
  return errors;
}
