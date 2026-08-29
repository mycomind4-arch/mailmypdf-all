import { createFileRoute } from "@tanstack/react-router";

/** Compatibility alias. Appeal Mail now lives at its own domain. */
export const Route = createFileRoute("/solutions/appeal-reply")({
  component: () => {
    if (typeof window !== "undefined") {
      window.location.replace("https://appeal-mail.pages.dev/");
    }
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <p className="text-sm text-muted-foreground">Redirecting to Appeal Mail…</p>
        <a href="https://appeal-mail.pages.dev/" className="text-sm underline text-cobalt">Click here if not redirected</a>
      </div>
    );
  },
});
