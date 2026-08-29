import { registerSkill } from "../skillRegistry";

registerSkill({
  id: "correspondence.draft",
  name: "Draft correspondence",
  description: "Create a structured first draft from business facts and an approved tone.",
  kind: "skill",
  permissions: ["documents:read", "documents:write"],
  async execute(context) {
    const facts = context.input.facts as Record<string, unknown> | undefined;
    const purpose = String(context.input.purpose ?? "business correspondence");
    if (!facts) return { output: { status: "needs_input", required: ["facts", "recipient", "purpose"] }, warnings: ["No business facts were supplied; no draft was generated."] };
    return {
      output: {
        status: "draft_ready",
        subject: String(context.input.subject ?? purpose),
        draft: `Prepared ${purpose} draft for review. Facts used: ${JSON.stringify(facts)}`,
        facts,
      },
      warnings: ["AI-generated correspondence must be reviewed before sending."] ,
    };
  },
});
