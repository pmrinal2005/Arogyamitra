# SynapseX

## Project Overview
- **Name**: SynapseX
- **Goal**: A scroll-driven, cinematic single-page landing site for a fictional neural-AI product, rendered as a pure static website.
- **Features**:
  - Fixed background video that **scrubs frame-by-frame with scroll** (not autoplaying) plus a scroll-driven blur + scale effect.
  - Animated "scramble-in / scramble-out" hero typography (`Brain / And Body` + `One / Network`).
  - Cinematic 3D parallax paragraph with scroll-tied opacity keyframes.
  - Coverflow stats carousel (Swiper 11) that reveals on scroll.
  - Glassmorphic header with animated expandable hamburger menu (separate desktop + mobile variants).
  - Smooth scrolling via Lenis on desktop.
  - Fully responsive across mobile and desktop (`@media` breakpoint at 640px).

## URLs
- **Production**: Deploy to Vercel — will be `https://<your-project>.vercel.app`
- **Local dev**: `npx serve .` → http://localhost:3000

## Data Architecture
- **Data Models**: A static in-file `statsData` array (title / value / footer / details) used to build carousel cards.
- **Storage Services**: None — 100% static, no backend, no database.
- **Data Flow**: All state (scroll progress, entrance phase, scramble state) lives in-memory in the browser via a single `requestAnimationFrame` loop.

## User Guide
1. Open the site — the background video fades in, then hero text "scrambles" into place.
2. Scroll down — the video scrubs like a timeline while blurring/zooming, the hero fades out, the cinematic paragraph tilts into view, and the stats carousel reveals.
3. Drag / swipe the stats carousel to browse metric cards.
4. Use the hamburger menu (About / Metrics) to jump between sections.

## Tech Stack
- **HTML / CSS / vanilla JavaScript** (single file: `index.html`)
- **Space Mono** font (Google Fonts)
- **Bootstrap Icons** (CDN)
- **Swiper 11** (CDN) — coverflow carousel
- **Lenis 1.1.18** (CDN, desktop only) — smooth scroll

## Deployment (Vercel Free Tier)
This is a static site — no build step, no server runtime required.

### Option A — Vercel Dashboard
1. Push this folder to a Git repo (GitHub/GitLab/Bitbucket).
2. Import the repo at https://vercel.com/new.
3. Framework preset: **Other**. Build command: *(leave empty)*. Output directory: `./`.
4. Deploy.

### Option B — Vercel CLI
```bash
npm i -g vercel
cd synapsex
vercel        # preview deploy
vercel --prod # production deploy
```

`vercel.json` is included with `cleanUrls` and basic security headers. Since the project root contains `index.html`, Vercel serves it as a static site with zero configuration.

## Not Yet Implemented
- No real "Download" target (the button links to an external Instagram URL as in the source).
- No analytics / SEO metadata beyond the title.

## Recommended Next Steps
- Add Open Graph / Twitter card meta tags and a favicon.
- Self-host the video + libraries for full offline/independence from third-party CDNs.
- Add `prefers-reduced-motion` handling to disable heavy animations for accessibility.

## Status
- ✅ Active / Ready to deploy
- **Last Updated**: 2026-07-24
