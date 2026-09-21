# Homepage refinement — 2026-09-21

## Scope and visual direction

Preserve the user's coastal sunset, navy/ivory palette, serif headings, hero/card
layout, and top-level application routes. Tighten spacing and align cards rather
than redesigning the page. Shared shells and design tokens remain in use.
No authentication, workflow execution, payment, or mailing logic changed.

## Assets

Built-in image generation produced two coordinated compositions. Originals are
retained in `asset-intake/homepage-refinement/hero-desktop-v2.png` and
`asset-intake/homepage-refinement/hero-mobile-v2.png`. Prior homepage assets are
untouched. Production-facing derivatives live in `mailmypdf/public/homepage/`:

- `hero-desktop-v2-{768,1152,1448}.webp` (landscape; tablet/desktop/high-density).
- `hero-mobile-v2-{400,640,960}.webp` (square; art-directed for narrow screens).
- `hero-social-v2.jpg` (1200 × 900 social preview).
- Ten `*-card.webp` and two `*-optimized.webp` files compress existing imagery.

The hero component uses a native `picture` source below 640 CSS pixels, `srcset`,
layout-aware `sizes`, explicit dimensions, eager loading, high fetch priority,
and descriptive alternative text. It scales continuously rather than relying
on a separate page for each device. No new runtime dependencies.

Hero sizes: 36,152–171,472 bytes (the previous hero PNG was roughly 2.1 MB).
This measures asset bytes, not real-world Core Web Vitals or ranking changes.

## Generation prompts

Mode: built-in image tool, reference-based generation, not API/CLI fallback.

Desktop prompt:
Use case: product-mockup. Create a refined replacement for this MailMyPDF website hero photo, landscape 4:3 composition. Preserve the reference's coastal sunset, ocean rocks, navy blue folder, beautifully tactile white envelope and upright letter, premium blue pen, warm golden light and navy/ivory palette. Improve natural photographic realism, controlled highlights, elegant restrained composition and generous breathing space around the complete mailing packet. This is a general document mailing service, NOT a law firm: remove the law book, all court names, FILED stamps, case numbers and recipient addresses. Envelope has only the tasteful exact brand word 'MailMyPDF' in small navy type and a simple blue envelope emblem; document has small 'Your correspondence' heading with subtle abstract unreadable lines beneath. No promises, fake approval seals, real private data, buttons, headline overlays, watermark, or website UI. Product occupies central/right two-thirds with all envelope corners within 10% safe margins, coastline and sunset behind. Generate one polished image suitable for desktop and tablet hero.

Mobile prompt:
Use case: product-mockup. Make a coordinated MOBILE website hero variant of the reference image, square 1:1 output. Same exact visual identity: realistic coastal golden-hour sunset, blue ocean, warm textured rock, tactile white envelope with small exact 'MailMyPDF' navy wordmark and blue envelope emblem, white letter with 'Your correspondence' heading and subtle gray abstract text lines, navy folder and premium blue pen. Recompose rather than simply crop: center the complete envelope and upright letter, straighten envelope slightly, tuck pen neatly within frame, let product fill middle/lower 70% and coastline occupy upper30%. Keep all envelope corners within 8% safe margins so usable at 320px wide. Restrained premium photo, natural light, fine paper texture. No extra objects, court/official marks, addresses, badges, new text, UI, buttons or watermark. Preserve subject appearance and warm/navy/ivory colors from reference.

## SEO and content

- Descriptive page title and description, matching social metadata and new image.
- Existing environment-based canonical URL retained; no invented production host.
- Product-list structured data now matches the ten visible cards.
- Removed hidden homepage price offers, unsupported customer counts and an
  unsourced testimonial. Kept the banner layout with factual product copy.
- Product categories are discovery links, not claims of executable workflows.
- Main hero headline retained; supporting copy explains PDF/letter mailing.

References: [Google titles](https://developers.google.com/search/docs/appearance/title-link),
[responsive image guidance](https://developers.google.com/search/docs/appearance/google-images),
[structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

## Verification

- Hero render test first failed for the absent component, then passed. It checks
  mobile/desktop sources, priority, dimensions, alternative text, and asset paths.
- New hero component lint passed; route has pre-existing formatting drift.
- Build, responsive browser checks, and final SEO inspection: pending.
- The repository already has unrelated type/test failures; no blanket green claim.
- No deployment, push, live charges, provider submission, or legacy deletion.

## Preservation

The homepage route already had substantial uncommitted redesign work at task
start. It is preserved; edits apply to that design rather than reverting to HEAD.
The pre-task snapshot is `/tmp/mailmypdf-homepage-before.tsx` (local, temporary).
