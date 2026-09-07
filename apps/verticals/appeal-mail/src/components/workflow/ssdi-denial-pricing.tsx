import { SSDI_DENIAL_PRICING } from "@/domain/ssdi-denial-pricing";

export function SsdiDenialPricing() {
  // This workflow's own pricing (a separate, distinct workflow from
  // "ssdi-appeal", which has its own canonical profile) — previously this
  // read getWorkflowPricingProfile("ssdi-denial"), showing that canonical
  // profile's $69.99 base here while approve.ts/checkout.ts actually
  // approve and charge SSDI_DENIAL_PRICING's $24.99 base. Use this
  // workflow's real pricing module so the displayed price matches what's
  // approved and charged.
  const base = SSDI_DENIAL_PRICING.preparationFee;
  const includedPages = SSDI_DENIAL_PRICING.includedResponsePages;
  const standard = SSDI_DENIAL_PRICING.standardMail;
  const certified = SSDI_DENIAL_PRICING.certifiedMail;
  const registered = SSDI_DENIAL_PRICING.registeredMail;
  const example = base + certified;

  return <section className="mx-auto max-w-6xl px-6 py-10">
    <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Transparent pricing</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Pay for the work and the physical packet—not a mystery flat fee.</h2></div>
        <p className="text-sm text-slate-500">Starting at ${base.toFixed(2)} before mailing and extra pages</p>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[["Preparation", `$${base.toFixed(2)}`],["Included pages", `${includedPages} pages`],["Extra response page", "$0.40/sheet"],["Supporting evidence", "$0.25/sheet"],["Standard mail", `$${standard.toFixed(2)}`],["Certified mail", `$${certified.toFixed(2)}`],["Registered mail", `$${registered.toFixed(2)}`]].map(([label,value])=><div key={label} className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 font-semibold">{value}</div></div>)}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
        <p><strong>Example:</strong> a typical response with Certified Mail starts at ${example.toFixed(2)} before any additional supporting-document pages.</p>
        <p className="mt-2">The exact total is calculated from the approved physical packet before payment.</p>
      </div>
    </div>
  </section>;
}
