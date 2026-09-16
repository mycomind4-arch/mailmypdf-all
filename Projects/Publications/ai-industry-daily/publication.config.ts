import type { PublicationManifest } from "../../../packages/autonomous-publishing/src/index.js";

export const aiIndustryDaily: PublicationManifest = {
  id: "ai-industry-daily",
  name: "AI Industry Daily",
  audience: {
    description: "Founders and developers who need material AI developments without repetitive noise",
  },
  schedule: {
    frequency: "daily",
    timezone: "America/Los_Angeles",
    time: "06:00",
  },
  editorial: {
    voice: "clear, analytical, concise, evidence-first",
    storyCount: 7,
    minimumStoryScore: 72,
    sections: ["top-story", "developments", "research", "tools", "what-to-watch"],
    requirePrimarySource: true,
    avoidRepeatDays: 30,
  },
  ai: {
    provider: "anthropic",
    model: "claude-sonnet",
    apiKeyEnv: "ANTHROPIC_API_KEY",
  },
  autonomy: {
    discover: "automatic",
    research: "automatic",
    draft: "automatic",
    verify: "automatic",
    publish: "approval_required",
  },
  integrations: {
    horizon: true,
    crawl4ai: true,
    rsshub: true,
    listmonk: true,
    umami: true,
    postiz: false,
  },
};
