/**
 * AppealReply Mail Appeal — Phase D integration
 *
 * Takes the finalized appeal letter + sender/recipient addresses + email
 * and creates a MailMyPDF order via the existing MailService.
 *
 * This is the bridge between AppealReply (intelligence + drafting) and
 * MailMyPDF (physical mailing + proof of delivery). It does NOT duplicate
 * any mailing logic — it reuses MailService.createOrderFromLetter().
 *
 * After the order is created, the user proceeds to Stripe checkout via
 * the existing /orders/:id flow, exactly like a regular letter order.
 */

import { z } from "zod";

// ── Input ─────────────────────────────────────────────────────────────────────

const addressSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  line1: z.string().min(1, "Street address is required").max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().length(2, "State must be a 2-letter abbreviation"),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, "ZIP must be 5 or 9 digits"),
});

const mailClassSchema = z.enum(["standard", "certified", "registered"]);

export const MailAppealInputSchema = z.object({
  email: z.string().email("Valid email is required"),
  letterText: z.string().min(1, "Letter text is required").max(20_000),
  sender: addressSchema,
  recipient: addressSchema,
  mailClass: mailClassSchema.default("certified"),
  // Idempotency key — prevents duplicate order creation from double-clicks
  // or browser retries. The endpoint uses this to short-circuit duplicate
  // submissions for the same letter content + email.
  idempotencyKey: z.string().min(8).max(128).optional(),
});
export type MailAppealInput = z.infer<typeof MailAppealInputSchema>;

// ── Output ────────────────────────────────────────────────────────────────────

export const MailAppealResultSchema = z.object({
  orderId: z.string().uuid(),
  token: z.string(),
  pageCount: z.number().int().positive(),
  priceCents: z.number().int().positive(),
  mailClass: mailClassSchema,
  checkoutUrl: z.string(),
});
export type MailAppealResult = z.infer<typeof MailAppealResultSchema>;
