import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router"
import { supabase, ensureSupabase } from "@/integrations/supabase/client"
import { AuthenticatedSidebar } from "@/components/authenticated-sidebar"

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await ensureSupabase()
    if (!supabase.auth) throw redirect({ to: "/auth", search: { redirect: location.href } })
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } })
    }
    return { user: data.user }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    await router.navigate({ to: "/" })
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedSidebar user={user} onSignOut={handleSignOut} />
      <div className="min-h-screen lg:pl-16">
        <Outlet />
      </div>
    </div>
  )
}
