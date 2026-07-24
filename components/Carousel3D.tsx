"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ────────────────────────────────────────────────────────────
   3D PERSPECTIVE CAROUSEL
   - Active center card: flat, enlarged, highlighted with back-glow
   - Side cards: curve inward on the 3D Y-axis, lower opacity + scale
   - Auto-rotation with a 3s delayed transition, pauses on hover
   ──────────────────────────────────────────────────────────── */

export type StatCard = {
  title: string;
  value: string;
  footer: string;
  details: string[];
};

const CARDS: StatCard[] = [
  {
    title: "NEURAL ACTIVITY",
    value: "7.2M",
    footer: "LIVE SIGNALS INTERPRETED",
    details: [
      "Continuous temporal synapsing",
      "1024 parallel telemetry streams",
      "Dynamic feed classification active",
    ],
  },
  {
    title: "PREDICTIVE MODEL",
    value: "93%",
    footer: "FORECAST ACCURACY RATE",
    details: [
      "Reinforced gradient mapping",
      "Low latency neural resolution",
      "Adaptive signal feedback system",
    ],
  },
  {
    title: "EPOCH LATENCY",
    value: "0.4ms",
    footer: "CYCLE RESPONSE SPEED",
    details: [
      "Hardware accelerated pipeline",
      "Direct metal shader execution",
      "Temporal synchronization loop",
    ],
  },
  {
    title: "COGNITIVE STREAMS",
    value: "14.8M",
    footer: "REAL-TIME MODEL COHERENCE",
    details: [
      "Distributed synapse projection",
      "High-fidelity entropy filtering",
      "Sub-millisecond state coherence",
    ],
  },
  {
    title: "SYNAPSE DEPTH",
    value: "128L",
    footer: "MODEL RESOLUTION DEPTH",
    details: [
      "Deep feed-forward mapping",
      "Transformer-based neural routing",
      "Multi-dimensional pattern projection",
    ],
  },
  {
    title: "SIGNAL INTEGRITY",
    value: "99.9%",
    footer: "NOISE REDUCTION RATIO",
    details: [
      "Advanced wave-let filtering",
      "Dynamic heuristic balancing",
      "Contextual signal amplification",
    ],
  },
];

const AUTOPLAY_DELAY = 3000; // 3s delayed transition

export default function Carousel3D() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Autoplay with delayed transition, paused on hover / reduced motion
  useEffect(() => {
    if (paused || reduced) return;
    timerRef.current = setTimeout(() => go(1), AUTOPLAY_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, paused, reduced, go]);

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
      aria-label="Model capability metrics"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="carousel3d-stage">
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
            const opacity = isActive ? 1 : Math.max(0.28, 0.62 - (abs - 1) * 0.22);

            return (
              <button
                type="button"
                key={card.title}
                className={`carousel3d-card${isActive ? " is-active" : ""}`}
                aria-hidden={!visible}
                aria-label={`${card.title}: ${card.value}. ${card.footer}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => (isActive ? undefined : goTo(i))}
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
        <div className="carousel3d-dots" role="tablist" aria-label="Select card">
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
    </section>
  );
}
