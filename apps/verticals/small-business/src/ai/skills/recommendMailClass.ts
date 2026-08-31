import { registerSkill } from "../skillRegistry";

registerSkill({
  id: "mail.recommend_class",
  name: "Recommend mail class",
  description: "Recommend standard, certified, or registered mailing based on business requirements.",
  kind: "skill",
  permissions: ["mail:read"],
  async execute(context) {
    const input = context.input;
    const evidence = String(input.reason ?? "").toLowerCase();
    const explicit = String(input.requestedClass ?? "").toLowerCase();
    if (["standard", "certified", "registered"].includes(explicit)) return { output: { recommendedClass: explicit, confidence: "explicit", rationale: "Requested mail class supplied by the user." } };
    if (evidence.includes("high value") || evidence.includes("valuable contents")) return { output: { recommendedClass: "registered", confidence: "medium", rationale: "The supplied context indicates unusually valuable contents; verify business requirements before sending." }, warnings: ["Recommendation is advisory and does not replace business/legal review."] };
    if (evidence.includes("proof") || evidence.includes("delivery") || evidence.includes("signature") || evidence.includes("important notice")) return { output: { recommendedClass: "certified", confidence: "medium", rationale: "The workflow emphasizes mailing evidence or delivery confirmation." }, warnings: ["Recommendation is advisory and does not replace business/legal review."] };
    return { output: { recommendedClass: "standard", confidence: "low", rationale: "No requirement in the supplied context indicates enhanced mailing service." }, warnings: ["Consider certified or registered mail when stronger proof or special handling is required."] };
  },
});
