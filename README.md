# Arogyamitra — SynapseX (Next.js / React)

A pixel-for-pixel rebuild of the original **SynapseX** static landing page as a
**Next.js 14 (App Router) + React 18** application, engineered for a clean,
successful **Vercel free-tier** deployment.

## Project Overview
- **Name**: Arogyamitra (SynapseX landing page)
- **Goal**: Reproduce the exact scroll-driven, cinematic neural-AI landing page in
  Next.js/React while fixing the failed Vercel deployment of the original static repo.
- **Features** (identical to the original):
  - Fixed background video that **scrubs frame-by-frame with scroll** plus a
    scroll-driven blur + scale effect and a cinematic entrance zoom/fade.
  - Animated **"scramble-in / scramble-out"** hero typography
    (`Brain / And Body` + `One / Network`).
  - Cinematic 3D parallax paragraph with scroll-tied opacity keyframes.
  - **Coverflow stats carousel** (Swiper 11) that reveals on scroll.
  - Glassmorphic header with animated expandable hamburger menu
    (separate desktop + mobile variants).
  - Smooth scrolling via **Lenis** on desktop.
  - Fully responsive (`@media` breakpoint at 640px).

## Why the original Vercel build failed & how this fixes it
The original repo was a pure static site whose `package.json` build script was
`echo "..." && exit 0` with **no output directory** declared in `vercel.json`.
When Vercel auto-detected the project and ran `npm run build`, it could not resolve
a valid build output, so the pipeline stalled right after `Running "npm run build"`
(exactly where the provided log truncates).

**Fix**: This rebuild uses a first-class, Vercel-native **Next.js** project. Vercel
auto-detects the `nextjs` framework, runs `next build` (which succeeds and emits a
valid, statically-prerendered output), and deploys with **zero extra configuration**.

## Tech Stack
- **Next.js 14.2.x** (App Router) + **React 18** + **TypeScript**
- **Space Mono** font (Google Fonts) + **Bootstrap Icons** (CDN)
- **Swiper 11** (CDN) — coverflow carousel
- **Lenis 1.1.18** (CDN, desktop only) — smooth scroll

## Project Structure
```
arogyamitra-next/
├── app/
│   ├── globals.css        # All original styles, verbatim
│   ├── layout.tsx         # <head>: fonts, icons, Swiper CSS, metadata, favicon
│   └── page.tsx           # Renders the SynapseX client component
├── components/
│   └── SynapseX.tsx       # Full markup + the exact animation logic (client component)
├── next.config.mjs
├── tsconfig.json
├── vercel.json            # nextjs framework + security headers (from original)
└── package.json
```

## Data Architecture
- **Data Models**: A static in-file `statsData` array (title / value / footer /
  details) used to build the carousel cards.
- **Storage Services**: None — 100% static/client-side, no backend, no database.
- **Data Flow**: All state (scroll progress, entrance phase, scramble state) lives
  in-memory in the browser via a single `requestAnimationFrame` loop inside a
  React `useEffect`.

## Local Development
```bash
npm install
npm run dev      # http://localhost:3000 (dev)
# or a production-parity run:
npm run build && npm run start
```

## Deployment (Vercel Free Tier)
### Option A — Vercel Dashboard
1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Import the repo at https://vercel.com/new.
3. Framework preset: **Next.js** (auto-detected). Leave build/output settings default.
4. Deploy.

### Option B — Vercel CLI
```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

## Completed Features
- ✅ Exact visual + interaction parity with the original static site
- ✅ Clean `next build` (statically prerendered `/` route)
- ✅ Verified runtime with no console errors; Swiper cards build dynamically
- ✅ Security headers preserved via `vercel.json`

## Not Yet Implemented (same as original, intentionally)
- No real "Download" target (button links to an external Instagram URL, as in source).
- No analytics / extended SEO metadata beyond title + description.

## Recommended Next Steps
- Add Open Graph / Twitter card meta tags.
- Self-host the video + libraries to remove third-party CDN dependence.
- Add `prefers-reduced-motion` handling for accessibility.

## Status
- ✅ Active / Ready to deploy on Vercel
- **Last Updated**: 2026-07-24
