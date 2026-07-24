"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ────────────────────────────────────────────────────────────
   AROGYASETU — 3D COVERFLOW CAPABILITY CAROUSEL
   The four fused layers of the Predictive Community Health OS,
   plus the closed predictive loop, presented as an auto-rotating
   3D coverflow deck.

   Behaviour & motion:
   - Active center card: flat, enlarged, highlighted with back-glow.
   - Side cards: curve inward on the 3D Y-axis, recede in Z,
     lower opacity + scale — a true coverflow silhouette.
   - Auto-play: smooth infinite rotation with a 3s pause per card.
   - Fluid cubic-bezier easing animates depth, rotation, opacity, scale.
   - Interactivity: pause on hover / focus; click adjacent cards to select;
     arrow + dot controls; keyboard arrows; and pointer swipe / drag.
   ──────────────────────────────────────────────────────────── */

export type StatCard = {
  title: string;
  value: string;
  footer: string;
  details: string[];
};

const CARDS: StatCard[] = [
  {
    title: "DIGITAL PHENOTYPING",
    value: "10s",
    footer: "WEB-BASED SELF-REPORT ENGINE",
    details: [
      "Adaptive EMA micro check-ins",
      "PHQ-4 / GAD-2 / UCLA brief scales",
      "NLP journaling & sentiment trends",
    ],
  },
  {
    title: "ENVIRONMENTAL EXPOSOME",
    value: "PM2.5",
    footer: "REAL-TIME EXPOSURE CORRELATOR",
    details: [
      "Open-Meteo air, pollen & UV feeds",
      "Personalized risk narratives",
      "Correlated against your own history",
    ],
  },
  {
    title: "MUTUAL-AID GRAPH",
    value: "1hr = 1",
    footer: "TRUST-SCORED TIMEBANKING",
    details: [
      "Hyperlocal Leaflet + OSM matching",
      "Time-credit ledger & balances",
      "Transparent, user-visible trust score",
    ],
  },
  {
    title: "PREDICTIVE LOOP",
    value: "48-72h",
    footer: "VULNERABILITY-WINDOW DETECTION",
    details: [
      "Rising-risk window forecasting",
      "AI micro-interventions on demand",
      "Discreet Care Pings to matched people",
    ],
  },
  {
    title: "CARE PINGS",
    value: "1-click",
    footer: "AUTO-MOBILIZED HUMAN SUPPORT",
    details: [
      "Web Push + in-app + email alerts",
      "Jitsi video companionship launch",
      "Accept, schedule or gently decline",
    ],
  },
  {
    title: "PRIVACY & CONTROL",
    value: "100%",
    footer: "USER-SOVEREIGN, FREE FOREVER",
    details: [
      "Granular opt-in for every signal",
      "Full export & hard delete anytime",
      "Row-level security, no data selling",
    ],
  },
];

const AUTOPLAY_DELAY = 3000; // 3s pause per active card
const DRAG_THRESHOLD = 60; // px of horizontal travel to trigger a step

export default function Carousel3D() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [dragging, setDragging] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pointer / swipe tracking
  const dragStartX = useRef(0);
  const dragDeltaX = useRef(0);
  const pointerActive = useRef(false);
  const pointerId = useRef<number | null>(null);

  const n = CARDS.length;

  const go = useCallback(
    (dir: number) => {
      setActive((prev) => (prev + dir + n) % n);
    },
    [n]
  );

  const goTo = useCallback(
    (idx: number) => {
      setActive(((idx % n) + n) % n);
    },
    [n]
  );

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Reveal-on-scroll (adds .revealed once visible)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) el.classList.add("revealed");
        });
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay with delayed transition — paused on hover / focus / drag /
  // reduced motion. Runs as a smooth infinite loop.
  useEffect(() => {
    if (paused || reduced || dragging) return;
    timerRef.current = setTimeout(() => go(1), AUTOPLAY_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, paused, reduced, dragging, go]);

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  /* ── Pointer swipe / drag gestures ── */
  const onPointerDown = (e: React.PointerEvent) => {
    // Ignore secondary buttons
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerActive.current = true;
    pointerId.current = e.pointerId;
    dragStartX.current = e.clientX;
    dragDeltaX.current = 0;
    setDragging(true);
    setPaused(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerActive.current) return;
    dragDeltaX.current = e.clientX - dragStartX.current;
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!pointerActive.current) return;
    pointerActive.current = false;
    const delta = dragDeltaX.current;
    try {
      if (pointerId.current !== null)
        (e.currentTarget as HTMLElement).releasePointerCapture(
          pointerId.current
        );
    } catch {
      /* noop */
    }
    pointerId.current = null;

    if (Math.abs(delta) > DRAG_THRESHOLD) {
      // Drag right → previous card, drag left → next card
      go(delta < 0 ? 1 : -1);
    }
    dragDeltaX.current = 0;
    setDragging(false);
    // Resume autoplay only if the pointer isn't still hovering the section.
    // onMouseLeave will also fire for mouse; for touch we resume here.
    if (e.pointerType !== "mouse") setPaused(false);
  };

  // Compute the shortest signed offset of a card from the active one
  const offsetOf = (i: number) => {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  return (
    <section
      id="stats-section"
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Arogyasetu capability layers"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        if (!pointerActive.current) setPaused(false);
      }}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className={`carousel3d-stage${dragging ? " is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ touchAction: "pan-y" }}
      >
        <div className="carousel3d-track">
          {CARDS.map((card, i) => {
            const off = offsetOf(i);
            const abs = Math.abs(off);
            const isActive = off === 0;
            // Hide cards far from the active one for performance/clarity
            const visible = abs <= 2;

            // 3D transform: side cards rotate inward on the Y-axis,
            // recede in Z, translate outward, scale + fade down.
            const rotateY = off === 0 ? 0 : -off * 42; // curve inward
            const translateX = off * 300;
            const translateZ = isActive ? 60 : -180 - (abs - 1) * 120;
            const scale = isActive ? 1 : Math.max(0.68, 1 - abs * 0.14);
            const opacity = isActive
              ? 1
              : Math.max(0.28, 0.62 - (abs - 1) * 0.22);

            return (
              <button
                type="button"
                key={card.title}
                className={`carousel3d-card${isActive ? " is-active" : ""}`}
                aria-hidden={!visible}
                aria-label={`${card.title}: ${card.value}. ${card.footer}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  // Suppress the click that ends a drag gesture
                  if (Math.abs(dragDeltaX.current) > 6) return;
                  if (!isActive) goTo(i);
                }}
                style={{
                  transform: `translate(-50%, -50%) translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity: visible ? opacity : 0,
                  pointerEvents: visible ? "auto" : "none",
                  zIndex: 100 - abs,
                }}
              >
                {/* Back-glow layer only for the active card */}
                <span className="card-glow" aria-hidden="true" />
                <div className="stat-card-outer">
                  <div className="stat-card-inner">
                    <div>
                      <div className="stat-head">
                        <span className="stat-title">{card.title}</span>
                      </div>
                      <div className="stat-value">{card.value}</div>
                    </div>
                    <div className="stat-details">
                      {card.details.map((d) => (
                        <div className="stat-detail" key={d}>
                          <span className="dot" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="stat-footer">{card.footer}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="carousel3d-controls">
        <button
          type="button"
          className="c3d-arrow"
          aria-label="Previous card"
          onClick={() => go(-1)}
        >
          <i className="bi bi-arrow-left" />
        </button>
        <div
          className="carousel3d-dots"
          role="tablist"
          aria-label="Select card"
        >
          {CARDS.map((c, i) => (
            <button
              type="button"
              key={c.title}
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to ${c.title}`}
              className={`c3d-dot${i === active ? " is-active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="c3d-arrow"
          aria-label="Next card"
          onClick={() => go(1)}
        >
          <i className="bi bi-arrow-right" />
        </button>
      </div>

      <p className="carousel3d-hint" aria-hidden="true">
        Auto-rotating · hover to pause · drag or swipe to explore
      </p>
    </section>
  );
}
