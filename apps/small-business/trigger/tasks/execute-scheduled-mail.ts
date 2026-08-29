import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const payload = z.object({
  scheduleId: z.string().min(1),
  occurrence: z.string().datetime(),
});

export const executeScheduledMail = schemaTask({
  id: "execute-scheduled-mail",
  schema: payload,
  maxDuration: 300,
  retry: { maxAttempts: 5, minTimeoutInMs: 1000, maxTimeoutInMs: 30000, factor: 2 },
  run: async (input) => {
    const baseUrl = process.env.SMALL_BUSINESS_API_URL;
    const apiKey = process.env.SMALL_BUSINESS_INTERNAL_API_KEY;
    if (!baseUrl || !apiKey) throw new Error("Missing SMALL_BUSINESS_API_URL or SMALL_BUSINESS_INTERNAL_API_KEY");

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/internal/schedules/${input.scheduleId}/execute`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ occurrence: input.occurrence }),
    });
    if (!response.ok) throw new Error(`Execution API returned ${response.status}: ${(await response.text()).slice(0, 500)}`);

    const result = await response.json() as Record<string, unknown>;
    if (typeof result.status !== "string") throw new Error("Execution API response is missing a durable status");
    return result;
  },
});
