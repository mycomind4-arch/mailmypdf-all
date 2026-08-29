import type { Contact, Company, Address } from "../domain/crm";

export type CorrespondenceParticipant = { contact?: Contact; company?: Company; address: Address };

export function validateMailingParticipant(participant: CorrespondenceParticipant): void {
  if (!participant.contact && !participant.company) throw new Error("A mailing needs a contact or company participant");
  const { address } = participant;
  for (const field of [address.line1, address.city, address.state, address.postalCode, address.country]) {
    if (!field?.trim()) throw new Error("Mailing address is incomplete");
  }
}
