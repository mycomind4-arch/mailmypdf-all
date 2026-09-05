import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Stamp,
  FileCheck2,
  Eye,
  Send,
  FolderOpen,
  Search,
  PenLine,
  Briefcase,
  Scale,
  Landmark,
  ScrollText,
  Building2,
  Home,
} from "lucide-react";
import { createElement } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { workflows } from "@/domain/workflows";
import { workflowProfiles } from "@/domain/workflow-profiles";
import { createTrustStrip, createVerticalHero } from "../../../../../packages/design-system/src/index";

export const Route = createFileRoute("/")({ component: HomePage });

const VerticalHero = createVerticalHero(createElement);
const SharedTrustStrip = createTrustStrip(createElement);

const processSteps = [
  { num: "01", icon: FolderOpen, title: "Organize", desc: "Gather documents, state the facts, and define the objective for your matter." },
  { num: "02", icon: Search, title: "Understand", desc: "The system surfaces chronology, findings, discrepancies, and open questions for your review." },
  { num: "03", icon: Eye, title: "Review", desc: "A source-grounded draft is presented with provenance and version integrity for your inspection." },
  { num: "04", icon: PenLine, title: "Approve", desc: "Nothing consequential moves forward without your explicit approval of the exact draft." },
  { num: "05", icon: Send, title: "Send & Prove", desc: "Mailing, delivery, and correspondence records become a permanent part of the matter." },
];

const pillars = [
  { icon: FileCheck2, title: "Evidence-first", desc: "Your correspondence is built from documented facts and supporting evidence. Every assertion traces back to a source or is clearly identified as generated." },
  { icon: ShieldCheck, title: "Human review", desc: "Important actions remain under your control. AI can assist analysis and drafting — it cannot approve, pay, authorize, or send on your behalf." },
  { icon: Stamp, title: "Proof", desc: "Mailing creates a durable record with tracking and proof of delivery. Your matter retains a complete, auditable history from first fact to final proof." },
];

const workflowIcons: Record<string, typeof Briefcase> = {
  "contractor-dispute": Building2,
  "property-insurance-claim": Home,
  "bank-wire-dispute": Landmark,
  "trust-beneficiary-notice": ScrollText,
  "security-deposit-dispute": Scale,
};

const faqs = [
  ["What is Private Office?", "Private Office is a matter-centric correspondence and documentation environment for consequential personal and professional affairs. It organizes facts, evidence, analysis, drafting, approval, fulfillment, and proof in one controlled record."],
  ["Does Private Office provide legal advice?", "No. Private Office is not a law firm and does not provide legal advice or representation. It helps organize information and prepare correspondence while keeping consequential decisions under human control."],
  ["Can AI make decisions for me?", "No. AI is advisory. It may help analyze supplied information or improve a draft, but it cannot authorize mailing, approve payment, replace human approval, or silently overwrite user facts."],
  ["What happens after I approve a document?", "The approved version is preserved with its integrity information and can move through the fulfillment gates to physical mailing. Delivery and correspondence records become part of the matter record."],
];

function HomePage() {
  return (
    <main className="bg-ivory min-h-screen">
      <SiteHeader />

      <VerticalHero
        theme="private-office"
        tone="dark"
        eyebrow="Personal matters. Professional solutions."
        title="Handle life's important matters."
        description="Business, property, and high-value personal matters — organized workflows, professional correspondence, human review, and optional mailing with proof."
        imageSrc="/ecosystem-hero-sprite.jpg"
        imageAlt="Warm premium executive office prepared for private correspondence"
        imageBackgroundSize="200% 300%"
        imageBackgroundPosition="100% 100%"
        actions={
          <>
            <Link to="/workflows" className="btn-primary">Explore Private Office <ArrowRight size={16} /></Link>
            <Link to="/workflows" className="btn-outline">Browse Workflows</Link>
          </>
        }
        meta={<><span>Private matters</span><span>Human approval</span><span>MailMyPDF fulfillment</span></>}
      />

      <SharedTrustStrip
        items={[
          { icon: <Lock size={16} />, title: "Private by design", description: "Matter access stays account-scoped" },
          { icon: <FileCheck2 size={16} />, title: "Evidence-first workflow", description: "Build from documented facts" },
          { icon: <ShieldCheck size={16} />, title: "Human approval", description: "Review before consequential actions" },
          { icon: <Stamp size={16} />, title: "Tracking & proof", description: "Preserve the mailing record" },
        ]}
      />

      <section className="bg-ivory-deep py-20 md:py-28">
        <div className="container">
          <div className="section-kicker">How Private Office Works</div>
          <h2 className="mt-4 max-w-2xl text-4xl leading-tight text-charcoal md:text-5xl">A disciplined process, not a black box.</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-5 md:gap-4">
            {processSteps.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                {i < processSteps.length - 1 && <div className="absolute left-[60%] right-[-40%] top-7 hidden h-px bg-rule md:block" aria-hidden />}
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-rule bg-paper shadow-card">
                  <step.icon size={22} className="text-navy" strokeWidth={1.5} />
                </div>
                <div className="mt-5 font-mono text-xs tracking-widest text-brass">{step.num}</div>
                <h3 className="mt-2 text-xl text-charcoal">{step.title}</h3>
                <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-stone">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container">
          <div className="section-kicker">Why Private Office</div>
          <h2 className="mt-4 max-w-2xl text-4xl leading-tight text-charcoal md:text-5xl">Built for matters where the record matters.</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-rule bg-rule md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-paper p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-rule bg-ivory"><Icon size={20} className="text-navy" strokeWidth={1.5} /></div>
                <h3 className="mt-6 text-2xl text-charcoal">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-stone">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ivory-deep py-20 md:py-28">
        <div className="container">
          <div className="flex items-end justify-between gap-6">
            <div>
              <div className="section-kicker">Matter Domains</div>
              <h2 className="mt-4 text-4xl leading-tight text-charcoal md:text-5xl">Begin with the situation.</h2>
            </div>
            <Link to="/workflows" className="hidden shrink-0 text-sm font-medium text-navy transition-colors hover:text-brass md:inline-flex md:items-center md:gap-1">All workflows <ArrowRight size={15} /></Link>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(workflows).map((wf) => {
              const profile = workflowProfiles[wf.id];
              const Icon = workflowIcons[wf.id] ?? Briefcase;
              return (
                <Link key={wf.id} to={`/workflows/${wf.id}`} className="group flex flex-col rounded-xl border border-rule bg-paper p-6 transition-all duration-200 hover:border-navy/30 hover:shadow-premium">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-ivory"><Icon size={18} className="text-navy" strokeWidth={1.5} /></div>
                    <ArrowRight size={18} className="text-stone-light transition-all group-hover:translate-x-1 group-hover:text-navy" />
                  </div>
                  <div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-brass">{profile?.family ?? "Private Matter"}</div>
                  <h3 className="mt-2 text-xl text-charcoal">{wf.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{profile?.outcome ?? wf.description}</p>
                </Link>
              );
            })}
          </div>
          <div className="mt-8 md:hidden"><Link to="/workflows" className="btn-outline">All workflows <ArrowRight size={15} /></Link></div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_.85fr] lg:gap-20">
            <div>
              <div className="section-kicker">A Different Kind of AI</div>
              <h2 className="mt-4 text-4xl leading-tight text-charcoal md:text-5xl">Intelligence without surrendering control.</h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone">Private Office uses multi-LLM assistance as an advisory layer. The deterministic workflow remains in charge. Your facts remain yours. Conflicts are surfaced. Provenance is retained. Consequential actions stay behind human gates.</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-rule">
              {[["AI", "Advisory"],["Facts", "User controlled"],["Approval", "Human required"],["Fulfillment", "Gated"],["Proof", "Preserved"]].map(([label, value], i) => (
                <div key={label} className={`flex items-center justify-between px-6 py-4 ${i < 4 ? "border-b border-rule" : ""}`}>
                  <span className="font-mono text-xs uppercase tracking-widest text-stone">{label}</span>
                  <span className={`font-mono text-xs font-semibold uppercase tracking-widest ${i === 2 ? "text-brass" : "text-charcoal-soft"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ivory-deep py-20 md:py-28">
        <div className="container max-w-3xl">
          <div className="section-kicker">Questions</div>
          <h2 className="mt-4 text-4xl text-charcoal md:text-5xl">A few things worth knowing.</h2>
          <div className="mt-10 divide-y divide-rule border-y border-rule">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between list-none text-lg text-charcoal">{q}<span className="text-stone-light transition-transform duration-200 group-open:rotate-45">+</span></summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container text-center">
          <div className="section-kicker">Private Office</div>
          <h2 className="mx-auto mt-5 max-w-2xl text-5xl leading-tight text-charcoal md:text-6xl">When the matter matters, keep a record.</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone">Organize the facts. Understand the evidence. Approve the correspondence. Preserve the proof.</p>
          <Link to="/workflows" className="btn-primary mt-9">Start a Matter <ArrowRight size={16} /></Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
