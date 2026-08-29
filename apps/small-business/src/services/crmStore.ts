import type { Business, Company, Contact, Address } from "../domain/crm";

export interface CRMStore {
  createContact(input: Omit<Contact, "id" | "createdAt">): Promise<Contact>;
  createCompany(input: Omit<Company, "id" | "createdAt">): Promise<Company>;
  createAddress(input: Address): Promise<Address>;
  getContact(id: string): Promise<Contact | null>;
  getCompany(id: string): Promise<Company | null>;
  getBusiness(id: string): Promise<Business | null>;
}

export class InMemoryCRMStore implements CRMStore {
  private contacts = new Map<string, Contact>();
  private companies = new Map<string, Company>();
  private addresses = new Map<string, Address>();
  private businesses = new Map<string, Business>();

  async createContact(input: Omit<Contact, "id" | "createdAt">) {
    const value = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.contacts.set(value.id, value); return value;
  }
  async createCompany(input: Omit<Company, "id" | "createdAt">) {
    const value = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.companies.set(value.id, value); return value;
  }
  async createAddress(input: Address) { this.addresses.set(input.id, input); return input; }
  async getContact(id: string) { return this.contacts.get(id) ?? null; }
  async getCompany(id: string) { return this.companies.get(id) ?? null; }
  async getBusiness(id: string) { return this.businesses.get(id) ?? null; }
}
