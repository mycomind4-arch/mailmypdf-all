import { createFileRoute, redirect } from "@tanstack/react-router";
import { isCurrentUserAdmin } from "@/lib/admin.functions";
import { StudioPage } from "@/components/admin-studio";

export const Route = createFileRoute("/_authenticated/studio")({
  beforeLoad: async () => {
    const { isAdmin } = await isCurrentUserAdmin();
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Studio — MailMyPDF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudioPage,
});
