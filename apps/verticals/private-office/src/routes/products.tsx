import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ECOSYSTEM_PRODUCTS } from "@/components/ecosystem-shell";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "All Products — MailMyPDF" },
      { name: "description", content: "Explore all MailMyPDF product verticals for specific document problems." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <main className="min-h-screen bg-ivory">
      <SiteHeader />
      <section className="border-b border-rule bg-paper">
        <div className="container max-w-3xl py-16 md:py-24">
          <div className="section-kicker">Ecosystem</div>
          <h1 className="mt-4 text-4xl leading-tight text-charcoal md:text-5xl">
            MailMyPDF Products
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone">
            Each product is purpose-built for a family of related document problems. Find the one that matches your situation.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ECOSYSTEM_PRODUCTS.map((p) => (
              <a
                key={p.slug}
                href={p.href}
                className="group block rounded-xl border border-rule bg-paper p-6 transition-all duration-200 hover:border-navy/30 hover:shadow-premium"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-brass">{p.category}</div>
                <h2 className="mt-2 text-xl text-charcoal">{p.name}</h2>
                <p className="mt-2 text-sm leading-6 text-stone">{p.description}</p>
                {p.status === "planned" && (
                  <span className="mt-3 inline-block rounded border border-rule bg-ivory-deep px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-stone">
                    Coming Soon
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
