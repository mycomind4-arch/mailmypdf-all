/** Art direction follows the layout, while srcset lets the browser choose pixel density. */
export function HomepageHeroImage() {
  return (
    <picture className="block overflow-hidden rounded-lg border border-white/15 shadow-xl">
      <source
        media="(max-width: 639px)"
        srcSet="/homepage/hero-mobile-v2-400.webp 400w, /homepage/hero-mobile-v2-640.webp 640w, /homepage/hero-mobile-v2-960.webp 960w"
        sizes="calc(100vw - 40px)"
        width={960}
        height={960}
      />
      <img
        src="/homepage/hero-desktop-v2-1152.webp"
        srcSet="/homepage/hero-desktop-v2-768.webp 768w, /homepage/hero-desktop-v2-1152.webp 1152w, /homepage/hero-desktop-v2-1448.webp 1448w"
        sizes="(min-width: 1280px) 648px, (min-width: 1024px) 52vw, calc(100vw - 64px)"
        alt="MailMyPDF envelope, letter, and navy folder overlooking the coast at sunset"
        className="aspect-square h-auto w-full object-cover sm:aspect-[4/3]"
        width={1448}
        height={1086}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </picture>
  );
}
