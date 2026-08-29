import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Appeal Mail" },
      { name: "description", content: "How Appeal Mail works: upload your decision, we help you prepare your appeal, and mail it with tracking and proof of delivery." },
    ],
  }),
  component: () => (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="eyebrow">How It Works</div>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Three steps. Real mail. Full record.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Appeal Mail guides you through preparing, reviewing, and mailing your appeal — with the same process used by legal professionals.
        </p>
        <div className="mt-12 space-y-8">
          {[
            { num: "01", title: "Upload your decision", desc: "Share the denial or adverse decision you received. We analyze it to identify the key facts, deadlines, and appeal requirements." },
            { num: "02", title: "Prepare your appeal", desc: "Answer guided questions about your situation. We draft your appeal letter, which you review and approve word by word." },
            { num: "03", title: "Mail with proof", desc: "Choose Standard, Certified, or Registered mail. We print, envelope, and send via USPS with tracking and proof of delivery." },
          ].map((step) => (
            <div key={step.num} className="rounded-2xl border border-rule bg-paper-deep/30 p-6">
              <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">{step.num}</div>
              <h2 className="mt-2 font-serif text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  ),
});
