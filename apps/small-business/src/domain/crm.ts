export type Business = { id: string; name: string; legalName?: string; email?: string; phone?: string; website?: string; timezone: string; createdAt: string };
export type Contact = { id: string; businessId: string; firstName: string; lastName: string; email?: string; phone?: string; title?: string; companyId?: string; createdAt: string };
export type Company = { id: string; businessId: string; name: string; email?: string; phone?: string; website?: string; createdAt: string };
export type Address = { id: string; businessId: string; contactId?: string; companyId?: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string; isDefault: boolean };

export type ActivityType = "note" | "call" | "email" | "mailing" | "approval" | "delivery" | "proof";
export type Activity = { id: string; businessId: string; type: ActivityType; subject: string; entityId: string; occurredAt: string; metadata?: Record<string, unknown> };

export type CRMRelationship = { id: string; businessId: string; fromType: string; fromId: string; relation: string; toType: string; toId: string };
