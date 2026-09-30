import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { StudioCommandCenter } from "@/components/studio-command-center";

export const Route = createFileRoute("/_authenticated/studio/")({
  head: () => ({
    meta: [
      { title: "Studio Command Center — MailMyPDF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12 text-sm text-muted-foreground">Loading Studio command center…</div>}>
      <StudioCommandCenter />
    </Suspense>
  ),
});
