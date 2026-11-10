# VIBE Design System — Marketing Landing

Design reference for the marketing landing page. The **app** (dashboard) uses the shadcn/ui default system. This file covers the **marketing site** aesthetic only: cinematic gold-on-black luxury.

## Identity

- **Aesthetic**: Bloomberg terminal × Apple keynote × luxury brand. Dark, cinematic, gold-accented. The opposite of generic blue/white SaaS.
- **Differentiation anchor**: VIBE stands for **Vertically Integrated Business Enterprise** — the only CRM for owner-operators running real estate + mortgage + insurance + title + construction + property management + investing under one roof. Every design decision leans into the "empire, not a tool" posture.
- **Mood**: premium, deliberate, quiet authority.
- **Wordmark rule**: never append "CRM" to the wordmark. The wordmark is **VIBE**. The acronym expansion **VERTICAL INTEGRATION BUSINESS ENTERPRISE** may appear as a hairline subtitle under the mark. "CRM" as a category word is fine in body copy when needed for search/clarity, but never as a logo subscript.

## Colors

### Core
- **Ink**: `#0A0A0F` — dominant background (near-black with a whisper of indigo)
- **Graphite**: `#14141D` — raised surface one level up from ink
- **Charcoal**: `#1A1A2E` — transition band between dark and light zones
- **Bone**: `#FAFAFA` — light sections (trust-building middle zones)
- **Bone warm tint**: rgba(250, 247, 240, 1) — bone with a hair of warm undertone

### Accents
- **Gold**: `#D4A017` — signature accent. Used on wordmark, hero CTA, active states, gold-cascade checkmarks.
- **Gold hi**: `#E8BC3A` — hover state / highlight
- **Gold lo**: `#8C6A0F` — pressed state / deep shadow of gold surfaces
- **Bronze shadow**: `rgba(212, 160, 23, 0.15)` — ambient glow around gold elements

### Text on ink
- **Text high**: `#F4F4F5` (zinc-100) — headlines, body on dark
- **Text mid**: `#A1A1AA` (zinc-400) — supporting copy on dark
- **Text low**: `#52525B` (zinc-600) — hairline meta, dividers labels

### Text on bone
- **Text high (light)**: `#09090B` — headlines on bone
- **Text mid (light)**: `#52525B`
- **Text low (light)**: `#A1A1AA`

### Semantic
- Success: `#16A34A`
- Danger: `#DC2626`

All gold-on-ink combinations WCAG-audited:
- Gold `#D4A017` on Ink `#0A0A0F` = 9.2:1 (AAA for normal text)
- Gold `#D4A017` on Bone `#FAFAFA` = 2.58:1 (fails AA — **never use gold on bone for body text**; gold on bone is decorative only, e.g. rules/dividers)
- Text high `#F4F4F5` on Ink = 16.8:1 (AAA)

## Typography

### Stack
- **Display (headlines, wordmark, section leads)**: **Instrument Serif** — 400 regular, italic. Google Fonts. Free. Pairs with the luxury cinematic posture; avoids the Playfair trope.
- **Body (paragraphs, UI, labels)**: **Geist** — 400/500/600. Google Fonts. Modern, confident, not Inter.
- **Mono (data, metrics, tickers, tech stack)**: **Geist Mono** — 400/500. Same family system; consistent rhythm.

### Scale (marketing landing)
- **hero**: clamp(48px, 7vw, 92px) / line-height 1.02, letter-spacing -0.02em
- **h1**: clamp(36px, 4.5vw, 64px) / 1.05
- **h2**: clamp(28px, 3.2vw, 44px) / 1.1
- **h3**: 24px / 1.2
- **body-lg**: 18px / 1.55
- **body**: 16px / 1.6
- **caption**: 13px / 1.45
- **micro**: 11px tracked 0.16em uppercase — eyebrow labels, section numbers

### Rules
- Serif display ONLY on hero, section headings, the wordmark. Never on body.
- Italic serif is reserved for the differentiation line: "*one lead, every business line.*"
- Body copy uses Geist weight 400. Geist 500 for button labels and link affordances. Geist 600 sparingly.
- Headlines are sentence case, not title case. Marketing-speak is banned.

## Spacing
4px base. Tailwind default scale is fine. Marketing sections use 2xl–4xl page rhythm: `py-24` desktop, `py-16` mobile minimum; hero is `min-h-[92vh]`.

## Radius
- Buttons: `rounded-full` for pill primary CTA, `rounded-md` for secondary
- Cards: `rounded-xl` (12px) for hero glass cards, `rounded-2xl` (16px) for the Founding 50 holo card
- Input: `rounded-full` on the waitlist input (distinctive, matches hero CTA)

## Shadows
All shadows on ink are subtle — darkness carries the elevation. Gold elements use a **glow** (box-shadow tinted gold) rather than a neutral drop shadow.

- Surface raise (on ink): `shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_60px_-20px_rgba(0,0,0,0.6)]`
- Gold glow (hero CTA): `shadow-[0_0_0_1px_rgba(212,160,23,0.5),0_18px_60px_-12px_rgba(212,160,23,0.35)]`
- Bone card shadow: `shadow-[0_1px_2px_rgba(9,9,11,0.04),0_20px_40px_-20px_rgba(9,9,11,0.12)]`

## Motion

- **Philosophy**: deliberate. Every animation earns its place. Never decorative-only.
- **Durations**: 180ms quick, 320ms standard, 600ms entrance, 1200ms hero logo reveal
- **Easing**: `cubic-bezier(0.22, 1, 0.36, 1)` (out-expo) for entrances; `cubic-bezier(0.4, 0, 0.2, 1)` for hover
- **Entrance pattern**: `opacity 0 → 1, translateY(12px) → 0`, staggered by 60ms per child
- **Scroll reveals**: gated by IntersectionObserver, `once` — no re-animate on re-enter
- **Hover on CTA**: gold glow intensifies, not a lift — the landing's job is to feel grounded, cinematic
- **Reduced-motion**: `@media (prefers-reduced-motion: reduce)` cancels all entrance animations, disables parallax, keeps content readable

## Layout

- **Max width**: 1200px content wrapper (`max-w-7xl`), 960px for prose blocks
- **Grid**: 12 column desktop with 24px gutter; 4 column mobile
- **Section rhythm**: every section declares its own bg (ink / graphite / bone). Transitions between dark and light use a 1px gold hairline rule (`<hr>`) not a gradient fade — mutes the "stacked linear-gradient" slop.
- **Breakpoints**: sm `640`, md `768`, lg `1024`, xl `1280` (Tailwind defaults)

## Section Library (marketing landing)

All below live under `src/app/page.tsx` and related `src/components/landing/*`. Shipped in pragmatic priority order — section 1/2/3/4/6/8/9 are V1; 5, 7, 7.5, 7.75 follow-up.

1. **Hero (dark)** — wordmark (VIBE + acronym subtitle hairline) + eyebrow label + headline in serif + sub-headline + gold pill CTA (spots remaining counter) + scroll indicator
2. **Pain points (dark)** — six forum-style quotes in a floating grid, each with source attribution. Numeric ticker: "462 real estate professionals posted about these problems this month"
3. **What VIBE solves (graphite)** — 4-pillar grid. Unified leads / Multi-site capture / Owner dashboards / Communication hub
4. **Competitor battlefield (bone)** — comparison table. VIBE column gold, competitors desaturated. Team-size slider = nice-to-have, ship table first
5. **How it works (bone → graphite)** — 6-step scroll sequence [follow-up — V1 ships a condensed 6-item vertical list instead of full scroll-jack]
6. **The Founding 50 (ink)** — holographic offer card: 60d free trial, Pro features 6mo, 40% off Year 1, 20% off forever, founder access. Gold progress bar with every-10 tick marks.
7. **Voice of the market (bone)** — chat-style forum quotes [follow-up]
8. **Waitlist + email capture (ink)** — full-viewport email input + "Spring 2026" floating letters + social proof ticker
9. **Footer (ink)** — wordmark, legal, social, email

## Anti-Patterns (project-specific)

Things to never do on example.com:

- Append "CRM" to the wordmark in copy, meta, or logo (use VIBE)
- "Get Started" as a CTA — use "Claim a Founding Spot", "Join the Waitlist", or a verb-first outcome line
- "Built for real estate teams" / "Built for..." — banned phrase
- "Trusted by..." / "Loved by..." — banned
- "Multi-tenant CRM" as hero — that's an internal architecture fact, not a value prop
- Generic three-card pricing with "Most Popular" badge — pricing is one card with founding offer, comparison is in the battlefield table
- Five-star + quote + avatar testimonial row — quotes in this landing are framed as forum evidence, not polished testimonials
- Radial glow blobs behind headline — gold glow lives *inside* the CTA, not as a background decoration
- Frosted glass nav bar — nav is minimal, transparent over ink, resolves to solid ink after scroll
- Inter as body font — Geist instead
- Playfair Display as headline — Instrument Serif instead
- Centered headline + two buttons layout — asymmetric preferred where possible, counter/eyebrow/metric flanks the headline
- Domain "Multi-tenant CRM for real estate" framing — frame as "for vertically integrated real estate operators" or "for owner-operators running real estate + mortgage + insurance"
- Tech stack logos including Clerk — we use Better Auth. Swap.
