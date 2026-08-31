import { describe, expect, it } from "vitest";
import { assemblePacket } from "./packet";
import { hashDraft, hashRecipient, verifyIntegrity, type MailingIntent } from "@mailmypdf/payment-fulfillment";

const recipient = { name: "IRS Appeals Office", address1: "5000 Ellin Rd", city: "Lanham", state: "MD", zip: "20706" };

describe("assemblePacket integrity hashing", () => {
  it("stamps approvedDraftHash / approvedRecipientHash that match the shared fulfillment engine's own hash functions", () => {
    const packet = assemblePacket({
      appealId: "appeal-1",
      finalLetter: "Dear Appeals Office, I am writing to appeal...",
      evidence: [],
      recipient,
      mailingMethod: "certified",
    });

    expect(packet.approvedDraftHash).toBe(hashDraft("Dear Appeals Office, I am writing to appeal..."));
    expect(packet.approvedRecipientHash).toBe(hashRecipient(recipient));
  });

  it("produces a packet whose hashes pass the fulfillment engine's verifyIntegrity() unmodified", () => {
    const finalLetter = "Dear Appeals Office, this is my final appeal letter.";
    const packet = assemblePacket({ appealId: "appeal-2", finalLetter, evidence: [], recipient, mailingMethod: "standard" });

    const intent: MailingIntent = {
      id: "appeal-2",
      owner_id: "user-1",
      workflow_id: "government-decision",
      case_id: "appeal-2",
      approval_id: null,
      draft_content: packet.finalLetter,
      recipient: { ...recipient },
      mailing_method: "first_class",
      matter_reference: "appeal-2",
      matter_type: "government-decision",
      approved_draft_hash: packet.approvedDraftHash,
      approved_recipient_hash: packet.approvedRecipientHash,
      stripe_session_id: null,
      stripe_payment_intent_id: null,
      stripe_price_cents: null,
      status: "approved",
      provider_order_id: null,
      tracking_number: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(verifyIntegrity(intent).ok).toBe(true);
  });

  it("fails verifyIntegrity() if the draft is tampered with after approval", () => {
    const finalLetter = "Original approved letter text.";
    const packet = assemblePacket({ appealId: "appeal-3", finalLetter, evidence: [], recipient, mailingMethod: "standard" });

    const tamperedIntent: MailingIntent = {
      id: "appeal-3",
      owner_id: "user-1",
      workflow_id: "government-decision",
      case_id: "appeal-3",
      approval_id: null,
      draft_content: "This text was changed after approval!",
      recipient: { ...recipient },
      mailing_method: "first_class",
      matter_reference: "appeal-3",
      matter_type: "government-decision",
      approved_draft_hash: packet.approvedDraftHash,
      approved_recipient_hash: packet.approvedRecipientHash,
      stripe_session_id: null,
      stripe_payment_intent_id: null,
      stripe_price_cents: null,
      status: "approved",
      provider_order_id: null,
      tracking_number: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = verifyIntegrity(tamperedIntent);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/does not match the approved draft/);
  });
});
