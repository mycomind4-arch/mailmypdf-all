import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageCheck, Clock, CheckCircle2, FileWarning, TrendingUp, Mail, ArrowRight, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "My Mailings — Dispute Mail" },
    { name: "description", content: "View your mailing history, tracking status, and delivery records." },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: DashboardPage,
});
const stats = [
  { label: "Total mailings", value: "6", icon: Mail, color: "text-teal-700" },
  { label: "In transit", value: "1", icon: PackageCheck, color: "text-rose-500" },
  { label: "Delivered", value: "5", icon: CheckCircle2, color: "text-rose-600" },
  { label: "Avg. delivery", value: "3.3 days", icon: Clock, color: "text-slate-400" },
];
const mailings = [
  { id: "DM-2026-0092", type: "Credit Report Dispute", recipient: "Equifax Dispute Dept", date: "Aug 11, 2026", status: "in_transit", mailType: "Certified + RR", tracking: "9405 5118 9956 4621 0045" },
  { id: "DM-2026-0088", type: "Debt Validation Request", recipient: "Midland Credit Management", date: "Aug 4, 2026", status: "delivered", mailType: "Certified + RR", tracking: "9405 5118 9956 4598 2210" },
  { id: "DM-2026-0081", type: "Billing Error Dispute", recipient: "St. Mary's Hospital Billing", date: "Jul 20, 2026", status: "delivered", mailType: "Certified", tracking: "9405 5118 9956 4512 0099" },
  { id: "DM-2026-0074", type: "Credit Report Dispute", recipient: "TransUnion Dispute Dept", date: "Jul 8, 2026", status: "delivered", mailType: "Certified + RR", tracking: "9405 5118 9956 4408 1156" },
  { id: "DM-2026-0069", type: "Credit Report Dispute", recipient: "Experian Dispute Dept", date: "Jul 8, 2026", status: "delivered", mailType: "Certified + RR", tracking: "9405 5118 9956 4308 8834" },
  { id: "DM-2026-0062", type: "Unauthorized Charge Dispute", recipient: "Chase Card Services", date: "Jun 22, 2026", status: "delivered", mailType: "Certified + RR", tracking: "9405 5118 9956 4208 5567" },
];
const statusConfig: Record<string, { label: string; badge: string }> = {
  in_transit: { label: "In transit", badge: "badge badge-rose" },
  delivered: { label: "Delivered", badge: "badge badge-green" },
};
function DashboardPage() {
  return (
    <main className="min-h-screen bg-cream"><SiteHeader />
      <section className="bg-white py-10 border-b border-warm-border"><div className="container">
        <div className="flex items-center justify-between flex-wrap gap-3"><div><h1 className="text-2xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>My Mailings</h1><p className="mt-1 text-sm text-slate-400">Track your disputes and delivery records.</p></div>
        <Link to="/workflows/credit-report" className="btn-rose">New mailing <ArrowRight size={16} /></Link></div>
      </div></section>
      <section className="py-8"><div className="container">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{stats.map(({ label, value, icon: Icon, color }) => (<div key={label} className="card p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{value}</p></div><Icon size={24} className={color} /></div></div>))}</div>
        <div className="mt-8 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-warm-border px-5 py-4"><h2 className="font-semibold text-teal-700">Recent mailings</h2><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" /><input className="input-field pl-9 py-2 text-sm" placeholder="Search mailings..." style={{ width: 200 }} /></div></div>
          <div className="hidden md:block"><table className="w-full text-sm"><thead className="bg-teal-50 text-left text-xs font-semibold text-teal-600"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Recipient</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Mail type</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-warm-border">{mailings.map((m) => (<tr key={m.id} className="hover:bg-cream transition-colors cursor-pointer"><td className="px-5 py-3.5 font-mono text-xs font-semibold text-teal-700">{m.id}</td><td className="px-5 py-3.5 text-slate-500">{m.type}</td><td className="px-5 py-3.5 text-slate-500">{m.recipient}</td><td className="px-5 py-3.5 text-slate-400">{m.date}</td><td className="px-5 py-3.5 text-slate-400">{m.mailType}</td><td className="px-5 py-3.5"><span className={statusConfig[m.status].badge}>{statusConfig[m.status].label}</span></td></tr>))}</tbody>
          </table></div>
          <div className="divide-y divide-warm-border md:hidden">{mailings.map((m) => (<div key={m.id} className="p-4"><div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold text-teal-700">{m.id}</span><span className={statusConfig[m.status].badge}>{statusConfig[m.status].label}</span></div><p className="mt-2 font-semibold text-teal-700">{m.type}</p><p className="mt-1 text-sm text-slate-400">{m.recipient}</p><div className="mt-2 flex items-center gap-3 text-xs text-slate-300"><span>{m.date}</span><span>·</span><span>{m.mailType}</span></div></div>))}</div>
        </div>
        <div className="mt-6 card p-5"><div className="flex items-center gap-2"><PackageCheck size={18} className="text-rose-500" /><h2 className="font-semibold text-teal-700">Latest tracking</h2></div><p className="mt-1 text-sm text-slate-400">DM-2026-0092 · Certified + Return Receipt</p>
          <div className="mt-4 space-y-4">{[{ date: "Aug 12, 9:30 AM", event: "Mailed from Austin, TX", done: true }, { date: "Aug 12, 2:15 PM", event: "Processed at USPS facility", done: true }, { date: "Aug 13", event: "In transit", done: false }, { date: "—", event: "Out for delivery", done: false }, { date: "—", event: "Delivered (signature required)", done: false }].map((step, i) => (<div key={i} className="flex items-start gap-3"><div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${step.done ? "bg-rose-50" : "bg-gray-100"}`}>{step.done ? <CheckCircle2 size={14} className="text-rose-500" /> : <span className="text-[10px] font-bold text-gray-400">{i + 1}</span>}</div><div><p className={`text-sm ${step.done ? "text-teal-700" : "text-slate-300"}`}>{step.event}</p><p className="text-xs text-slate-300">{step.date}</p></div></div>))}</div>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-dashed border-warm-border bg-white p-5 text-sm text-slate-400"><TrendingUp size={18} className="text-rose-500" /><span>Account features (save drafts, re-send, saved addresses) are coming when authentication launches.</span></div>
      </div></section>
      <SiteFooter />
    </main>
  );
}
