import { createFileRoute } from "@tanstack/react-router";

/** Compatibility alias. GovReply now lives at its own domain. */
export const Route = createFileRoute("/solutions/gov-reply")({
  component: () => {
    if (typeof window !== "undefined") {
      window.location.replace("https://govreply.pages.dev/");
    }
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <p className="text-sm text-muted-foreground">Redirecting to GovReply…</p>
        <a href="https://govreply.pages.dev/" className="text-sm underline text-cobalt">Click here if not redirected</a>
      </div>
    );
  },
});
