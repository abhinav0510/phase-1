# Porting the homepage mockup (v3) into the live Next.js site

Status: executed on branch `feat/homepage-v3` (commit "Homepage: port the approved v3 design into the Next.js site"). Kept as the record of how the port was done.

## 1. What we are replacing

Today `src/app/page.tsx` renders ten components from `src/components/site/`:
`SiteNav`, `Hero` (+ `HeroScene`, a three.js scene), `ServicesStrip`, `Principles`,
`WhatWeDo`, `Approach`, `Portfolio`, `Insights`, `Contact`, `Footer`.

Only the homepage uses them. The auth pages (`/login`, `/forgot-password`,
`/reset-password`, `/force-reset`, `/teamonly`) use `components/site/auth-shell.tsx`
and `site-config.ts`, plus the `.site-serif` helper and the `paper` / `ink` / `gold`
Tailwind colours. Those must keep working unchanged.

The dashboard (`(founder)`, `admin`) shares `layout.tsx` and `globals.css` with the
homepage. Any change to `body`, `:root` or global element selectors reaches it.

## 2. Guiding rules

1. **Scope everything.** All mockup CSS lives under one wrapper class, `.home-v3`,
   in a new stylesheet. No new rules on `:root`, `html`, `body` or bare elements.
2. **Add, then remove.** New components go in `src/components/home/`. The old
   `components/site/` files stay until the new page is verified, then the unused
   ones are deleted in a separate commit.
3. **Fonts load only on the homepage.** The four mockup fonts are imported in
   `page.tsx` with `next/font/google` and applied to the wrapper, so the dashboard
   and auth pages do not preload them. `layout.tsx` keeps Inter and Cormorant.
4. **Content in one file.** Mandates, help rows, deal-desk cards and sectors move to
   `src/components/home/content.ts`. Markup never carries copy.
5. **No startup names.** Content stays anonymised, as in the mockup.
6. **Reduced motion is honoured** exactly as in the mockup.

## 3. Target structure

```
src/app/page.tsx                      server component: fonts, metadata, section order
src/app/home.css                      the mockup stylesheet, every selector prefixed .home-v3
src/components/home/
  content.ts                          all copy and data (anonymised)
  home-shell.tsx        (client)      wrapper: adds .is-ready after fonts load, colour wipe
  header.tsx            (client)      wordmark + round menu button + full-screen menu
  hero.tsx              (client)      runway, --p scroll progress, grain canvas, artifacts,
                                      Founder login pill, swipe cue
  ask-sidana.tsx        (client)      chips + form → mailto (same as mockup)
  mandates.tsx          (server)      section + marquee; each visual below
  mandate-visuals.tsx   (client)      pipeline, meetings, memo cards + cursor tilt
  how-we-help.tsx       (client)      rows with focal-line highlight
  deal-desk.tsx         (client)      six cards, hover reveal, count-up, illustrations
  cta.tsx               (server)
  footer.tsx            (client)      barcode band generator, Ask form
  use-reveal.ts                       IntersectionObserver hook adding .in-view once
```

`"use client"` is only where the component touches `window`, scroll, canvas or
pointer events. Static sections stay server components.

## 4. Step-by-step

### Step 0. Clean working tree (15 min)
The tree has uncommitted notification and login work (`src/app/login/*`,
`src/lib/data/founder.ts`, `scripts/*`). Commit that first on its own, so the
homepage lands as its own reviewable change. Then branch: `feat/homepage-v3`.

### Step 1. Stylesheet (1 h)
- Copy `mockups/homepage-v2/styles.css` to `src/app/home.css`.
- Prefix every selector with `.home-v3 ` (script it, then hand-check the few that
  start with `html`, `body`, `*`, `svg`, `button`, `a`, `h1…`).
- Move the `body` rules onto `.home-v3` (background, colour, font, `overflow-x: clip`).
- Replace `.is-ready .x` with `.home-v3.is-ready .x`.
- Point font tokens at the next/font variables:
  `--display: var(--font-display)`, `--body: var(--font-body)`,
  `--serif: var(--font-serif-2)`, `--mono: var(--font-mono)`.
- Keep `@property --ang` (global at-rule, harmless).
- Import `./home.css` from `page.tsx` (App Router allows global CSS from any module).

Tailwind preflight is active on the live site. Two things it changes that the
mockup assumed: `button` has no background and `svg` is `display:block`. The mockup
CSS already sets both explicitly, so no visual change is expected, but it is the
first thing to check in the browser.

### Step 2. Fonts and metadata (30 min)
In `page.tsx`:
```ts
const display = Montserrat({ subsets:["latin"], weight:["700","800"], variable:"--font-display", display:"swap" });
const body    = Instrument_Sans({ subsets:["latin"], weight:["400","500","600"], variable:"--font-body", display:"swap" });
const serif2  = Instrument_Serif({ subsets:["latin"], weight:"400", style:["normal","italic"], variable:"--font-serif-2", display:"swap" });
const mono    = Space_Mono({ subsets:["latin"], weight:["400","700"], variable:"--font-mono", display:"swap" });
export const metadata = { title: "Sidana Labs — Fundraising advisory and investor relations for startups", description: "…" };
```
Apply `${display.variable} ${body.variable} ${serif2.variable} ${mono.variable} home-v3`
to the top-level `<div>` the page renders. Page-level metadata overrides the
layout's dashboard-flavoured title for `/` only.

### Step 3. Components, one section at a time (half a day)
Port in page order, checking each in the browser before the next:
1. `home-shell` + `header` (menu open/close, Escape, aria, colour wipe on `data-wipe` links).
2. `hero` (runway, `--p`, grain canvas in `useEffect`, artifacts from `content.ts`,
   Founder login pill → `SITE.loginPath` via `next/link`, swipe cue).
3. `ask-sidana`.
4. `mandates` + `mandate-visuals` (the three redesigned cards; inline SVG icons stay inline).
5. `how-we-help`.
6. `deal-desk` (count-up reads `data-count` from content).
7. `cta`, `footer`.

Translation notes from the mockup's `script.js`:
- `document.body.classList.add("is-ready")` → set state on the wrapper after
  `document.fonts.ready` (with the 900 ms fallback), render `className={isReady ? "home-v3 is-ready" : "home-v3"}`.
- Scroll/rAF listeners go in `useEffect` with cleanup; `prefers-reduced-motion` read once.
- `.reveal` / `.reveal-lines` / `.band` / `.dots` get `.in-view` from `useReveal`.
- Generated DOM (dot grid, barcode bars) becomes arrays rendered in JSX; barcode bar
  heights are random in the mockup, so seed them once with `useMemo` to avoid
  hydration mismatch (render them client-only or use a deterministic sequence).
- The Ask forms keep the `mailto:` behaviour. A server action that emails via n8n is a
  later improvement, not part of this port.

### Step 4. Swap the page (15 min)
Replace the body of `page.tsx` with the new section order. Keep the old components
in the tree for now.

### Step 5. Verify (1–2 h)
- `npm run typecheck`, `npm run lint`, `npm run build` (the build also proves no
  server component imports a client-only API).
- Browser at 1440, 1024, 768, 375: hero artifacts never overlap the headline,
  no horizontal scroll, menu opens and closes, colour wipe lands on the right
  section, all three mandate cards render with icons, deal-desk hover reveal,
  footer band grows in.
- Keyboard: Tab through header, menu, cards (`tabindex=0`), forms; Escape closes menu.
- `prefers-reduced-motion`: emulate in DevTools; page is static and complete.
- Founder login button and menu link reach `/login` and the login page still looks
  as before (it does not import anything from `components/home`).
- Open `/login`, `/forgot-password`, `/teamonly` and one dashboard page: screenshot
  before and after the branch to confirm nothing moved. Only `page.tsx`, `home.css`
  and `components/home/*` should differ.
- Lighthouse on `/`: the three.js scene is gone, so performance should improve.
  Check CLS from the four new fonts; `display:"swap"` plus next/font's size-adjust
  normally keeps it near zero.

### Step 6. Remove the old homepage (30 min, separate commit)
Delete `components/site/{hero,hero-scene,services-strip,principles,sections,nav,reveal}.tsx`
after confirming with `grep` that nothing else imports them. Keep `auth-shell.tsx`
and `site-config.ts`. Remove `three`, `@react-three/fiber`, `@react-three/drei`,
`@types/three` from `package.json` and reinstall. Keep `framer-motion` and
`lucide-react`: the auth shell uses them.

### Step 7. Ship
Open a PR from `feat/homepage-v3`. Deploy to the VPS only after the PR is reviewed;
the homepage has no data dependency, so it can go out independently of the
weekly-report and notification work.

## 5. Risks and how the plan handles them

| Risk | Mitigation |
|---|---|
| Mockup class names (`.menu`, `.btn`, `.ui`, `.reveal`, `.line`) collide with dashboard or auth styles | Every selector is prefixed `.home-v3`; nothing is added globally |
| Tailwind preflight resets differ from the mockup's plain-HTML baseline | Mockup CSS sets backgrounds, borders, fonts explicitly; verified in Step 5 |
| Hydration mismatch from random barcode heights / `Math.random()` | Deterministic sequence or client-only render |
| Fonts preloaded on every page | Fonts imported in `page.tsx`, variables applied on the wrapper only |
| Dashboard or auth pages change by accident | Before/after screenshots in Step 5; `globals.css` and `layout.tsx` untouched except nothing |
| Metadata still says "Capital · Strategy · Venture" | Page-level `metadata` in `page.tsx` |
| Old 3D scene keeps shipping | Step 6 deletes it and its four dependencies |

## 6. Out of scope for this port (follow-ups)
- Live "311 investors" from Supabase instead of a constant (needs a count query + ISR).
- Ask Sidana sending email through n8n instead of `mailto:`.
- Real deal-desk posts; today's six cards are sample copy and the event card is illustrative.
- Founder consent and real figures if any mandate ever names a company.

## 7. Estimate
About one working day for Steps 0–5, plus an hour for Step 6 and the PR.
