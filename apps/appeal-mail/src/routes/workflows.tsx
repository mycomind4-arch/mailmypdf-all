import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/workflows")({
  component: WorkflowLayout,
});

function WorkflowLayout() {
  return <div className="min-h-screen bg-paper"><SiteHeader /><main>
    <Outlet />
  </main><SiteFooter /></div>;
}
