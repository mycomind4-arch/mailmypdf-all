import { ArrowRight, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getWorkflowHeroImage } from "@/domain/workflow-hero-images";

interface WorkflowHeroProps {
  workflowId: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  features?: Array<{ title: string; description: string }>;
  ctaTo?: string;
  ctaLabel?: string;
  secondaryCtaTo?: string;
  secondaryCtaLabel?: string;
}

/**
 * Reusable hero section for workflow pages.
 * Uses a professional "private office" background image with
 * a dark overlay for text legibility.
 */
export function WorkflowHero({
  workflowId,
  eyebrow,
  title,
  subtitle,
  features,
  ctaTo,
  ctaLabel = "Start an Appeal",
  secondaryCtaTo,
  secondaryCtaLabel,
}: WorkflowHeroProps) {
  const image = getWorkflowHeroImage(workflowId);

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background image */}
      {image && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `url(${image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {/* Dark overlay for legibility — navy-charcoal gradient */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(26,29,41,0.92) 0%, rgba(26,29,41,0.78) 50%, rgba(26,29,41,0.85) 100%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stamp/90">
            {eyebrow}
          </p>
        )}
        <h1
          className="mt-4 max-w-4xl text-4xl font-bold tracking-tight hero-light md:text-5xl lg:text-6xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-6 max-w-3xl text-lg leading-8 hero-muted">
            {subtitle}
          </p>
        )}

        {features && features.length > 0 && (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border hero-border hero-bg-glass p-5 backdrop-blur-sm"
              >
                <h2 className="font-semibold hero-light">{f.title}</h2>
                <p className="mt-2 text-sm leading-6 hero-muted">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {(ctaTo || secondaryCtaTo) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {ctaTo && (
              <Link
                to={ctaTo}
                className="inline-flex items-center gap-2 rounded-full bg-stamp px-6 py-3 text-sm font-medium hero-light shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <Upload size={16} /> {ctaLabel} <ArrowRight size={16} />
              </Link>
            )}
            {secondaryCtaTo && secondaryCtaLabel && (
              <Link
                to={secondaryCtaTo}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-medium hero-light transition-colors hover:bg-white/10"
              >
                {secondaryCtaLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
