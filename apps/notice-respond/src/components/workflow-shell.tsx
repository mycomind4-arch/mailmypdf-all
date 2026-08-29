import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProgressRail, RESPONSE_LIFECYCLE } from "@/components/ui-primitives";

export interface StepDef { id: string; label: string }

export interface MailOption {
  id: string;
  label: string;
  price: string;
  desc: string;
}

export const MAIL_OPTIONS: MailOption[] = [
  { id: "standard", label: "Standard", price: "$" + (499 / 100).toFixed(2), desc: "3–7 business days · Tracking included" },
  { id: "certified", label: "Certified", price: "$" + (1494 / 100).toFixed(2), desc: "Delivery tracking + confirmation · 3–7 days" },
  { id: "registered", label: "Registered", price: "$" + (3249 / 100).toFixed(2), desc: "Secure handling + tracking · 5–10 days" },
];

export function Stepper({ steps, current, onStep }: { steps: StepDef[]; current: number; onStep?: (i: number) => void }) {
  return (
    <ol className="flex items-center justify-between gap-1 overflow-x-auto" role="list">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex flex-1 shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onStep && i <= current && onStep(i)}
              disabled={i > current}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition-colors ${
                active ? "border-stamp bg-stamp text-accent-foreground"
                  : done ? "border-ink bg-ink text-primary-foreground"
                    : "border-rule bg-card text-muted-foreground"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? "✓" : String(i + 1).padStart(2, "0")}
            </button>
            <span className={`text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            {i < steps.length - 1 && <span className="flex-1 border-t border-dashed border-rule" />}
          </li>
        );
      })}
    </ol>
  );
}

export function WorkflowShell({
  title,
  steps,
  step,
  setStep,
  canContinue,
  onNext,
  onBack,
  children,
  finalLabel = "Pay and send",
}: {
  title: string;
  steps: StepDef[];
  step: number;
  setStep: (fn: (s: number) => number) => void;
  canContinue: boolean;
  onNext: () => void;
  onBack: () => void;
  children: ReactNode;
  finalLabel?: string;
}) {
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen command-center">
      <SiteHeader />
      {/* Command center top bar */}
      <div className="cmd-topbar">
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-serif text-lg">{title}</span>
              <span className="badge badge-amber">Stage {step + 1} of {steps.length}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {steps[step]?.label || "Working"}
            </div>
          </div>
        </div>
      </div>

      <div className="cmd-body">
        {/* Left rail — lifecycle */}
        <aside className="cmd-left" aria-label="Response lifecycle">
          <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Response Lifecycle
          </div>
          <ProgressRail
            steps={steps.map((s, i) => ({ id: s.id, label: s.label }))}
            currentStep={step}
            completedSteps={step}
          />
        </aside>

        {/* Center — main work area */}
        <main className="cmd-center">
          <div className="animate-fade-in">
            {children}

            <div className="mt-8 flex items-center justify-between border-t border-rule pt-6">
              <button
                onClick={onBack}
                disabled={step === 0}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                ← Back
              </button>
              <button
                onClick={onNext}
                disabled={!canContinue}
                className="inline-flex items-center gap-2 rounded-md bg-stamp px-6 py-3 text-sm font-semibold text-paper shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:transform-none disabled:shadow-none"
              >
                {isLast ? finalLabel : "Continue"} →
              </button>
            </div>
          </div>
        </main>

        {/* Right rail — context/status */}
        <aside className="cmd-right" aria-label="Context and status">
          <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Current Step
          </div>
          <div className="rounded-lg border border-rule bg-card p-4">
            <p className="text-sm font-semibold text-foreground">{steps[step]?.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Step {step + 1} of {steps.length}
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-rule bg-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Progress</div>
            <div className="mt-2 progress-track">
              <div
                className="progress-fill progress-fill-amber"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              {Math.round(((step + 1) / steps.length) * 100)}% complete
            </div>
          </div>
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}

export function Success({ title, href }: { title: string; href: string }) {
  return (
    <div className="min-h-screen command-center">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-32 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stamp/10">
          <svg className="h-8 w-8 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 font-serif text-4xl">{title}</h1>
        <p className="mt-3 text-muted-foreground">Your response is being prepared for mailing.</p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-rule/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Tracking number:</span>
          <span className="font-mono font-medium text-foreground">— Pending —</span>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="inline-flex items-center rounded-full border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
            Back to home
          </Link>
          <Link to={href} className="inline-flex items-center rounded-full bg-stamp px-5 py-2.5 text-sm font-medium text-paper shadow-stamp">
            Start another
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function UploadZone({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <label className="upload-zone mt-6 block">
      <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>
      <span className="mt-3 block font-medium text-foreground">{label}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{sublabel}</span>
      <input type="file" accept="application/pdf,image/jpeg,image/png" multiple className="sr-only" />
    </label>
  );
}

export function MailOptions({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {MAIL_OPTIONS.map((opt) => (
        <div key={opt.id} className={`mail-option ${selected === opt.id ? "selected" : ""}`} onClick={() => onSelect(opt.id)} role="button" tabIndex={0}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-foreground">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-lg">{opt.price}</p>
              {selected === opt.id && (
                <svg className="ml-auto h-4 w-4 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReviewChecks({ items, checks, setChecks }: { items: string[]; checks: boolean[]; setChecks: (fn: (c: boolean[]) => boolean[]) => void }) {
  return (
    <div className="mt-6 space-y-3">
      {items.map((item, i) => (
        <label key={item} className="check-card">
          <input type="checkbox" checked={checks[i]} onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
          {item}
        </label>
      ))}
    </div>
  );
}

export function RecipientForm({ recipient, setRecipient, orgPlaceholder }: { recipient: any; setRecipient: (fn: (r: any) => any) => void; orgPlaceholder?: string }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="input-label">Recipient name *</label>
        <input className="input-field" value={recipient.name} onChange={(e) => setRecipient((r) => ({ ...r, name: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className="input-label">Organization</label>
        <input className="input-field" value={recipient.org} onChange={(e) => setRecipient((r) => ({ ...r, org: e.target.value }))} placeholder={orgPlaceholder || "Organization"} />
      </div>
      <div className="sm:col-span-2">
        <label className="input-label">Address line 1 *</label>
        <input className="input-field" value={recipient.address1} onChange={(e) => setRecipient((r) => ({ ...r, address1: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className="input-label">Address line 2</label>
        <input className="input-field" value={recipient.address2} onChange={(e) => setRecipient((r) => ({ ...r, address2: e.target.value }))} />
      </div>
      <div>
        <label className="input-label">City *</label>
        <input className="input-field" value={recipient.city} onChange={(e) => setRecipient((r) => ({ ...r, city: e.target.value }))} />
      </div>
      <div>
        <label className="input-label">State *</label>
        <input className="input-field" value={recipient.state} onChange={(e) => setRecipient((r) => ({ ...r, state: e.target.value }))} />
      </div>
      <div>
        <label className="input-label">ZIP Code *</label>
        <input className="input-field" value={recipient.zip} onChange={(e) => setRecipient((r) => ({ ...r, zip: e.target.value }))} />
      </div>
    </div>
  );
}

export function CheckoutStep({ mailType, recipient }: { mailType: string; recipient: any }) {
  return (
    <div>
      <div className="postmark w-fit">Checkout</div>
      <h2 className="mt-4 font-serif text-3xl">Review and pay</h2>
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Mail type</span>
          <span className="font-medium text-foreground">{MAIL_OPTIONS.find((m) => m.id === mailType)?.label}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Recipient</span>
          <span className="font-medium text-foreground">{recipient.name || "—"}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Address</span>
          <span className="font-medium text-foreground">{recipient.address1 || "—"}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-rule/60 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Price</span>
          <span className="font-serif text-lg text-foreground">{MAIL_OPTIONS.find((m) => m.id === mailType)?.price}</span>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-rule bg-paper-deep p-3 text-xs text-muted-foreground">
        Payment confirms your selected mailing service. Required approval and fulfillment checks still apply.
      </div>
    </div>
  );
}
