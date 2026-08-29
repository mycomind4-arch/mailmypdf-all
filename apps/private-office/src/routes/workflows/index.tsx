import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Building2, Home, Landmark, ScrollText, Scale } from "lucide-react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import { workflows } from "@/domain/workflows";
import { workflowProfiles } from "@/domain/workflow-profiles";
import { workflowImages } from "@/lib/workflow-images";

export const Route = createFileRoute("/workflows/")({ component: WorkflowDirectory });

const workflowIcons: Record<string, typeof ShieldCheck> = {
  "contractor-dispute": Building2,
  "property-insurance-claim": Home,
  "bank-wire-dispute": Landmark,
  "trust-beneficiary-notice": ScrollText,
  "security-deposit-dispute": Scale,
};

function WorkflowDirectory() {
  return (
    <main className="min-h-screen bg-ivory">
      <PrivateOfficeChrome />

      <section className="border-b border-rule bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
          <div className="section-kicker">Private Office / Workflow Library</div>
          <h1 className="mt-3 text-4xl leading-tight text-charcoal md:text-5xl">
            Choose the matter.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone">
            Each workflow is an executable Gold Standard process with evidence, review, authorization, delivery, and proof built into the same control model.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-stone">
            <ShieldCheck size={14} className="text-brass" /> Consequential actions remain approval-gated
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(workflows).map((wf) => {
            const profile = workflowProfiles[wf.id];
            const Icon = workflowIcons[wf.id] ?? ShieldCheck;
            const image = workflowImages[wf.id];
            return (
              <Link
                key={wf.id}
                to={`/workflows/${wf.id}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-rule bg-paper transition-all duration-200 hover:border-navy/30 hover:shadow-premium"
              >
                {/* Image or gradient */}
                {image ? (
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-ivory-deep to-paper-deep">
                    <Icon size={40} className="text-stone-light" strokeWidth={1} />
                  </div>
                )}
                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-brass">
                    {profile?.family ?? "Private Matter"}
                  </div>
                  <h3 className="mt-2 text-xl text-charcoal">{wf.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-stone">
                    {profile?.outcome ?? wf.description}
                  </p>
                  {profile?.supportingKeywords && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {profile.supportingKeywords.slice(0, 3).map((kw) => (
                        <span key={kw} className="rounded border border-rule bg-ivory-deep px-2 py-1 font-mono text-[10px] text-stone">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-navy transition-colors group-hover:text-brass">
                    Start this matter <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

