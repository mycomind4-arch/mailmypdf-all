export type CapabilityKind = "skill" | "connector" | "action";

export type Capability = {
  id: string;
  name: string;
  description: string;
  kind: CapabilityKind;
  permissions: string[];
};

export const coreCapabilities: Capability[] = [
  { id: "correspondence.draft", name: "Draft correspondence", description: "Create a business correspondence draft from structured context.", kind: "skill", permissions: ["documents:write"] },
  { id: "correspondence.analyze", name: "Analyze correspondence", description: "Extract facts, deadlines, amounts, and requested actions from correspondence.", kind: "skill", permissions: ["documents:read"] },
  { id: "mail.recommend_class", name: "Recommend mail class", description: "Recommend an appropriate mailing class based on workflow requirements.", kind: "skill", permissions: ["mail:read"] },
  { id: "mail.create", name: "Create mailing", description: "Create a pending correspondence job.", kind: "action", permissions: ["mail:write"] },
  { id: "mail.schedule", name: "Schedule mailing", description: "Schedule an approved correspondence job.", kind: "action", permissions: ["mail:schedule"] },
  { id: "mail.request_approval", name: "Request approval", description: "Create an approval request before execution.", kind: "action", permissions: ["mail:approve"] },
];

export function findCapabilities(query: string): Capability[] {
  const normalized = query.toLowerCase();
  return coreCapabilities.filter((capability) => `${capability.id} ${capability.name} ${capability.description}`.toLowerCase().includes(normalized));
}
