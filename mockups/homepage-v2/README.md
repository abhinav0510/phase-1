# Homepage mockup v3 — inspired by thinkcompany.com

A **standalone design mockup** of a new Sidana Labs homepage in plain HTML, CSS and
JavaScript, so the look can be reviewed before anything in the real site
(`src/app/page.tsx`) changes. Nothing here is wired into the Next.js app or build.

**Open it:** double-click `index.html` (no server needed), or serve the folder with
any static server.

## Reference → Sidana mapping
| Think Company | Sidana Labs version |
|---|---|
| Pinned hero with floating team photos | Pinned 240vh "runway": headline, floating *deal artifacts* (investor match, meeting confirmed, weekly report, term sheet) that drift apart with scroll |
| "Ask us anything…" frosted pill + Ask Think chat | Frosted **Founder login** pill (→ `/login`) with a swipe-down cue beneath it, plus the **Ask Sidana** card (chips + input → prefilled email to investors@) |
| Featured Work case studies | **Selected mandates** — three anonymised mandates (smart-building access, doorstep vehicle care, AI diagnostics; no startup names, meeting counts from the platform DB) with CSS-built UI illustrations |
| How We Help (pain quote → answer → service) | Five fundraising pains → how Sidana solves them → service name |
| Mixtape cards | **From the deal desk** — notes, articles, a live-network stat (311 investors), an event; each card carries a CSS-built illustration (process track, Saturday report bars, radar sweep, stamped pass letter, typing memo, office-hours clock) |
| Text CTA + footer with barcode band | "You've got a round to raise. We're listening." + gold band, giant wordmark, Ask form |

## Animations recreated (and tightened)
Line-mask text reveals on load and scroll · scroll-linked hero (progress → one CSS variable) ·
film-grain canvas · comets travelling along connection lines (SVG dash animation) · dot-grid
pop-in · frosted pill with rotating conic glow, cursor-tracking halo and text shimmer ·
swipe-down chevrons that fade as you scroll · circular menu reveal · colour-wipe page transition on in-page nav · marquee carousel ·
help rows that light up as they pass the viewport's focal line · hover-reveal desk cards
(grid-template-rows 0fr→1fr) · cursor-tilt on mandate visuals · count-up stat · barcode
band bars growing in. All motion is disabled under `prefers-reduced-motion`.

## Design tokens
Navy `#031B36` / `#020F21` / `#0B2C52` · cream `#FDFFEE` · paper `#F3F5F0` · **accent gold
`#E2B35B`** (the reference uses red `#FF2C17` — swap `--accent` and `--accent-deep` in
`styles.css` to compare). Fonts (Google): Montserrat Bold/ExtraBold (display), Instrument Sans
(body), Instrument Serif (pull quotes only), Space Mono (eyebrows).

## Before this goes live
- **No startup names appear anywhere** (mandates and the sector marquee are anonymised, matching the
  live site). The meeting counts on the mandate cards are still real figures from the platform.
- Deal-desk cards are sample editorial copy, not published posts.
- "Ask Sidana" sends an email; it is not an AI assistant.
- The team login (`/teamonly`) is intentionally not linked anywhere.
