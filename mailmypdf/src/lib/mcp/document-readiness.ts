export type McpDocumentReadiness = "ready" | "pending_scan" | "rejected" | "unavailable";

export function classifyDocumentReadiness(
  securityStatus: string,
  usable: boolean,
): McpDocumentReadiness {
  if (usable && securityStatus === "clean") return "ready";
  if (securityStatus === "rejected") return "rejected";
  if (securityStatus === "deleting" || securityStatus === "deleted") return "unavailable";
  return "pending_scan";
}
