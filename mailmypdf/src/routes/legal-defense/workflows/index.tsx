import { createFileRoute } from "@tanstack/react-router";
import { PublicVerticalWorkflowDirectoryPage, publicVerticalHead } from "@/components/public-vertical-page";

export const Route = createFileRoute("/legal-defense/workflows/")({
  head: () => publicVerticalHead("legal-defense", "directory"),
  component: () => <PublicVerticalWorkflowDirectoryPage id="legal-defense" />,
});
