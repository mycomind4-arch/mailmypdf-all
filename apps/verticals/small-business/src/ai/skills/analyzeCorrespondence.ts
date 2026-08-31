import { registerSkill } from "../skillRegistry";

registerSkill({
  id: "correspondence.analyze",
  name: "Analyze correspondence",
  description: "Extract structured facts, deadlines, amounts, and requested actions from supplied correspondence text.",
  kind: "skill",
  permissions: ["documents:read"],
  async execute(context) {
    const text = String(context.input.text ?? "").trim();
    if (!text) return { output: { status: "needs_input", required: ["text"] } };
    const deadlines = [...text.matchAll(/(?:due|deadline|respond by|response due)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?)/gi)].map((m) => m[1]);
    const amounts = [...text.matchAll(/\$\s?\d[\d,]*(?:\.\d{2})?/g)].map((m) => m[0]);
    const actions = text.match(/(?:must|please|requested to|required to)\s+[^.!?]+[.!?]?/gi) ?? [];
    return { output: { status: "analyzed", deadlines, amounts, requestedActions: actions.slice(0, 20) } };
  },
});
