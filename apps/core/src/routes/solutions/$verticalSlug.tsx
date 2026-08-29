import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getVerticalBySlug } from "@/verticals";

/**
 * Compatibility route only.
 *
 * /solutions is the catalog. Individual verticals own their canonical routes.
 * Existing /solutions/:slug links are redirected to the registry's canonical
 * route so old links remain safe while the ecosystem evolves.
 */
export const Route = createFileRoute("/solutions/$verticalSlug")({
  beforeLoad: ({ params }) => {
    const vertical = getVerticalBySlug(params.verticalSlug);
    if (!vertical) throw redirect({ to: "/solutions" });
    // External verticals need a browser redirect, not a router redirect
    if (vertical.route.startsWith("http")) return;
    throw redirect({ to: vertical.route });
  },
  component: ExternalRedirect,
});

function ExternalRedirect() {
  const { verticalSlug } = Route.useParams();
  const vertical = getVerticalBySlug(verticalSlug);
  const url = vertical?.route ?? "/solutions";
  if (typeof window !== "undefined" && url.startsWith("http")) {
    window.location.replace(url);
  }
  return (
    <div className="min-h-screen grid place-items-center p-8">
      <p className="text-sm text-muted-foreground">Redirecting to {vertical?.name ?? "the canonical solution"}…</p>
      <a href={url} className="text-sm underline text-cobalt">Click here if not redirected</a>
    </div>
  );
}
