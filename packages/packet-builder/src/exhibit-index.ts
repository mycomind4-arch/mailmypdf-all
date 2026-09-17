export interface ExhibitIndexInput {
  evidenceId: string;
  label: string;
  pageRef?: string;
  description?: string;
  include?: boolean;
}

export interface ExhibitIndexEntry {
  number: string;
  evidenceId: string;
  label: string;
  pageRef?: string;
  description?: string;
}

export function buildExhibitIndex(items: readonly ExhibitIndexInput[]): ExhibitIndexEntry[] {
  return items
    .filter((item) => item.include !== false)
    .map((item, index) => ({
      number: `Exhibit ${String.fromCharCode(65 + index)}`,
      evidenceId: item.evidenceId,
      label: item.label,
      ...(item.pageRef ? { pageRef: item.pageRef } : {}),
      ...(item.description ? { description: item.description } : {}),
    }));
}

export function renderExhibitIndex(index: readonly ExhibitIndexEntry[]): string {
  if (!index.length) return "";
  const lines = ["EXHIBIT INDEX", ""];
  for (const entry of index) {
    lines.push(`${entry.number}: ${entry.label}`);
    if (entry.pageRef) lines.push(`   Page(s): ${entry.pageRef}`);
    if (entry.description) lines.push(`   ${entry.description}`);
    lines.push("");
  }
  return lines.join("\n");
}

export interface PacketPlanAttachment {
  documentId: string;
  evidenceId?: string;
  label: string;
  sha256?: string;
  position: number;
}

export interface CorrespondencePacketPlan {
  matterId: string;
  workflowId: string;
  letterDocumentId: string;
  recipient: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal: string;
  };
  mailingClass: "standard" | "certified" | "registered";
  exhibits: ExhibitIndexEntry[];
  attachments: PacketPlanAttachment[];
}

export function createCorrespondencePacketPlan(input: {
  matterId: string;
  workflowId: string;
  letterDocumentId: string;
  recipient: CorrespondencePacketPlan["recipient"];
  mailingClass: CorrespondencePacketPlan["mailingClass"];
  exhibits: readonly ExhibitIndexInput[];
  attachments: readonly Omit<PacketPlanAttachment, "position">[];
}): CorrespondencePacketPlan {
  if (!input.matterId.trim() || !input.workflowId.trim() || !input.letterDocumentId.trim()) {
    throw new Error("Packet plan requires matter, workflow, and letter document identity");
  }
  for (const field of ["name", "line1", "city", "state", "postal"] as const) {
    if (!String(input.recipient[field] ?? "").trim()) throw new Error(`Packet recipient is missing ${field}`);
  }
  const attachments = input.attachments.map((attachment, index) => ({ ...attachment, position: index }));
  const duplicateIds = new Set<string>();
  for (const attachment of attachments) {
    if (!attachment.documentId.trim()) throw new Error("Packet attachment requires documentId");
    if (duplicateIds.has(attachment.documentId)) throw new Error(`Duplicate packet attachment: ${attachment.documentId}`);
    duplicateIds.add(attachment.documentId);
  }
  return {
    matterId: input.matterId,
    workflowId: input.workflowId,
    letterDocumentId: input.letterDocumentId,
    recipient: { ...input.recipient },
    mailingClass: input.mailingClass,
    exhibits: buildExhibitIndex(input.exhibits),
    attachments,
  };
}
