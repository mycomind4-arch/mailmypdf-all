import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/migration-preview")({
  head: () => ({
    meta: [
      { title: "MailMyPDF Migration Preview" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <Outlet />,
})
