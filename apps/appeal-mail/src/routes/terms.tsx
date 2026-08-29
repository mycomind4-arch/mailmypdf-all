import { createFileRoute } from "@tanstack/react-router";
import { FileText, ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Appeal Mail" },
      { name: "description", content: "Terms of service for Appeal Mail." },
      { property: "og:title", content: "Terms of Service — Appeal Mail" },
      { property: "og:description", content: "Terms of service for Appeal Mail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Terms of Service — Appeal Mail" },
      { name: "twitter:description", content: "Terms of service for Appeal Mail." },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});
const sections = [
  { title: "Acceptance of Terms", body: "By using Appeal Mail, you agree to these Terms of Service." },
  { title: "Description of Service", body: "Appeal Mail provides guided workflows for preparing appeal letters and physical mailing services via USPS." },
  { title: "Not Legal Advice", body: "Appeal Mail is not a law firm. We do not provide legal advice or representation. The AI assistant organizes information you provide but does not invent facts or draw legal conclusions." },
  { title: "User Responsibilities", body: "You are responsible for the accuracy of all information. You must review every draft before approving it for mailing. You are responsible for meeting all applicable deadlines." },
  { title: "Acceptable Use", body: "You agree not to use Appeal Mail to send fraudulent or misleading correspondence." },
  { title: "Payment & Refunds", body: "Payment is processed via Stripe before mailing. Refunds are available if the mailing hasn't been submitted for processing." },
  { title: "Limitation of Liability", body: "Appeal Mail is provided 'as is.' We are not liable for outcomes related to your correspondence. Our liability is limited to the cost of the mailing service." },
  { title: "Contact", body: "For questions about these terms, contact us at support@appealmail.app." },
];
function TermsPage() {
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section className="bg-white py-16"><div className="container max-w-3xl">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50"><FileText size={20} className="text-indigo-700" /></div><div><h1 className="text-3xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Terms of Service</h1><p className="text-sm text-slate-400">Last updated: August 2026</p></div></div>
        <div className="alert alert-warning mt-6"><ShieldAlert size={18} className="shrink-0" /><div><strong>Important:</strong> Appeal Mail is not a law firm and does not provide legal advice.</div></div>
        <div className="mt-8 space-y-6">{sections.map((s) => (<div key={s.title}><h2 className="text-lg font-semibold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>{s.title}</h2><p className="mt-2 text-sm leading-7 text-slate-400">{s.body}</p></div>))}</div>
      </div></section>
      <SiteFooter />
    </main>
  );
}
