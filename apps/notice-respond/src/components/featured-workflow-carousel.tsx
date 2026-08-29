import { useRef, useState, useCallback, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import type { NoticeWorkflow } from "@/components/notice-workflow-directory";

/**
 * Premium editorial carousel for featured workflows.
 * Uses native scroll-snap for smooth, performant scrolling
 * with custom arrow controls and pagination indicators.
 */
export function FeaturedWorkflowCarousel({ workflows }: { workflows: NoticeWorkflow[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    function updateVisible() {
      const w = window.innerWidth;
      if (w < 640) setVisibleCount(1);
      else if (w < 1024) setVisibleCount(2);
      else setVisibleCount(3);
    }
    updateVisible();
    window.addEventListener("resize", updateVisible);
    return () => window.removeEventListener("resize", updateVisible);
  }, []);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / workflows.length;
    const newIndex = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(newIndex, workflows.length - 1)));
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.offsetWidth - 4);
  }, [workflows.length]);

  useEffect(() => {
    updateScrollState();
  }, [updateScrollState, visibleCount]);

  function scrollByCards(direction: -1 | 1) {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / workflows.length;
    el.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  }

  // Card width classes: 1 card on mobile, 2 on tablet, 3 on desktop
  const cardWidthClass = "w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]";
  // Total dots = workflows.length - visibleCount + 1
  const dotCount = Math.max(1, workflows.length - visibleCount + 1);

  return (
    <div className="relative">
      {/* Header row with arrows */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="postmark w-fit">Featured workflows</div>
          <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
            Start with the problem, not the product name.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Each workflow is built around a distinct notice type. Select the situation you are dealing with to see what information matters and how the response process works.
          </p>
        </div>
        {/* Arrow controls — desktop only */}
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            onClick={() => scrollByCards(-1)}
            disabled={!canScrollLeft}
            aria-label="Previous workflows"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-card text-ink transition-all duration-200 hover:border-ink/30 hover:bg-paper-deep disabled:pointer-events-none disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scrollByCards(1)}
            disabled={!canScrollRight}
            aria-label="Next workflows"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-card text-ink transition-all duration-200 hover:border-ink/30 hover:bg-paper-deep disabled:pointer-events-none disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable carousel */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth"
      >
        {workflows.map((workflow, i) => (
          <div
            key={workflow.slug}
            className={`snap-start shrink-0 ${cardWidthClass}`}
          >
            <FeaturedWorkflowCard workflow={workflow} index={i} />
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      <div className="mt-6 flex items-center justify-center gap-2">
        {Array.from({ length: workflows.length }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? "w-6 bg-stamp" : "w-1.5 bg-rule"
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Browse all link */}
      <div className="mt-8 text-center">
        <Link
          to="/workflows"
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3 text-sm font-medium transition-all duration-200 hover:border-ink/30 hover:shadow-card"
        >
          Browse all notice types
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H9M17 7v8" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/**
 * Refined card for the featured carousel.
 * Editorial layout with accent bar, numbered index, and clean hierarchy.
 */
function FeaturedWorkflowCard({ workflow, index }: { workflow: NoticeWorkflow; index: number }) {
  return (
    <Link
      to={workflow.route}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-rule bg-card transition-all duration-200 hover:border-ink/25 hover:shadow-premium"
    >
      {/* Accent bar */}
      <div className="h-px w-full bg-gradient-to-r from-stamp/0 via-stamp/40 to-stamp/0 transition-opacity duration-200 group-hover:via-stamp/70" />

      <div className="flex flex-1 flex-col p-6">
        {/* Index + category row */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-stamp/80 uppercase">
            {String(index + 1).padStart(2, "0")} · {workflow.category}
          </span>
          <svg
            className="h-4 w-4 text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-stamp"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H9M17 7v8" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="mt-5 font-serif text-xl leading-snug text-ink transition-colors duration-200 group-hover:text-stamp">
          {workflow.title}
        </h3>

        {/* Description */}
        <p className="mt-2.5 flex-1 text-[13px] leading-6 text-muted-foreground">
          {workflow.description}
        </p>

        {/* Best for — minimal footer */}
        <div className="mt-5 flex items-start gap-2 border-t border-rule/40 pt-4">
          <span className="mt-0.5 font-mono text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/70 uppercase shrink-0">
            Best for
          </span>
          <span className="text-[12px] leading-5 text-ink-soft">
            {workflow.bestFor}
          </span>
        </div>
      </div>
    </Link>
  );
}
