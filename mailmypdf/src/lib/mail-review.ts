import { z } from "zod";

const addressSchema = z.object({
  name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  state: z.string().regex(/^[A-Za-z]{2}$/),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/),
});
export function validMailAddress(address: unknown): boolean {
  return addressSchema.safeParse(address).success;
}
export function validMailEmail(email: string): boolean {
  return z.string().email().max(200).safeParse(email).success;
}

export interface MailReview {
  basis: string;
  reviewed: boolean;
  content: boolean;
}

export function reviewForBasis(review: MailReview, basis: string): MailReview {
  return review.basis === basis ? review : { basis, reviewed: false, content: false };
}

/** Old async results must not replace a newer selection or undo removal. */
export function createLatestRequest() {
  let generation = 0;
  return {
    begin: () => ++generation,
    isCurrent: (request: number) => request === generation,
    cancel: () => {
      generation += 1;
    },
  };
}
