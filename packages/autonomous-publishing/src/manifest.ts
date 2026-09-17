export interface PublicationSource {
  id: string;
  type: "rss" | "api" | "web" | "social" | "internal";
  url: string;
  publisher?: string;
  primary?: boolean;
  enabled?: boolean;
  tags?: readonly string[];
}

export interface PublicationManifest {
  id: string;
  name: string;
  audience: {
    description: string;
  };
  schedule: {
    frequency: "hourly" | "daily" | "weekly" | "manual";
    timezone: string;
    time?: string;
    /** JavaScript weekday: 0=Sunday ... 6=Saturday. Required for weekly schedules. */
    dayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  };
  sources?: readonly PublicationSource[];
  editorial: {
    voice: string;
    storyCount: number;
    minimumStoryScore: number;
    sections: readonly string[];
    requirePrimarySource: boolean;
    avoidRepeatDays: number;
  };
  ai: {
    provider: "anthropic" | "openai" | "gemini" | (string & {});
    model: string;
    apiKeyEnv: string;
  };
  autonomy: {
    discover: "automatic" | "manual";
    research: "automatic" | "manual";
    draft: "automatic" | "manual";
    verify: "automatic" | "manual";
    publish: "approval_required" | "automatic";
  };
  integrations: {
    horizon?: boolean;
    crawl4ai?: boolean;
    embeddings?: boolean;
    rsshub?: boolean;
    listmonk?: boolean;
    resend?: boolean;
    umami?: boolean;
    postiz?: boolean;
  };
}

export function validatePublicationManifest(value: PublicationManifest): PublicationManifest {
  if (!value.id.trim() || !/^[a-z0-9][a-z0-9-]*$/.test(value.id)) {
    throw new Error("Publication id must be lowercase kebab-case");
  }
  if (!value.name.trim()) throw new Error("Publication name is required");
  if (!value.audience.description.trim()) throw new Error("Audience description is required");
  if (value.editorial.storyCount < 1 || value.editorial.storyCount > 50) {
    throw new Error("storyCount must be between 1 and 50");
  }
  if (value.editorial.minimumStoryScore < 0 || value.editorial.minimumStoryScore > 100) {
    throw new Error("minimumStoryScore must be between 0 and 100");
  }
  if (!value.editorial.sections.length) throw new Error("At least one editorial section is required");
  if (/^(NEXT_PUBLIC_|VITE_|PUBLIC_)/i.test(value.ai.apiKeyEnv)) {
    throw new Error("AI secrets must use a server-only environment variable");
  }
  if (!value.ai.apiKeyEnv.trim()) throw new Error("AI apiKeyEnv is required");
  if (value.schedule.frequency === "weekly" && value.schedule.dayOfWeek === undefined) {
    throw new Error("Weekly schedules require dayOfWeek (0=Sunday ... 6=Saturday)");
  }
  if (value.schedule.time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.schedule.time)) {
    throw new Error("Schedule time must use HH:MM 24-hour format");
  }

  const ids = new Set<string>();
  for (const source of value.sources ?? []) {
    if (!source.id.trim()) throw new Error("Source id is required");
    if (ids.has(source.id)) throw new Error(`Duplicate source id: ${source.id}`);
    ids.add(source.id);
    let url: URL;
    try {
      url = new URL(source.url);
    } catch {
      throw new Error(`Invalid source URL: ${source.id}`);
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`Source URL must use http/https: ${source.id}`);
    }
  }
  return value;
}
