import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <Outlet />
    </main>
  )
}
