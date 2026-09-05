import { createFileRoute } from "@tanstack/react-router";
import { PublicVerticalLandingPage, publicVerticalHead } from "@/components/public-vertical-page";

export const Route = createFileRoute("/benefits-appeal")({
  head: () => publicVerticalHead("benefits-appeal"),
  component: () => <PublicVerticalLandingPage id="benefits-appeal" />,
});
