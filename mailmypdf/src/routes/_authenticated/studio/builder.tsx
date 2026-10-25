import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/components/admin-studio";

export const Route = createFileRoute("/_authenticated/studio/builder")({
  head: () => ({
    meta: [
      { title: "Workflow Builder — MailMyPDF Studio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudioPage,
});
