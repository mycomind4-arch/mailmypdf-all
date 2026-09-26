import { createFileRoute } from "@tanstack/react-router";
import { handleOpenAiAppsChallenge } from "@/lib/openai-apps-challenge.server";

export const Route = createFileRoute("/.well-known/openai-apps-challenge")({
  server: {
    handlers: {
      GET: () => handleOpenAiAppsChallenge(),
    },
  },
});
