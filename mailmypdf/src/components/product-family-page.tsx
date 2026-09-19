import { Link } from "@tanstack/react-router";
import { WORKFLOW_NAV_GROUPS } from "@/lib/workflow-navigation";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

type Props = { product: string; route: string; description: string };

export function ProductFamilyPage({ product, route, description }: Props) {
  const group = WORKFLOW_NAV_GROUPS.find((candidate) => candidate.product === product);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="postmark w-fit">MailMyPDF / {product}</div>
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">{route}</p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl sm:text-6xl">{product}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{description}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(group?.workflows ?? []).map((workflow) => (
            <Link key={workflow.href} to={workflow.href} className="rounded-2xl border border-rule p-5 transition hover:bg-muted/40">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-medium">{workflow.label}</h2>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{workflow.pipeline}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Explore the dedicated workflow authority page, requirements, evidence guidance, and eventual executable workflow.</p>
            </Link>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/ecosystem" className="rounded-full border border-rule px-5 py-3 text-sm font-medium">All Products</Link>
          <Link to="/send" className="rounded-full bg-cobalt px-5 py-3 text-sm font-medium text-white">Start Mailing</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
