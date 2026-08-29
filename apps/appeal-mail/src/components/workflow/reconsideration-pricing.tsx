import { getWorkflowPricingProfile, PRICES } from "@mailmypdf/pricing";

export function ReconsiderationPricing() {
  const profile = getWorkflowPricingProfile("reconsideration");
  if (!profile) return null;
  const base = profile.basePriceCents / 100;
  const standard = PRICES.standard / 100;
  const certified = PRICES.certified / 100;
  const registered = PRICES.registered / 100;
  const example = base + certified;

  return <section className="mx-auto max-w-6xl px-6 py-10">
    <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Transparent pricing</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Pay for the work and the physical packet—not a mystery flat fee.</h2></div>
        <p className="text-sm text-slate-500">Starting at ${base.toFixed(2)} before mailing and extra pages</p>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[["Preparation", `$${base.toFixed(2)}`],["Included pages", `${profile.includedPages} pages`],["Standard mail", `$${standard.toFixed(2)}`],["Certified mail", `$${certified.toFixed(2)}`],["Registered mail", `$${registered.toFixed(2)}`]].map(([label,value])=><div key={label} className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 font-semibold">{value}</div></div>)}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
        <p><strong>Example:</strong> a typical response with Certified Mail starts at ${example.toFixed(2)} before any additional supporting-document pages.</p>
        <p className="mt-2">The exact total is calculated from the approved physical packet before payment.</p>
      </div>
    </div>
  </section>;
}
