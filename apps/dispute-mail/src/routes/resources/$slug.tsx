import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, PackageCheck, ShieldCheck, AlertTriangle, FileWarning, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/resources/$slug")({
  head: () => ({ meta: [
    { title: "Guides — Dispute Mail" },
    { name: "description", content: "Guides for disputing credit errors, debt, and billing issues." },
  ] }),
  component: GuidePage,
});
function GuidePage() {
  const slug = Route.useParams().slug;
  const guides: Record<string, { title: string; category: string; readTime: string; content: React.ReactNode }> = {
    "fcra-credit-disputes": { title: "FCRA Credit Disputes: Your Rights Explained", category: "Credit Disputes", readTime: "5 min", content: <FCRAContent /> },
    "fdcpa-debt-validation": { title: "FDCPA Debt Validation: The 30-Day Rule", category: "Debt Validation", readTime: "4 min", content: <FDCPAContent /> },
    "medical-billing-disputes": { title: "How to Dispute a Medical Billing Error", category: "Billing Disputes", readTime: "5 min", content: <BillingContent /> },
  };
  const guide = guides[slug];
  if (!guide) return (<main className="min-h-screen bg-cream"><SiteHeader /><div className="container py-20 text-center"><h1 className="text-2xl font-bold text-teal-700">Guide not found</h1><Link to="/resources" className="btn-outline mt-6">Back to resources</Link></div><SiteFooter /></main>);
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <article>
        <section className="bg-white py-12 md:py-16 border-b border-warm-border"><div className="container max-w-2xl">
          <Link to="/resources" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-rose-600"><ArrowLeft size={15} /> All guides</Link>
          <div className="mt-4 flex items-center gap-3 text-xs text-slate-400"><span className="font-semibold text-rose-600">{guide.category}</span><span className="flex items-center gap-1"><Clock size={12} /> {guide.readTime}</span></div>
          <h1 className="mt-3 text-3xl font-bold text-teal-700 md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>{guide.title}</h1>
        </div></section>
        <section className="py-10 md:py-14"><div className="container max-w-2xl prose-content">{guide.content}</div></section>
        <section style={{ background: "linear-gradient(135deg, #2a2d3f 0%, #1a1d2e 100%)" }} className="py-12"><div className="container max-w-2xl text-center"><h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Ready to dispute?</h2><p className="mt-3 text-white/60">Start a guided workflow and get your dispute in the mail today.</p><Link to="/workflows/credit-report" className="btn-rose mt-6">Start now</Link></div></section>
      </article>
      <SiteFooter />
    </main>
  );
}
function H2({ children }: { children: React.ReactNode }) { return <h2 className="mt-10 text-xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{children}</h2>; }
function P({ children }: { children: React.ReactNode }) { return <p className="mt-4 text-sm leading-7 text-slate-500">{children}</p>; }
function UL({ children }: { children: React.ReactNode }) { return <ul className="mt-4 space-y-2 pl-5 text-sm text-slate-500" style={{ listStyle: "disc" }}>{children}</ul>; }
function Callout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "success" }) { const cls = type === "warning" ? "alert alert-warning" : type === "success" ? "alert alert-success" : "alert alert-info"; return <div className={`mt-6 ${cls}`}>{children}</div>; }

function FCRAContent() {
  return (<><P>The Fair Credit Reporting Act (FCRA) gives you the right to dispute inaccurate information on your credit report. Here's what you need to know.</P>
    <H2>Your rights under the FCRA</H2>
    <UL><li><strong>Right to dispute:</strong> You can dispute any information you believe is inaccurate, incomplete, or unverifiable</li><li><strong>30–45 day investigation:</strong> Credit bureaus must investigate within 30 days (45 if you add documentation after filing)</li><li><strong>Right to results:</strong> The bureau must tell you the results in writing</li><li><strong>Right to correction:</strong> If the information is inaccurate, it must be corrected or removed</li></UL>
    <Callout type="warning"><AlertTriangle size={16} className="inline mr-1" /> <strong>Important:</strong> You can dispute with the credit bureau, the furnisher (the company that reported the information), or both. Disputing with both maximizes your chances.</Callout>
    <H2>What to include in your dispute</H2>
    <UL><li>Your full name and address</li><li>Last 4 digits of your SSN</li><li>The specific item you're disputing and why</li><li>Any supporting documentation</li></UL>
    <Callout type="success"><PackageCheck size={16} className="inline mr-1" /> <strong>Tip:</strong> Mail your dispute certified with return receipt. The postmark proves you submitted within the investigation window.</Callout>
    <P className="text-xs text-slate-300 mt-8">This guide is for informational purposes only and does not constitute legal advice.</P></>);
}
function FDCPAContent() {
  return (<><P>The Fair Debt Collection Practices Act (FDCPA) gives you 30 days from first contact to request debt validation. Here's what that means and how to use it.</P>
    <H2>The 30-day rule</H2>
    <P>When a debt collector first contacts you, they must send a validation notice within 5 days. From that notice, you have 30 days to request validation of the debt.</P>
    <Callout type="warning"><AlertTriangle size={16} className="inline mr-1" /> <strong>Critical:</strong> The 30-day clock starts from first contact, not from when you receive the validation notice. Act quickly.</Callout>
    <H2>What to request</H2>
    <UL><li>Proof that you owe the debt</li><li>The amount of the debt</li><li>The name of the original creditor</li><li>Proof that the collector is licensed in your state (if applicable)</li></UL>
    <H2>Why mail certified?</H2>
    <P>If you request validation within 30 days, the collector must cease collection until they provide validation. Certified mail with return receipt proves you submitted your request on time.</P>
    <P className="text-xs text-slate-300 mt-8">This guide is for informational purposes only and does not constitute legal advice.</P></>);
}
function BillingContent() {
  return (<><P>Medical billing errors are surprisingly common. Studies estimate that a significant percentage of medical bills contain errors. Here's how to identify and dispute them.</P>
    <H2>Common billing errors</H2>
    <UL><li><strong>Duplicate charges:</strong> The same service billed twice</li><li><strong>Services not received:</strong> Charges for tests or procedures you didn't have</li><li><strong>Incorrect coding:</strong> Wrong billing codes that result in higher charges</li><li><strong>Upcoding:</strong> A more expensive service code than what was actually performed</li><li><strong>Cancelled services:</strong> Charges for services that were cancelled or rescheduled</li></UL>
    <Callout><FileWarning size={16} className="inline mr-1" /> <strong>Tip:</strong> Always request an itemized bill. You can't dispute what you can't see.</Callout>
    <H2>Steps to dispute</H2>
    <UL><li>Request an itemized bill from the provider</li><li>Review each line item against your records</li><li>Identify specific charges that are wrong</li><li>Write a dispute letter referencing each incorrect charge</li><li>Mail certified with return receipt</li></UL>
    <P className="text-xs text-slate-300 mt-8">This guide is for informational purposes only and does not constitute legal advice.</P></>);
}
