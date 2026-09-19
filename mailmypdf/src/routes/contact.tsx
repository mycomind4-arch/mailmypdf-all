import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Support | MailMyPDF" },
      { name: "description", content: "Contact MailMyPDF support about an order, workflow, privacy request, or product question." },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-paper text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cobalt">Contact & Support</div>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight sm:text-6xl">Get help with MailMyPDF.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          For an order, workflow, account, privacy request, or product question, contact the support address below.
          Do not send passwords, payment-card details, or unnecessary sensitive documents by email.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <a href="mailto:support@mailmypdf.ai" className="rounded-2xl border border-rule bg-card p-7 transition hover:border-cobalt/40">
            <Mail className="h-6 w-6 text-cobalt" />
            <h2 className="mt-5 font-serif text-3xl">support@mailmypdf.ai</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Include the order or workflow reference when you have one, but do not include payment credentials.
            </p>
          </a>
          <div className="rounded-2xl border border-rule bg-card p-7">
            <ShieldCheck className="h-6 w-6 text-cobalt" />
            <h2 className="mt-5 font-serif text-3xl">Privacy or security question?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Review the published privacy, retention, and security information before sharing sensitive material.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-cobalt">
              <Link to="/security">Security & Trust</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/retention">Retention</Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
