import { z } from "zod";
import type { CRMStore } from "../services/crmStore";

const contactSchema = z.object({
  businessId: z.string().min(1), firstName: z.string().trim().min(1), lastName: z.string().trim().min(1),
  email: z.string().email().optional(), phone: z.string().optional(), title: z.string().optional(), companyId: z.string().optional(),
});

export function createContactHandler(store: CRMStore) {
  return async (body: unknown) => store.createContact(contactSchema.parse(body));
}

const companySchema = z.object({ businessId: z.string().min(1), name: z.string().trim().min(1), email: z.string().email().optional(), phone: z.string().optional(), website: z.string().url().optional() });
export function createCompanyHandler(store: CRMStore) {
  return async (body: unknown) => store.createCompany(companySchema.parse(body));
}
