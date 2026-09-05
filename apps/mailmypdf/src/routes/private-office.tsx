import { createFileRoute } from "@tanstack/react-router";
import { PublicVerticalLandingPage, publicVerticalHead } from "@/components/public-vertical-page";

export const Route = createFileRoute("/private-office")({
  head: () => publicVerticalHead("private-office"),
  component: () => <PublicVerticalLandingPage id="private-office" />,
});
