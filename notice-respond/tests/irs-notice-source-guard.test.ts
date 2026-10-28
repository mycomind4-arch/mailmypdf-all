import { describe, expect, it } from "vitest";

import workflowConfig from "../workflows/irs-notice-response/config";

describe("general IRS notice primary-source safeguards", () => {
  it("does not imply every IRS notice requires a reply or promise a confirmed deadline", () => {
    expect(workflowConfig.faqs.find(([question]) => question === "Should I respond to every notice?")?.[1]).toMatch(/not every IRS notice requires a reply/i);
    expect(workflowConfig.outputs.join(" ")).not.toMatch(/confirmed response deadline/i);
    expect(workflowConfig.outputs.join(" ")).toMatch(/not a calculated or guaranteed deadline/i);
  });

  it("keeps special relief distinct from notice-specific appeal and response rules", () => {
    expect(workflowConfig.disclaimer).toMatch(/does not automatically extend every notice response or appeal deadline/i);
    expect(workflowConfig.disclaimer).toMatch(/general letter does not replace a required IRS form or formal appeal/i);
    expect(workflowConfig.sources.map(({ href }) => href)).toEqual(expect.arrayContaining([
      "https://www.irs.gov/individuals/understanding-your-irs-notice-or-letter",
      "https://www.irs.gov/newsroom/tax-relief-in-disaster-situations",
    ]));
  });

  it("does not recommend a generic letter for disputes that require a formal IRS process", () => {
    const disagreement = workflowConfig.faqs.find(([question]) => question === "What if I think the notice is an error?")?.[1] ?? "";
    expect(disagreement).toMatch(/notice-specific (?:disagreement|response|instructions)/i);
    expect(disagreement).toMatch(/required form|formal appeal/i);
    expect(disagreement).toMatch(/general (?:letter|response)/i);
  });

  it("does not assume every clarification request has a response deadline", () => {
    const clarification = workflowConfig.faqs.find(([question]) => question === "What if I don't understand the notice?")?.[1] ?? "";
    expect(clarification).toMatch(/if the notice specifies a (?:response )?deadline/i);
    expect(clarification).not.toMatch(/before the deadline\./i);
  });
});
