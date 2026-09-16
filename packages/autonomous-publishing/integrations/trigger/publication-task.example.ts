/**
 * Production Trigger.dev v4 template.
 *
 * Activation steps:
 *   pnpm add @trigger.dev/sdk --filter @mailmypdf/autonomous-publishing
 *   regenerate/commit pnpm-lock.yaml
 *   move/adapt this file into the deployed Trigger task package
 *
 * This file is outside src/ so the core package remains buildable before the
 * Trigger SDK is installed.
 */

import { schedules, wait } from "@trigger.dev/sdk";
import {
  createPublishingPipeline,
  createProductionPublishingAdapters,
  createSqlPublicationRunStore,
  publishApprovedEdition,
  type SqlClient,
} from "../../src/index.js";
import { aiIndustryDaily } from "../../../../Projects/Publications/ai-industry-daily/publication.config.js";

declare const sql: SqlClient;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function adapters() {
  return createProductionPublishingAdapters(aiIndustryDaily, {
    env: process.env,
    horizon: process.env.HORIZON_ENDPOINT
      ? {
          endpoint: process.env.HORIZON_ENDPOINT,
          token: process.env.HORIZON_TOKEN,
        }
      : undefined,
    crawl4ai: process.env.CRAWL4AI_ENDPOINT
      ? {
          endpoint: process.env.CRAWL4AI_ENDPOINT,
          token: process.env.CRAWL4AI_TOKEN,
        }
      : undefined,
    listmonk: process.env.LISTMONK_URL
      ? {
          baseUrl: process.env.LISTMONK_URL,
          username: required("LISTMONK_USERNAME"),
          apiToken: required("LISTMONK_API_TOKEN"),
          listIds: [Number(required("LISTMONK_LIST_ID"))],
          templateId: process.env.LISTMONK_TEMPLATE_ID
            ? Number(process.env.LISTMONK_TEMPLATE_ID)
            : undefined,
          startImmediately: true,
        }
      : undefined,
    umami: process.env.UMAMI_URL
      ? {
          baseUrl: process.env.UMAMI_URL,
          websiteId: required("UMAMI_WEBSITE_ID"),
          hostname: required("PUBLICATION_HOSTNAME"),
        }
      : undefined,
  });
}

export const aiIndustryDailyTask = schedules.task({
  id: "publication-ai-industry-daily",
  cron: {
    pattern: "0 6 * * *",
    timezone: "America/Los_Angeles",
  },
  run: async () => {
    const runtime = adapters();
    const runStore = createSqlPublicationRunStore(sql);
    const pipeline = createPublishingPipeline(runtime, undefined, { runStore });

    const preview = await pipeline.run(aiIndustryDaily, false);
    if (preview.run.status !== "awaiting_approval") return preview.run;

    const approval = await wait.createToken({ timeout: "24h" });
    // Surface approval.id/token metadata in Studio UI here.
    const decision = await wait.forToken<{ approved: boolean; reviewer?: string; reason?: string }>(approval);

    if (!decision.ok || !decision.output.approved) {
      return {
        ...preview.run,
        approval: "rejected_or_timed_out",
      };
    }

    const persisted = await runStore.get(preview.run.id);
    if (!persisted) throw new Error("PERSISTED_PUBLICATION_RUN_NOT_FOUND");

    const published = await publishApprovedEdition(runtime, aiIndustryDaily, persisted, {
      runStore,
    });

    return published.run;
  },
});
