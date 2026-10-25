export interface BatchDiscountTier {
  minPieces: number;
  discountBps: number;
}

export interface BatchDiscountPolicy {
  tiers: readonly BatchDiscountTier[];
}

export const DEFAULT_BATCH_DISCOUNT_POLICY: BatchDiscountPolicy = {
  tiers: [
    { minPieces: 2, discountBps: 500 },
    { minPieces: 10, discountBps: 1000 },
    { minPieces: 50, discountBps: 1500 },
  ],
};

export interface BatchMailingPrice {
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  discountBps: number;
  discountCents: number;
  totalCents: number;
}

export function calculateBatchMailingPrice(input: {
  unitPriceCents: number;
  quantity: number;
  policy?: BatchDiscountPolicy;
}): BatchMailingPrice {
  if (!Number.isSafeInteger(input.unitPriceCents) || input.unitPriceCents < 0) {
    throw new Error("unitPriceCents must be a non-negative integer");
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 10_000) {
    throw new Error("quantity must be an integer from 1 to 10,000");
  }

  const policy = input.policy ?? DEFAULT_BATCH_DISCOUNT_POLICY;
  for (const tier of policy.tiers) {
    if (!Number.isSafeInteger(tier.minPieces) || tier.minPieces < 2 ||
        !Number.isSafeInteger(tier.discountBps) || tier.discountBps < 0 || tier.discountBps > 10_000) {
      throw new Error("Invalid batch discount tier");
    }
  }

  const applicable = [...policy.tiers]
    .filter((tier) => input.quantity >= tier.minPieces)
    .sort((a, b) => b.minPieces - a.minPieces)[0];

  const subtotalCents = input.unitPriceCents * input.quantity;
  if (!Number.isSafeInteger(subtotalCents)) throw new Error("Batch subtotal exceeds safe integer range");
  const discountBps = applicable?.discountBps ?? 0;
  const discountCents = Math.floor((subtotalCents * discountBps) / 10_000);
  const totalCents = subtotalCents - discountCents;

  return {
    quantity: input.quantity,
    unitPriceCents: input.unitPriceCents,
    subtotalCents,
    discountBps,
    discountCents,
    totalCents,
  };
}
