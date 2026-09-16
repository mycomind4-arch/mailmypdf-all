import type { EvidencePacket, VerificationIssue } from "./types.js";

export function verifyEvidencePacket(packet: EvidencePacket): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  const sourceIds = new Set(packet.sources.map((source) => source.id));

  if (!packet.sources.length) {
    issues.push({ severity: "error", storyId: packet.storyId, message: "Story has no sources" });
  }

  for (const claim of packet.claims) {
    if (!claim.text.trim()) {
      issues.push({ severity: "error", storyId: packet.storyId, claimId: claim.id, message: "Claim text is empty" });
    }
    if (!claim.sourceIds.length) {
      issues.push({ severity: "error", storyId: packet.storyId, claimId: claim.id, message: "Claim has no supporting source" });
    }
    for (const sourceId of claim.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push({ severity: "error", storyId: packet.storyId, claimId: claim.id, message: `Claim references unknown source: ${sourceId}` });
      }
    }
    if (claim.confidence < 0 || claim.confidence > 1) {
      issues.push({ severity: "error", storyId: packet.storyId, claimId: claim.id, message: "Claim confidence must be between 0 and 1" });
    }
    if (claim.disputed && !claim.contradictionSourceIds?.length) {
      issues.push({ severity: "warning", storyId: packet.storyId, claimId: claim.id, message: "Disputed claim has no contradiction source" });
    }
  }

  return issues;
}

export function evidencePasses(packet: EvidencePacket): boolean {
  return !verifyEvidencePacket(packet).some((issue) => issue.severity === "error");
}
