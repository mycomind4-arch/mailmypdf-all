import type { CRMStore } from "./crmStore";
import { validateMailingParticipant } from "./contactCorrespondence";
import type { Contact, Company, Address } from "../domain/crm";

export async function resolveParticipant(store: CRMStore, input: { contactId?: string; companyId?: string; address: Address }): Promise<{ contact?: Contact; company?: Company; address: Address }> {
  const contact = input.contactId ? await store.getContact(input.contactId) : undefined;
  const company = input.companyId ? await store.getCompany(input.companyId) : undefined;
  if (input.contactId && !contact) throw new Error("Contact not found");
  if (input.companyId && !company) throw new Error("Company not found");
  const participant = { contact: contact ?? undefined, company: company ?? undefined, address: input.address };
  validateMailingParticipant(participant);
  return participant;
}
