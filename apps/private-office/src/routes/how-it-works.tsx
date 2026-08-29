import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen, Search, Eye, PenLine, Send, ArrowRight, ShieldCheck, FileCheck2, Lock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — Private Office" },
      { name: "description", content: "How Private Office works: organize your documents, understand the matter, review the draft, approve the exact version, and send with proof of delivery." },
    ],
  }),
  component: HowItWorksPage,
});

const steps = [
  { num: "01", icon: FolderOpen, title: "Organize", desc: "Gather documents, state the facts, and define the objective for your matter. Everything lives in one controlled record." },
  { num: "02", icon: Search, title: "Understand", desc: "The system surfaces chronology, findings, discrepancies, and open questions for your review. Provenance is tracked for every assertion." },
  { num: "03", icon: Eye, title: "Review", desc: "A source-grounded draft is presented with provenance and version integrity. Review every word before approving." },
  { num: "04", icon: PenLine, title: "Approve", desc: "You explicitly approve the exact draft. Nothing consequential moves forward without your approval." },
  { num: "05", icon: Send, title: "Send & Prove", desc: "Your approved document is printed, enveloped, and mailed via USPS. Tracking and proof of delivery become part of the matter record." },
];

function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-ivory">
      <SiteHeader />
      <section className="border-b border-rule bg-paper">
        <div className="container max-w-3xl py-16 md:py-24">
          <div className="section-kicker">How It Works</div>
          <h1 className="mt-4 text-4xl leading-tight text-charcoal md:text-5xl">
            A disciplined process, not a black box.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone">
            Private Office guides you through organizing facts, understanding evidence, reviewing a draft, approving the exact version, and sending with proof. Every step is designed for matters where the record matters.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <div className="space-y-10">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rule bg-paper shadow-card">
                  <step.icon size={20} className="text-navy" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="font-mono text-xs tracking-widest text-brass">{step.num}</div>
                  <h2 className="mt-1 text-2xl text-charcoal">{step.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-rule bg-ivory-deep py-16">
        <div className="container max-w-3xl">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Lock, label: "Private by design" },
              { icon: FileCheck2, label: "Evidence-first workflow" },
              { icon: ShieldCheck, label: "Human approval required" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon size={18} className="text-brass" strokeWidth={1.5} />
                <span className="text-sm font-medium text-charcoal-soft">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 text-center">
        <div className="container">
          <Link to="/workflows" className="btn-primary">
            Start a Matter <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
