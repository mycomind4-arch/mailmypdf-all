export interface MailingCharge {
  orderId: string;
  amountCents: number;
  currency: "usd";
  status: "pending" | "paid" | "failed" | "refunded";
}

/** Physical mailing is intentionally independent from platform usage billing. */
export function isMailingCharge(charge: MailingCharge) {
  return charge.currency === "usd" && charge.amountCents >= 0;
}
