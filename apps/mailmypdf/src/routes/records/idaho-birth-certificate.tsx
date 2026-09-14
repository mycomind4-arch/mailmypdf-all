import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import {
  IDAHO_BIRTH_CERTIFICATE_WORKFLOW,
  calculateIdahoBirthCertificateStateFeeCents,
  resolveIdahoBirthCertificateRecipient,
} from "@/products/vital-records/idaho-birth-certificate";

export const Route = createFileRoute("/records/idaho-birth-certificate")({
  head: () => ({
    meta: [
      { title: "Request an Idaho Birth Certificate by Mail | MailMyPDF" },
      {
        name: "description",
        content:
          "Prepare an Idaho birth certificate request with the correct statewide Vital Records destination, state fee calculation, ID checklist, and mailing instructions.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: IdahoBirthCertificateWorkflow,
});

type FormState = {
  applicantName: string;
  applicantAddress: string;
  applicantCity: string;
  applicantState: string;
  applicantZip: string;
  phone: string;
  email: string;
  subjectFirst: string;
  subjectMiddle: string;
  subjectLast: string;
  dateOfBirth: string;
  cityOfBirth: string;
  countyOfBirth: string;
  parentOneRole: "Mother" | "Father";
  parentOneName: string;
  parentOneLastAtBirth: string;
  parentTwoRole: "Mother" | "Father";
  parentTwoName: string;
  parentTwoLastAtBirth: string;
  relationship: string;
  purpose: string;
  copies: number;
  copyType: "Certified copy" | "Certified photocopy";
  rush: boolean;
  directInterestConfirmed: boolean;
};

const EMPTY: FormState = {
  applicantName: "",
  applicantAddress: "",
  applicantCity: "",
  applicantState: "",
  applicantZip: "",
  phone: "",
  email: "",
  subjectFirst: "",
  subjectMiddle: "",
  subjectLast: "",
  dateOfBirth: "",
  cityOfBirth: "",
  countyOfBirth: "",
  parentOneRole: "Mother",
  parentOneName: "",
  parentOneLastAtBirth: "",
  parentTwoRole: "Father",
  parentTwoName: "",
  parentTwoLastAtBirth: "",
  relationship: "Self",
  purpose: "Personal Records/Use",
  copies: 1,
  copyType: "Certified copy",
  rush: false,
  directInterestConfirmed: false,
};

const relationships = [
  "Self",
  "Parent",
  "Child",
  "Current Spouse",
  "Brother/Sister",
  "Grandchild",
  "Maternal Grandparent",
  "Paternal Grandparent",
  "Attorney",
  "Legal Guardian",
  "Government Agency",
  "Other",
];

const purposes = [
  "ID/Passport",
  "Personal Records/Use",
  "School/Sports",
  "Legal Purposes",
  "Insurance/Benefits",
  "Family History",
  "Estate Settlement",
  "Pending Adoption",
  "Other",
];

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function requiredComplete(form: FormState) {
  return Boolean(
    form.applicantName.trim() &&
      form.applicantAddress.trim() &&
      form.applicantCity.trim() &&
      form.applicantState.trim() &&
      form.applicantZip.trim() &&
      form.phone.trim() &&
      form.email.trim() &&
      form.subjectFirst.trim() &&
      form.subjectLast.trim() &&
      form.dateOfBirth &&
      form.cityOfBirth.trim() &&
      form.relationship &&
      form.purpose &&
      form.directInterestConfirmed,
  );
}

function buildRequestLetter(form: FormState) {
  const recipient = resolveIdahoBirthCertificateRecipient(form.countyOfBirth);
  const fee = calculateIdahoBirthCertificateStateFeeCents(form.copies, form.rush);
  const subjectName = [form.subjectFirst, form.subjectMiddle, form.subjectLast].filter(Boolean).join(" ");

  return `${recipient.name}\n${recipient.line1}\n${recipient.city}, ${recipient.state} ${recipient.postalCode}\n\nRe: Request for Idaho Birth Certificate\n\nTo Idaho Vital Records:\n\nI am requesting ${form.copies} ${form.copyType.toLowerCase()}${form.copies === 1 ? "" : "s"} for the Idaho birth record described below.\n\nAPPLICANT INFORMATION\nName: ${form.applicantName}\nAddress: ${form.applicantAddress}\nCity/State/ZIP: ${form.applicantCity}, ${form.applicantState} ${form.applicantZip}\nDaytime phone: ${form.phone}\nEmail: ${form.email}\nRelationship to person named on certificate: ${form.relationship}\nPurpose: ${form.purpose}\n\nCERTIFICATE INFORMATION\nName on certificate: ${subjectName}\nDate of birth: ${form.dateOfBirth}\nCity of birth in Idaho: ${form.cityOfBirth}${form.countyOfBirth ? `\nCounty of birth (supplemental locator): ${form.countyOfBirth}` : ""}\n${form.parentOneRole}: ${form.parentOneName || "Not provided"}${form.parentOneLastAtBirth ? `; last name at birth: ${form.parentOneLastAtBirth}` : ""}\n${form.parentTwoRole}: ${form.parentTwoName || "Not provided"}${form.parentTwoLastAtBirth ? `; last name at birth: ${form.parentTwoLastAtBirth}` : ""}\n\nORDER\nCopies: ${form.copies}\nType: ${form.copyType}\nRush service: ${form.rush ? "Yes" : "No"}\nState fee enclosed: ${money(fee)}\n\nI certify that the information in this request is accurate and that I am eligible to request this confidential vital record.\n\nApplicant signature: ____________________________________\nDate: __________________\n\nEnclosures:\n- Copy of acceptable current identification\n- Signed check or money order payable to Idaho Vital Records in the amount of ${money(fee)}\n`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#17201d]">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "mt-2 w-full rounded-xl border border-[#17201d]/15 bg-white px-3 py-3 text-sm outline-none focus:border-[#4f6f62]/60";

function IdahoBirthCertificateWorkflow() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [step, setStep] = useState<0 | 1>(0);
  const [error, setError] = useState("");
  const fee = calculateIdahoBirthCertificateStateFeeCents(form.copies, form.rush);
  const recipient = resolveIdahoBirthCertificateRecipient(form.countyOfBirth);
  const letter = useMemo(() => buildRequestLetter(form), [form]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  function continueToReview() {
    if (!requiredComplete(form)) {
      setError("Complete the required applicant and birth-record information and confirm eligibility before continuing.");
      return;
    }
    setError("");
    setStep(1);
  }

  async function copyLetter() {
    await navigator.clipboard.writeText(letter);
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17201d]">
      <SiteHeader />
      <main>
        <section className="border-b border-black/10 bg-[#edf1ed]">
          <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#4f6f62]">Vital records · Idaho</p>
            <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-[.98] md:text-7xl">Request an Idaho birth certificate by mail.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#17201d]/65">
              One statewide workflow. Your city and optional county help identify the birth record, but every mailed Idaho request goes to the same Bureau of Vital Records in Boise.
            </p>
            <div className="mt-8 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-[#4f6f62]/20 bg-white/70 px-3 py-2">Statewide routing</span>
              <span className="rounded-full border border-[#4f6f62]/20 bg-white/70 px-3 py-2">$16 per certificate/search</span>
              <span className="rounded-full border border-[#4f6f62]/20 bg-white/70 px-3 py-2">Optional $10 rush fee</span>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[.7fr_1.3fr]">
          <aside className="space-y-5">
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#4f6f62]">Correct destination</p>
              <p className="mt-3 font-semibold">{recipient.name}</p>
              <p className="mt-1 text-sm leading-6 text-[#17201d]/60">{recipient.line1}<br />{recipient.city}, {recipient.state} {recipient.postalCode}</p>
              <p className="mt-4 text-xs leading-5 text-[#17201d]/50">County of birth does not change this address.</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-800">Physical payment required</p>
              <p className="mt-2 text-sm leading-6 text-amber-900/80">
                Idaho currently requires a signed check or money order with a mailed request. MailMyPDF can prepare this packet, but end-to-end platform mailing stays disabled until a compliant physical-payment enclosure is supported.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-sm font-semibold">What the envelope needs</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#17201d]/65">
                {IDAHO_BIRTH_CERTIFICATE_WORKFLOW.requiredMailEnclosures.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </aside>

          <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_20px_70px_rgba(23,32,29,.07)]">
            <div className="border-b border-black/10 px-6 py-5">
              <div className="grid grid-cols-2 gap-2">
                {["Request details", "Review packet"].map((label, index) => (
                  <div key={label}>
                    <div className={`h-1 rounded-full ${index <= step ? "bg-[#4f6f62]" : "bg-black/10"}`} />
                    <p className={`mt-2 text-xs ${index === step ? "font-semibold" : "text-black/40"}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-8">
              {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

              {step === 0 ? (
                <div className="space-y-8">
                  <div>
                    <h2 className="font-serif text-3xl">Applicant</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field label="Full legal name *"><input className={inputClass} value={form.applicantName} onChange={(e) => set("applicantName", e.target.value)} /></Field>
                      <Field label="Daytime phone *"><input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
                      <Field label="Street address *"><input className={inputClass} value={form.applicantAddress} onChange={(e) => set("applicantAddress", e.target.value)} /></Field>
                      <Field label="Email *"><input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
                      <Field label="City *"><input className={inputClass} value={form.applicantCity} onChange={(e) => set("applicantCity", e.target.value)} /></Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="State *"><input maxLength={2} className={inputClass} value={form.applicantState} onChange={(e) => set("applicantState", e.target.value.toUpperCase())} /></Field>
                        <Field label="ZIP *"><input className={inputClass} value={form.applicantZip} onChange={(e) => set("applicantZip", e.target.value)} /></Field>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-black/10 pt-7">
                    <h2 className="font-serif text-3xl">Birth record</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field label="First name on certificate *"><input className={inputClass} value={form.subjectFirst} onChange={(e) => set("subjectFirst", e.target.value)} /></Field>
                      <Field label="Middle name"><input className={inputClass} value={form.subjectMiddle} onChange={(e) => set("subjectMiddle", e.target.value)} /></Field>
                      <Field label="Last name on certificate *"><input className={inputClass} value={form.subjectLast} onChange={(e) => set("subjectLast", e.target.value)} /></Field>
                      <Field label="Date of birth *"><input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
                      <Field label="City of birth in Idaho *"><input className={inputClass} value={form.cityOfBirth} onChange={(e) => set("cityOfBirth", e.target.value)} /></Field>
                      <Field label="County of birth (optional)"><input className={inputClass} value={form.countyOfBirth} onChange={(e) => set("countyOfBirth", e.target.value)} /><span className="mt-1 block text-xs text-black/45">Supplemental locator only; it does not change routing.</span></Field>
                    </div>
                  </div>

                  <div className="border-t border-black/10 pt-7">
                    <h2 className="font-serif text-3xl">Parents</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-black/10 p-4">
                        <select className={inputClass} value={form.parentOneRole} onChange={(e) => set("parentOneRole", e.target.value as "Mother" | "Father")}><option>Mother</option><option>Father</option></select>
                        <input placeholder="Full name" className={inputClass} value={form.parentOneName} onChange={(e) => set("parentOneName", e.target.value)} />
                        <input placeholder="Last name at birth" className={inputClass} value={form.parentOneLastAtBirth} onChange={(e) => set("parentOneLastAtBirth", e.target.value)} />
                      </div>
                      <div className="rounded-2xl border border-black/10 p-4">
                        <select className={inputClass} value={form.parentTwoRole} onChange={(e) => set("parentTwoRole", e.target.value as "Mother" | "Father")}><option>Father</option><option>Mother</option></select>
                        <input placeholder="Full name" className={inputClass} value={form.parentTwoName} onChange={(e) => set("parentTwoName", e.target.value)} />
                        <input placeholder="Last name at birth" className={inputClass} value={form.parentTwoLastAtBirth} onChange={(e) => set("parentTwoLastAtBirth", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-black/10 pt-7">
                    <h2 className="font-serif text-3xl">Eligibility & order</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field label="Relationship to person on certificate *"><select className={inputClass} value={form.relationship} onChange={(e) => set("relationship", e.target.value)}>{relationships.map((x) => <option key={x}>{x}</option>)}</select></Field>
                      <Field label="Purpose *"><select className={inputClass} value={form.purpose} onChange={(e) => set("purpose", e.target.value)}>{purposes.map((x) => <option key={x}>{x}</option>)}</select></Field>
                      <Field label="Certificate type"><select className={inputClass} value={form.copyType} onChange={(e) => set("copyType", e.target.value as FormState["copyType"])}><option>Certified copy</option><option>Certified photocopy</option></select></Field>
                      <Field label="Number of copies"><input type="number" min={1} max={20} className={inputClass} value={form.copies} onChange={(e) => set("copies", Math.max(1, Number(e.target.value) || 1))} /></Field>
                    </div>
                    <label className="mt-5 flex items-start gap-3 rounded-xl border border-black/10 p-4 text-sm"><input type="checkbox" className="mt-1" checked={form.rush} onChange={(e) => set("rush", e.target.checked)} /><span>Add Idaho rush processing (+$10 one-time state fee). Write <strong>RUSH</strong> on the outside of the envelope.</span></label>
                    <label className="mt-3 flex items-start gap-3 rounded-xl border border-black/10 p-4 text-sm"><input type="checkbox" className="mt-1" checked={form.directInterestConfirmed} onChange={(e) => set("directInterestConfirmed", e.target.checked)} /><span>I confirm I have a direct and tangible interest in this record and understand Idaho may require proof of relationship. *</span></label>
                    <div className="mt-5 rounded-xl bg-[#edf1ed] p-4"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#4f6f62]">State fee to enclose</p><p className="mt-1 font-serif text-3xl">{money(fee)}</p><p className="mt-1 text-xs text-black/50">Payable by signed check or money order to Idaho Vital Records.</p></div>
                  </div>

                  <button onClick={continueToReview} className="w-full rounded-full bg-[#355346] px-6 py-4 text-sm font-semibold text-white hover:opacity-90">Review request packet →</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#4f6f62]">Generated signed-letter alternative</p>
                    <h2 className="mt-2 font-serif text-3xl">Review before you print and sign.</h2>
                    <p className="mt-2 text-sm leading-6 text-black/55">Idaho permits a signed letter containing the necessary information instead of its standard birth request form. Review every field before using it.</p>
                  </div>
                  <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-2xl border border-black/10 bg-[#fbfaf7] p-5 font-mono text-xs leading-6">{letter}</pre>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950/80">
                    <strong>Do not mail this request by itself.</strong> Print and sign the request, include the required ID copy, and include a signed check or money order for {money(fee)} payable to Idaho Vital Records. MailMyPDF's automated mailing action is disabled for this workflow until the physical payment enclosure can be handled correctly.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button onClick={() => setStep(0)} className="rounded-full border border-black/15 px-5 py-3 text-sm font-semibold">← Edit</button>
                    <button onClick={copyLetter} className="rounded-full border border-[#355346]/30 px-5 py-3 text-sm font-semibold text-[#355346]">Copy request letter</button>
                    <button onClick={() => window.print()} className="rounded-full bg-[#355346] px-5 py-3 text-sm font-semibold text-white">Print / save PDF</button>
                  </div>
                  <div className="border-t border-black/10 pt-5 text-xs leading-5 text-black/50">
                    Official Idaho guidance was reviewed {IDAHO_BIRTH_CERTIFICATE_WORKFLOW.sourceReviewedAt}. This workflow prepares paperwork and does not determine legal eligibility. Current agency instructions control if they change.
                  </div>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
