import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
    return { user: data.user };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Your Mail Desk</div>
            <h1 className="mt-3 text-3xl sm:text-4xl">{user.email?.split("@")[0] ?? "Account"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </div>
        <nav
          className="mt-6 flex flex-wrap gap-1 border-b border-rule"
          aria-label="Account navigation"
        >
          <Link
            to="/dashboard"
            className="px-4 py-2.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            to="/dashboard/ecosystem"
            className="px-4 py-2.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Ecosystem
          </Link>
          <Link
            to="/dashboard/orders"
            className="px-4 py-2.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            My Mail
          </Link>
          <Link
            to="/dashboard/settings"
            className="px-4 py-2.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Account
          </Link>
        </nav>
        <div className="mt-8">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
