import { createFileRoute } from "@tanstack/react-router";

/** This vertical now lives at Dispute Mail's own domain. */
export const Route = createFileRoute("/debt-defense-mail")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => {
    if (typeof window !== "undefined") {
      window.location.replace("https://dispute-mail.pages.dev");
    }
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
        <a href="https://dispute-mail.pages.dev" className="mt-2 text-sm underline text-cobalt">Click here if not redirected</a>
      </div>
    );
  },
});
