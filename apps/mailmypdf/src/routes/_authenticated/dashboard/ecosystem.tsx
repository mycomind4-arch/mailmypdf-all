import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dashboard/ecosystem")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/workflows" })
  },
  component: () => null,
})
