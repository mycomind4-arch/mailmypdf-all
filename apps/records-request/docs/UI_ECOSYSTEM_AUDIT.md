# UI Ecosystem Audit — Records Requests

## Repositories Audited

| Repository | Stack | Theme |
|---|---|---|
| mailmypdf | SvelteKit + Tailwind v4 | Warm ivory "paper" — cobalt accent |
| notice-respond | SvelteKit + Tailwind v4 | Cream paper — emerald stamp accent |
| appeal-mail | SvelteKit + Tailwind v4 | Warm ivory paper — bronze stamp accent |
| dispute-mail | Vite + Tailwind | Cream background — teal/rose accent |
| immigration-mail | SvelteKit + Tailwind v4 | Warm ivory — brass/navy accent |
| records-requests | Next.js + plain CSS | **Dark green (#07100d) — outlier** |

## Shared Design Language Across Mature Verticals

### Typography
- **Display/headings:** Instrument Serif (editorial serif, weight 400, negative letter-spacing)
- **Body:** Inter (grotesk sans, 400/500/600/700)
- **Mono:** JetBrains Mono (used sparingly for labels/eyebrows)

### Color
- **Background:** Warm ivory / cream paper (oklch ~0.97 lightness, warm hue)
- **Text:** Deep charcoal ink with navy/slate undertone (oklch ~0.25 lightness)
- **Muted text:** Soft ink (oklch ~0.45)
- **Cards:** Near-white, slightly lighter than body background (oklch ~0.99)
- **Borders:** Subtle warm rule (oklch ~0.88)
- **Primary action:** Deep ink (dark button on light background)
- **Accent:** One muted accent per vertical (cobalt, emerald, bronze, brass) used for eyebrows, links, and highlights — never a rainbow

### Spacing & Radius
- Base radius: 0.625rem (10px)
- Cards: 14–18px border radius
- Section padding: 78–90px vertical
- Generous whitespace between sections

### Shadows
- Layered, subtle: 1px hairline + medium blur + large soft blur
- Never harsh drop shadows
- Hover states increase elevation slightly

### Components
- **Eyebrow labels:** uppercase, 0.13em letter-spacing, small (11–12px), accent color
- **Cards:** 1px border, warm background, layered shadow, 14–18px radius
- **Buttons:** rounded, primary = dark ink on paper, secondary = bordered
- **Badges/pills:** rounded-full, subtle tinted background
- **Navigation:** minimal top bar, no sidebar on public pages
- **Hero sections:** large serif headings, generous lede paragraph, clear CTA pair

### Layout
- Max content width: ~1180px for landing, ~980px for workflow pages, ~1000px for builders
- Consistent left/right padding (28px desktop, 20px mobile)
- No full-bleed sections — everything within the content container

### Mobile
- Single-column stacking below 900px
- Navigation collapses below 700px
- Font sizes reduce via clamp() or media queries
- No horizontal scroll

## Patterns Already Present in Records Requests

- Eyebrow labels (uppercase, letter-spaced) ✓
- Workflow card grid ✓
- Hero + CTA structure ✓
- Builder with progress indicator ✓
- Dashboard with sidebar ✓

## Inconsistencies (Critical)

1. **Dark green background** — every other vertical uses light paper. Records Requests is the only dark-themed app in the ecosystem.
2. **No serif display font** — ecosystem uses Instrument Serif for all headings; Records Requests uses only Inter.
3. **Green accent everywhere** — mature verticals use ink as primary, with one muted accent; Records Requests uses saturated green for buttons, borders, and highlights.
4. **No Google Fonts loaded** — layout.tsx doesn't import Instrument Serif or Inter; relies on system fallbacks.
5. **Developer language visible** — "v0.2 foundation", "Built for reusable domain workflows", "Evidence-first workflow foundation" appear on the dashboard.
6. **Duplicated builder** — a simple single-page builder at the dedicated route shadows the better 3-step generic builder.
7. **Form fields ungrouped** — Step 1 of the builder is a flat grid rather than logical groups (Matter / Identifiers / Time Range).
8. **Category cards lack descriptions** — the code-enforcement builder categories are checkboxes without context about what each record type covers.
9. **Review screen is minimal** — no scope summary, no clear edit vs. create distinction.
10. **Dashboard sidebar contains dev terms** — "Request Builder", "Production Audit", "Communications" sections are not real yet.

## Recommendations

1. **Switch to light paper aesthetic** matching the ecosystem — warm ivory background, deep ink text, one muted emerald accent.
2. **Load Instrument Serif + Inter** via Google Fonts in layout.tsx.
3. **Apply serif to all h1/h2/h3 headings**, keep Inter for body and UI.
4. **Remove all developer/internal language** from customer-facing surfaces.
5. **Replace the dedicated code-enforcement builder** with a polished 3-step version with grouped fields, descriptive categories, and a proper review checkpoint.
6. **Polish the dashboard** — remove fake nav links, remove "foundation" language, keep real data-driven behavior.
7. **Centralize form/card/button patterns** in CSS for cross-surface consistency.
8. **Ensure mobile responsiveness** across all surfaces.
9. **Add focus states and ARIA labels** for accessibility.
