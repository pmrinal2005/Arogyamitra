"use client";

/* ============================================================================
   AROGYASETU — "ENTER THE LOOP"
   A continuous, scroll-controlled typographic film built with
   GSAP + ScrollTrigger and restrained Lenis smooth scrolling.

   The letter A of AROGYASETU is a portal: approached, entered, travelled
   through, exited. Every scene transforms from geometry already on screen and
   tells the Predictive Community Health OS story — signals, environment,
   community, the predictive loop, and free-forever access.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import "./arogyafilm.css";

const NAV = [
  { id: "scene-hero", label: "01 SETU" },
  { id: "scene-capabilities", label: "02 LAYERS" },
  { id: "scene-context", label: "03 THE LOOP" },
  { id: "scene-index", label: "04 ACCESS" },
];

export default function ArogyaFilm() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [activeNav, setActiveNav] = useState(0);
  const [invert, setInvert] = useState(false); // warm-paper scene toggles nav color
  const [signal, setSignal] = useState(false); // climax scene toggles nav color
  const [navVisible, setNavVisible] = useState(false); // show nav only inside the film

  /* Show the fixed film nav only while the film is in the viewport
     (so it doesn't collide with the landing hero header). */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setNavVisible(e.isIntersecting)),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ── GSAP + ScrollTrigger choreography ── */
  useEffect(() => {
    let ctx: { revert: () => void } | null = null;
    let cleanupFns: Array<() => void> = [];
    let cancelled = false;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function setup() {
      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      const gsap = gsapMod.gsap ?? gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger ?? stMod.default;
      gsap.registerPlugin(ScrollTrigger);

      // Wait for the display fonts before measuring/pinning.
      try {
        if ((document as any).fonts?.ready) {
          await (document as any).fonts.ready;
        }
      } catch {
        /* noop */
      }
      if (cancelled) return;

      const root = rootRef.current;
      if (!root) return;

      const q = <T extends Element = HTMLElement>(sel: string) =>
        root.querySelector(sel) as T | null;
      const qa = (sel: string) =>
        Array.from(root.querySelectorAll(sel)) as HTMLElement[];

      // Nav / theme state driven by scene ScrollTriggers
      const setNav = (i: number) => setActiveNav(i);

      ctx = gsap.context(() => {
        /* ────────────────────────────────────────────
           SCENE 01 — HERO: "ENTER THE LOOP"
           The AROGYASETU wordmark starts fully visible,
           left-aligned so its first letter is never clipped
           (Task 3 fix). As we scroll, the whole wordmark
           translates right, the A scales up into a mask, and
           we move through its negative space.
           ──────────────────────────────────────────── */
        if (!reduce) {
          const heroTl = gsap.timeline({
            scrollTrigger: {
              trigger: "#scene-hero",
              start: "top top",
              end: "+=260%",
              scrub: 0.9,
              pin: true,
              anticipatePin: 1,
              onToggle: (self) => {
                if (self.isActive) setNav(0);
              },
            },
          });
          heroTl
            .to(".hero-meta", { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 }, 0)
            .to(".hero-scroll", { autoAlpha: 0, duration: 0.3 }, 0.1)
            // Translate the trailing letters OUT to the right (they begin
            // on-screen at rest → no initial clipping of the first glyph).
            .to(".hero-rogyamitra", { xPercent: 60, autoAlpha: 0, duration: 1 }, 0.15)
            .to(".hero-a", { scale: 10, duration: 1.4, ease: "power2.in" }, 0.2)
            .to(".hero-a-inner", { autoAlpha: 1, duration: 0.6 }, 0.7)
            .to(".hero-meta", { autoAlpha: 0, duration: 0.4 }, 0.5)
            .to("#scene-hero", { backgroundColor: "#090A0A", duration: 0.5 }, 1.2);
        } else {
          gsap.set(".hero-meta", { autoAlpha: 1, y: 0 });
        }

        /* ────────────────────────────────────────────
           SCENE 02 — INSIDE THE A
           Diagonal planes + cropped fragments assemble
           the phrase CATCH IT / IN THE / SILENT / DAYS.
           ──────────────────────────────────────────── */
        if (!reduce) {
          const insideTl = gsap.timeline({
            scrollTrigger: {
              trigger: "#scene-inside",
              start: "top top",
              end: "+=200%",
              scrub: 1,
              pin: true,
              anticipatePin: 1,
            },
          });
          insideTl
            .from(".plane", { yPercent: 120, rotate: (i) => (i % 2 ? 6 : -6), autoAlpha: 0, stagger: 0.08, duration: 0.6 }, 0)
            .from(".inside-word", { autoAlpha: 0, yPercent: 60, stagger: 0.12, duration: 0.5 }, 0.2)
            .to(".plane", { yPercent: (i) => (i - 1) * -8, duration: 0.6 }, 0.6)
            .to(".inside-line", { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, 0.7);
        } else {
          gsap.set(".inside-word", { autoAlpha: 1, yPercent: 0 });
          gsap.set(".plane", { autoAlpha: 0.4 });
        }

        /* ────────────────────────────────────────────
           SCENE 03 — THE PREDICTIVE LOOP (warm paper)
           Pinned; vertical scroll drives horizontal motion.
           SIGNAL → PREDICT → INTERVENE → MOBILIZE
           A big cycling number counts the vulnerability window.
           ──────────────────────────────────────────── */
        if (!reduce) {
          const ctxTl = gsap.timeline({
            scrollTrigger: {
              trigger: "#scene-context",
              start: "top top",
              end: "+=320%",
              scrub: 1,
              pin: true,
              anticipatePin: 1,
              onToggle: (self) => {
                if (self.isActive) {
                  setNav(2);
                  setInvert(true);
                } else {
                  setInvert(false);
                }
              },
              onUpdate: (self) => {
                // reveal the four loop stages progressively
                const steps = ["SIGNAL", "PREDICT", "INTERVENE", "MOBILIZE"];
                const idx = Math.min(
                  steps.length - 1,
                  Math.floor(self.progress * steps.length * 0.9)
                );
                const el = q<HTMLElement>(".context-number-text");
                if (el && el.textContent !== steps[idx]) el.textContent = steps[idx];
              },
            },
          });
          const drift = qa(".context-doc");
          ctxTl
            .fromTo(
              ".context-track",
              { xPercent: 0 },
              { xPercent: -55, duration: 1, ease: "none" },
              0
            )
            .from(drift, { autoAlpha: 0, y: 40, stagger: 0.1, duration: 0.4 }, 0.1)
            .from(".context-label", { autoAlpha: 0, x: -30, stagger: 0.08, duration: 0.4 }, 0.2)
            .to(".context-final-6", { scale: 8, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, 0.85);
        } else {
          const el = q<HTMLElement>(".context-number-text");
          if (el) el.textContent = "MOBILIZE";
          gsap.set(".context-label", { autoAlpha: 1, x: 0 });
          gsap.set(".context-doc", { autoAlpha: 1, y: 0 });
        }

        /* ────────────────────────────────────────────
           SCENE 04 — LAYERS (the fused capability stack)
           Three full-screen typographic transformations:
           SENSE → CORRELATE → MOBILIZE (not cards).
           ──────────────────────────────────────────── */
        if (!reduce) {
          const capTl = gsap.timeline({
            scrollTrigger: {
              trigger: "#scene-capabilities",
              start: "top top",
              end: "+=300%",
              scrub: 1,
              pin: true,
              anticipatePin: 1,
              onToggle: (self) => {
                if (self.isActive) setNav(1);
              },
            },
          });
          capTl
            // SENSE in, expand its width, form columns
            .from(".cap-reason .cap-title", { autoAlpha: 0, scaleY: 1.4, duration: 0.4 }, 0)
            .to(".cap-reason .cap-title", { letterSpacing: "0.14em", fontStretch: "125%", duration: 0.5 }, 0.15)
            .to(".cap-reason", { autoAlpha: 0, duration: 0.4 }, 0.9)
            // CORRELATE columns
            .fromTo(".cap-code", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.85)
            .from(".cap-col", { scaleY: 0, transformOrigin: "top", stagger: 0.06, duration: 0.5 }, 0.95)
            .to(".cap-code", { autoAlpha: 0, duration: 0.4 }, 1.7)
            // MOBILIZE structural planes
            .fromTo(".cap-build", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 1.65)
            .from(".cap-build .cap-title", { autoAlpha: 0, y: 60, duration: 0.5 }, 1.75);
        } else {
          gsap.set([".cap-reason", ".cap-code", ".cap-build"], { autoAlpha: 1 });
          gsap.set(".cap-col", { scaleY: 1 });
        }

        /* ────────────────────────────────────────────
           SCENE 05 — SETU INDEX
           Huge SETU fixed left; spec rows scroll on the right,
           turning signal-green as they align with the A arm.
           ──────────────────────────────────────────── */
        if (!reduce) {
          const rows = qa(".index-row");
          const idxTl = gsap.timeline({
            scrollTrigger: {
              trigger: "#scene-index",
              start: "top top",
              end: "+=260%",
              scrub: 1,
              pin: true,
              anticipatePin: 1,
              onToggle: (self) => {
                if (self.isActive) setNav(3);
              },
            },
          });
          idxTl.fromTo(
            ".index-rows",
            { yPercent: 18 },
            { yPercent: -18, duration: 1, ease: "none" },
            0
          );
          rows.forEach((row, i) => {
            idxTl.to(
              row,
              { color: "#D6FF3F", duration: 0.15 },
              0.2 + i * 0.11
            );
          });
          idxTl.to(".index-rows", { gap: "2px", duration: 0.3 }, 0.9);
        } else {
          gsap.set(".index-row", { color: "#D6FF3F" });
        }

        /* ────────────────────────────────────────────
           SCENE 06 — CLIMAX (signal-color background)
           Zoom out from inside a letter to reveal the
           full statement, lock to grid, compress to mark.
           ──────────────────────────────────────────── */
        if (!reduce) {
          const climaxTl = gsap.timeline({
            scrollTrigger: {
              trigger: "#scene-climax",
              start: "top top",
              end: "+=240%",
              scrub: 1,
              pin: true,
              anticipatePin: 1,
              onToggle: (self) => {
                setSignal(self.isActive);
              },
            },
          });
          climaxTl
            .fromTo(".climax-copy", { scale: 6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1, ease: "power2.out" }, 0)
            .to(".climax-copy", { autoAlpha: 0, duration: 0.4 }, 0.85)
            .fromTo(".climax-mark", { autoAlpha: 0, scale: 1.4 }, { autoAlpha: 1, scale: 1, duration: 0.5 }, 0.9);
        } else {
          gsap.set(".climax-copy", { scale: 1, autoAlpha: 1 });
        }

        /* ────────────────────────────────────────────
           SCENE 07 — FINAL CTA
           Signal mark shrinks into header; near-black.
           ──────────────────────────────────────────── */
        if (!reduce) {
          gsap.from(".cta-inner > *", {
            scrollTrigger: {
              trigger: "#scene-cta",
              start: "top 70%",
            },
            autoAlpha: 0,
            y: 40,
            stagger: 0.1,
            duration: 0.7,
            ease: "power2.out",
          });
        }

        ScrollTrigger.refresh();
      }, root);

      // Recalculate on resize / breakpoint changes
      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", onResize);
      cleanupFns.push(() => window.removeEventListener("resize", onResize));

      /* Restrained Lenis smooth scrolling (desktop, non-reduced only) */
      if (!reduce && window.innerWidth >= 768) {
        try {
          const LenisMod = await import("lenis");
          if (cancelled) return;
          const Lenis = LenisMod.default ?? (LenisMod as any).Lenis;
          const lenis = new Lenis({
            duration: 1.05,
            easing: (t: number) => 1 - Math.pow(1 - t, 3),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.4,
          });
          lenis.on("scroll", ScrollTrigger.update);
          const raf = (time: number) => {
            lenis.raf(time * 1000);
          };
          gsap.ticker.add(raf);
          gsap.ticker.lagSmoothing(0);
          cleanupFns.push(() => {
            gsap.ticker.remove(raf);
            lenis.destroy();
          });
        } catch {
          /* Lenis optional — page works without it */
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`a3film${invert ? " is-paper" : ""}${signal ? " is-signal" : ""}`}
    >
      <a href="#scene-cta" className="a3-skip">
        Skip to get started
      </a>

      {/* ── Fixed minimal navigation ── */}
      <nav
        className={`a3-nav${navVisible ? " is-visible" : ""}`}
        aria-label="Film navigation"
        aria-hidden={!navVisible}
      >
        <a href="#scene-hero" className="a3-nav-brand" aria-label="Arogyasetu top">
          AROGYASETU
        </a>
        <ul className="a3-nav-list">
          {NAV.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`a3-nav-link${activeNav === i ? " is-active" : ""}`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <a className="a3-nav-cta" href="#scene-cta">
          GET STARTED <span aria-hidden="true">↗</span>
        </a>
      </nav>

      {/* ═══════════ SCENE 01 — HERO ═══════════ */}
      <section id="scene-hero" className="scene scene-hero" aria-label="Arogyasetu">
        <div className="hero-stage">
          <h1
            className="hero-wordmark"
            aria-label="Arogyasetu — the predictive community health operating system"
          >
            <span className="hero-a" aria-hidden="true">
              A
              <span className="hero-a-inner" aria-hidden="true" />
            </span>
            <span className="hero-rogyamitra" aria-hidden="true">
              ROGYASETU
            </span>
          </h1>
          <div className="hero-meta hero-meta-tl">AROGYASETU</div>
          <div className="hero-meta hero-meta-tr">HEALTH OS</div>
          <div className="hero-meta hero-meta-bl">
            THE PREDICTIVE COMMUNITY HEALTH OS
            <br />
            PRIVACY-FIRST / FREE FOR INDIVIDUALS
          </div>
          <div className="hero-meta hero-meta-br">INSTALLABLE DESKTOP PWA</div>
          <div className="hero-scroll" aria-hidden="true">
            SCROLL TO ENTER <span className="hero-scroll-rail" />
          </div>
        </div>
      </section>

      {/* ═══════════ SCENE 02 — INSIDE THE A ═══════════ */}
      <section
        id="scene-inside"
        className="scene scene-inside"
        aria-label="Catch it in the silent days"
      >
        <div className="inside-planes" aria-hidden="true">
          <span className="plane plane-1" />
          <span className="plane plane-2" />
          <span className="plane plane-3" />
          <span className="inside-coord">PM2.5 038 / MOOD 002</span>
        </div>
        <h2 className="inside-copy">
          <span className="inside-word">CATCH IT</span>
          <span className="inside-word">IN THE</span>
          <span className="inside-word">SILENT</span>
          <span className="inside-word">DAYS</span>
        </h2>
        <span className="inside-line" aria-hidden="true" />
      </section>

      {/* ═══════════ SCENE 03 — THE PREDICTIVE LOOP ═══════════ */}
      <section
        id="scene-context"
        className="scene scene-context"
        aria-label="The closed predictive loop"
      >
        <div className="context-track">
          <div className="context-number" aria-label="Signal, predict, intervene, mobilize">
            <span className="context-number-text">SIGNAL</span>
            <span className="context-final-6" aria-hidden="true" />
          </div>
          <div className="context-docs" aria-hidden="true">
            <span className="context-doc context-doc-1" />
            <span className="context-doc context-doc-2" />
            <span className="context-doc context-doc-3" />
          </div>
          <ul className="context-labels">
            <li className="context-label">EMA + JOURNAL SIGNALS</li>
            <li className="context-label">ENVIRONMENTAL EXPOSURE</li>
            <li className="context-label">RISING-RISK WINDOW DETECTED</li>
            <li className="context-label">AI MICRO-INTERVENTION + CARE PING</li>
          </ul>
        </div>
      </section>

      {/* ═══════════ SCENE 04 — LAYERS ═══════════ */}
      <section
        id="scene-capabilities"
        className="scene scene-capabilities"
        aria-label="The fused capability layers"
      >
        <article className="cap cap-reason">
          <span className="cap-index">01 / SENSE</span>
          <h2 className="cap-title">SENSE</h2>
          <p className="cap-desc">
            LOW-FRICTION WEB CHECK-INS, BRIEF SCALES &amp; NLP JOURNALING BUILD A
            LIVING BEHAVIORAL HEALTH INDEX.
          </p>
        </article>
        <article className="cap cap-code">
          <span className="cap-index">02 / CORRELATE</span>
          <h2 className="cap-title">CORRELATE</h2>
          <div className="cap-cols" aria-hidden="true">
            <span className="cap-col" />
            <span className="cap-col" />
            <span className="cap-col" />
            <span className="cap-col" />
            <span className="cap-col" />
            <span className="cap-col" />
          </div>
          <p className="cap-desc">
            REAL-TIME AIR, POLLEN &amp; WEATHER CROSS-REFERENCED AGAINST YOUR OWN
            HISTORY.
          </p>
        </article>
        <article className="cap cap-build">
          <span className="cap-index">03 / MOBILIZE</span>
          <h2 className="cap-title">MOBILIZE</h2>
          <p className="cap-desc">
            A TRUST-SCORED MUTUAL-AID GRAPH TURNS RISK INTO REAL HUMAN SUPPORT.
          </p>
        </article>
      </section>

      {/* ═══════════ SCENE 05 — SETU INDEX ═══════════ */}
      <section
        id="scene-index"
        className="scene scene-index"
        aria-label="Arogyasetu specification index"
      >
        <div className="index-a" aria-hidden="true">
          SETU
        </div>
        <div className="index-rows">
          <div className="index-row">
            <span className="index-key">PLATFORM</span>
            <span className="index-val">DESKTOP PWA</span>
          </div>
          <div className="index-row">
            <span className="index-key">SIGNALS</span>
            <span className="index-val">EMA · SCALES · JOURNAL · ENV</span>
          </div>
          <div className="index-row">
            <span className="index-key">ENVIRONMENT</span>
            <span className="index-val">OPEN-METEO EXPOSOME</span>
          </div>
          <div className="index-row">
            <span className="index-key">COMMUNITY</span>
            <span className="index-val">TIMEBANKING 2.0</span>
          </div>
          <div className="index-row">
            <span className="index-key">PRIVACY</span>
            <span className="index-val">OPT-IN · EXPORT · DELETE</span>
          </div>
          <div className="index-row">
            <span className="index-key">PRICE</span>
            <span className="index-val">FREE FOR INDIVIDUALS</span>
          </div>
        </div>
      </section>

      {/* ═══════════ SCENE 06 — CLIMAX ═══════════ */}
      <section
        id="scene-climax"
        className="scene scene-climax"
        aria-label="Not another tracker. A safety net."
      >
        <h2 className="climax-copy">
          NOT ANOTHER TRACKER.
          <br />
          A SAFETY NET.
        </h2>
        <div className="climax-mark" aria-hidden="true">
          AROGYASETU
        </div>
      </section>

      {/* ═══════════ SCENE 07 — FINAL CTA ═══════════ */}
      <section id="scene-cta" className="scene scene-cta" aria-label="Get started">
        <div className="cta-inner">
          <span className="cta-mark">AROGYASETU</span>
          <h2 className="cta-head">GET STARTED</h2>
          <p className="cta-sub">
            Free forever for individuals. Installable on desktop. Your data stays
            yours.
          </p>
          <a
            className="cta-button"
            href="https://github.com/pmrinal2005/Arogyamitra"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="cta-button-fill" aria-hidden="true" />
            <span className="cta-button-text">
              LAUNCH AROGYASETU{" "}
              <span className="cta-arrow" aria-hidden="true">
                →
              </span>
            </span>
          </a>
          <span className="cta-technical">
            predict · intervene · mobilize · learn
          </span>
        </div>
        <div className="cta-crop-a" aria-hidden="true">
          A
        </div>
      </section>
    </div>
  );
}
