export type WorkspaceMailClass = "standard" | "certified" | "registered";

export type CorrespondenceDraft = {
  id: string;
  businessId: string;
  recipientId?: string;
  companyId?: string;
  addressId?: string;
  templateId?: string;
  subject: string;
  body: string;
  mailClass: WorkspaceMailClass;
  scheduledFor?: string;
  requiresApproval: boolean;
  status: "draft" | "ready_for_approval" | "approved" | "scheduled" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export function validateDraft(draft: Pick<CorrespondenceDraft, "businessId" | "subject" | "body" | "mailClass">): void {
  if (!draft.businessId.trim()) throw new Error("Business is required");
  if (!draft.subject.trim()) throw new Error("Subject is required");
  if (!draft.body.trim()) throw new Error("Correspondence body is required");
  if (!["standard", "certified", "registered"].includes(draft.mailClass)) throw new Error("Unsupported mail class");
}
