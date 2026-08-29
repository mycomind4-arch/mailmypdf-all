import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Lock, FileText, Trash2, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy Policy — Dispute Mail" },
    { name: "description", content: "How Dispute Mail collects, uses, stores, and protects your data and documents." },
  ] }),
  component: PrivacyPage,
});
const sections = [
  { title: "Information We Collect", body: "We collect information you provide directly: your name, email address, mailing addresses, correspondence content, and uploaded documents." },
  { title: "How We Use Your Information", body: "Your information is used solely to provide the Dispute Mail service. We never use your documents for marketing or training AI models." },
  { title: "Data Storage & Security", body: "All data is stored with industry-standard encryption. Documents are stored in private, access-controlled storage." },
  { title: "Document Handling", body: "Your documents are processed only to fulfill your mailing request. The final approved document is transmitted to our mailing partner." },
  { title: "Third-Party Services", body: "We use MailMyPDF (mailing fulfillment), Stripe (payment processing), and USPS (delivery)." },
  { title: "Your Rights", body: "You have the right to access, export, and delete your data at any time." },
  { title: "Data Retention", body: "Mailing records are retained for proof-of-submission documentation. Account data is deleted within 30 days of your deletion request." },
  { title: "Contact", body: "For privacy questions, contact us at privacy@disputemail.app." },
];
function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section className="bg-white py-16"><div className="container max-w-3xl">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50"><ShieldCheck size={20} className="text-teal-700" /></div><div><h1 className="text-3xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Privacy Policy</h1><p className="text-sm text-slate-400">Last updated: August 2026</p></div></div>
        <div className="alert alert-info mt-6"><Lock size={16} className="shrink-0" /> Your documents and case details are sensitive. This policy explains exactly how we handle them.</div>
        <div className="mt-8 space-y-6">{sections.map((s) => (<div key={s.title}><h2 className="text-lg font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{s.title}</h2><p className="mt-2 text-sm leading-7 text-slate-400">{s.body}</p></div>))}</div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3"><div className="card p-4 text-center"><FileText size={20} className="mx-auto text-rose-500" /><p className="mt-2 text-xs text-slate-400">Documents never used for marketing</p></div><div className="card p-4 text-center"><Trash2 size={20} className="mx-auto text-rose-500" /><p className="mt-2 text-xs text-slate-400">Delete your data anytime</p></div><div className="card p-4 text-center"><Mail size={20} className="mx-auto text-rose-500" /><p className="mt-2 text-xs text-slate-400">Contact us for any request</p></div></div>
      </div></section>
      <SiteFooter />
    </main>
  );
}
