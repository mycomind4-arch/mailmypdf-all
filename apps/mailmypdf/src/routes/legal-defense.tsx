import { createFileRoute } from "@tanstack/react-router";
import { PublicVerticalLandingPage, publicVerticalHead } from "@/components/public-vertical-page";

export const Route = createFileRoute("/legal-defense")({
  head: () => publicVerticalHead("legal-defense"),
  component: () => <PublicVerticalLandingPage id="legal-defense" />,
});
