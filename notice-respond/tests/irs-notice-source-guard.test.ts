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
});
