import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ECOSYSTEM_PRODUCTS } from "@/components/ecosystem-shell";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "All Products — MailMyPDF" },
      { name: "description", content: "Explore all MailMyPDF product verticals for specific document problems." },
    ],
  }),
  component: () => (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="eyebrow">Ecosystem</div>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">MailMyPDF Products</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Each product is purpose-built for a family of related document problems. Find the one that matches your situation.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ECOSYSTEM_PRODUCTS.map((p) => (
            <a
              key={p.slug}
              href={p.href}
              className="block rounded-2xl border border-rule bg-paper-deep/30 p-6 transition-colors hover:bg-muted/40"
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{p.category}</div>
              <h2 className="mt-2 font-serif text-xl">{p.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.description}</p>
              {p.status === "planned" && (
                <span className="mt-3 inline-block rounded-full border border-rule px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Coming Soon</span>
              )}
            </a>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  ),
});
