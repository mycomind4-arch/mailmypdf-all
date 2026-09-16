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
  sources: [
    {
      id: "hacker-news",
      type: "rss",
      url: "https://hnrss.org/frontpage",
      publisher: "Hacker News",
      primary: false,
      tags: ["technology", "developers"],
    },
    {
      id: "techcrunch-ai",
      type: "rss",
      url: "https://techcrunch.com/category/artificial-intelligence/feed/",
      publisher: "TechCrunch AI",
      primary: false,
      tags: ["ai", "industry"],
    },
  ],
  editorial: {
    voice: "clear, analytical, concise, evidence-first",
    storyCount: 7,
    minimumStoryScore: 72,
    sections: ["top-story", "developments", "research", "tools", "what-to-watch"],
    requirePrimarySource: false,
    avoidRepeatDays: 30,
  },
  ai: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
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
