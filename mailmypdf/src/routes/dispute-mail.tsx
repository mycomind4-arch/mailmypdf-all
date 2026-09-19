import { createFileRoute } from "@tanstack/react-router";
import { PublicVerticalLandingPage, publicVerticalHead } from "@/components/public-vertical-page";

export const Route = createFileRoute("/dispute-mail")({
  head: () => publicVerticalHead("dispute-mail"),
  component: () => <PublicVerticalLandingPage id="dispute-mail" />,
});
