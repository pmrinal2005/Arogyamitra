"use client";

import { useEffect } from "react";
import Carousel3D from "@/components/Carousel3D";
import A3Film from "@/components/A3Film";

// Reusable logo SVG (identical paths to the original site)
function LogoGlyph() {
  return (
    <svg viewBox="-50 -50 100 100">
      <g fill="currentColor">
        <path d="M 1.5,23 L 1.5,33 C 1.5,38.5 6,43 11.5,43 L 16.5,43 C 22,43 26.5,38.5 26.5,33 Q 28,28 33,26.5 C 38.5,26.5 43,22 43,16.5 L 43,11.5 C 43,6 38.5,1.5 33,1.5 L 23,1.5 Q 12,12 1.5,23 Z" />
        <path
          d="M 1.5,23 L 1.5,33 C 1.5,38.5 6,43 11.5,43 L 16.5,43 C 22,43 26.5,38.5 26.5,33 Q 28,28 33,26.5 C 38.5,26.5 43,22 43,16.5 L 43,11.5 C 43,6 38.5,1.5 33,1.5 L 23,1.5 Q 12,12 1.5,23 Z"
          transform="rotate(90)"
        />
        <path
          d="M 1.5,23 L 1.5,33 C 1.5,38.5 6,43 11.5,43 L 16.5,43 C 22,43 26.5,38.5 26.5,33 Q 28,28 33,26.5 C 38.5,26.5 43,22 43,16.5 L 43,11.5 C 43,6 38.5,1.5 33,1.5 L 23,1.5 Q 12,12 1.5,23 Z"
          transform="rotate(180)"
        />
        <path
          d="M 1.5,23 L 1.5,33 C 1.5,38.5 6,43 11.5,43 L 16.5,43 C 22,43 26.5,38.5 26.5,33 Q 28,28 33,26.5 C 38.5,26.5 43,22 43,16.5 L 43,11.5 C 43,6 38.5,1.5 33,1.5 L 23,1.5 Q 12,12 1.5,23 Z"
          transform="rotate(270)"
        />
      </g>
    </svg>
  );
}

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_39ca84eAE1ODL9hbR5VhoEj8tBf/hf_20260613_120544_a609e0c2-e52d-4bd5-b10f-b66ac51f1965.mp4";

export default function SynapseX() {
  useEffect(() => {
    let cleanup = init();

    function init(): () => void {
      // ── Constants ──
      const GLYPHS =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><";

      // ── State ──
      let scrollProgress = 0;
      let smoothScrollProgress = 0;
      let entrancePhase: "loading" | "animating" | "complete" = "loading";
      let entranceStart = 0;
      let videoReady = false;

      // ── Elements ──
      const video = document.getElementById("bg-video") as HTMLVideoElement;
      const header = document.getElementById("main-header")!;
      const mainContent = document.getElementById("main-content")!;
      const heroSection = document.getElementById("hero-section")!;
      const heroDesc = document.getElementById("hero-desc")! as HTMLElement & {
        _entered?: boolean;
      };
      const cinematicInner = document.getElementById("cinematic-inner")!;

      // ── Hamburger Menus ──
      const hamburgerBtn = document.getElementById("hamburger-btn")!;
      const hamburgerBtnM = document.getElementById("hamburger-btn-m")!;

      const onHamburger = () => {
        document.getElementById("menu-pill")!.classList.toggle("open");
      };
      const onHamburgerM = () => {
        const pill = document.getElementById("menu-pill-m")!;
        const logo = document.getElementById("logo-pill-m")!;
        pill.classList.toggle("open");
        logo.classList.toggle("collapsed", pill.classList.contains("open"));
      };
      hamburgerBtn.addEventListener("click", onHamburger);
      hamburgerBtnM.addEventListener("click", onHamburgerM);

      (window as any).closeMobileMenu = function () {
        document.getElementById("menu-pill-m")!.classList.remove("open");
        document.getElementById("logo-pill-m")!.classList.remove("collapsed");
      };

      // ── Scroll Tracking ──
      function updateScrollProgress() {
        const scrollTop =
          window.scrollY || document.documentElement.scrollTop;
        const scrollHeight =
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight;
        if (scrollHeight <= 0) return;
        scrollProgress = scrollTop / scrollHeight;
      }
      window.addEventListener("scroll", updateScrollProgress, {
        passive: true,
      });
      updateScrollProgress();

      // ── Lenis (Desktop only) ──
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768;

      if (!isMobile) {
        const lenisScript = document.createElement("script");
        lenisScript.src = "https://unpkg.com/lenis@1.1.18/dist/lenis.min.js";
        lenisScript.onload = function () {
          const Lenis = (window as any).Lenis;
          if (!Lenis) return;
          const lenis = new Lenis({
            duration: 1.2,
            easing: function (t: number) {
              return Math.min(1, 1.001 - Math.pow(2, -10 * t));
            },
            smoothWheel: true,
            wheelMultiplier: 1.0,
            touchMultiplier: 1.5,
          });
          lenis.on("scroll", updateScrollProgress);
          function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
          }
          requestAnimationFrame(raf);
        };
        document.head.appendChild(lenisScript);
      }

      // ── ScrambleIn System ──
      const scrambleEls = document.querySelectorAll("[data-scramble-in]");
      const scrambleStates: any[] = [];

      scrambleEls.forEach((el) => {
        const text = el.getAttribute("data-text") || "";
        const delay = parseInt(el.getAttribute("data-delay") || "0", 10);
        scrambleStates.push({
          el,
          text,
          delay,
          phase: "idle",
          progress: 0,
          lastTime: 0,
          started: false,
        });
      });

      function updateScrambles(now: number) {
        const scrollActive = scrollProgress > 0.015;

        scrambleStates.forEach((s) => {
          if (!videoReady && s.phase === "idle") return;

          if (
            videoReady &&
            s.phase === "idle" &&
            !scrollActive &&
            !s.started
          ) {
            s.started = true;
            setTimeout(() => {
              s.phase = "scrambling-in";
              s.progress = 0;
              s.lastTime = now;
            }, s.delay);
            return;
          }

          if (
            scrollActive &&
            (s.phase === "revealed" || s.phase === "scrambling-in")
          ) {
            s.phase = "scrambling-out";
            s.progress = 0;
            s.lastTime = now;
          } else if (
            !scrollActive &&
            (s.phase === "hidden" || s.phase === "scrambling-out")
          ) {
            s.phase = "scrambling-in";
            s.progress = 0;
            s.lastTime = now;
          }

          if (s.phase === "scrambling-in") {
            const duration = 900;
            s.progress = Math.min(1, s.progress + (now - s.lastTime) / duration);
            s.lastTime = now;
            const t = s.progress;

            let result = "";
            for (let i = 0; i < s.text.length; i++) {
              if (s.text[i] === " ") {
                result += " ";
                continue;
              }
              const threshold = i / s.text.length;
              if (t >= threshold + 0.15) result += s.text[i];
              else if (t >= threshold - 0.1)
                result += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
              else result += "\u00A0";
            }
            s.el.textContent = result;
            s.el.style.opacity = "1";

            if (t >= 1) {
              s.phase = "revealed";
              s.el.textContent = s.text;
            }
          } else if (s.phase === "scrambling-out") {
            const duration = 700;
            s.progress = Math.min(1, s.progress + (now - s.lastTime) / duration);
            s.lastTime = now;
            const t = s.progress;

            let result = "";
            for (let i = 0; i < s.text.length; i++) {
              if (s.text[i] === " ") {
                result += " ";
                continue;
              }
              const threshold = i / s.text.length;
              if (t >= threshold + 0.2) result += "\u00A0";
              else if (t >= threshold - 0.05)
                result += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
              else result += s.text[i];
            }
            s.el.textContent = result;
            s.el.style.opacity = String(Math.max(0, 1 - t * 1.5));

            if (t >= 1) {
              s.phase = "hidden";
              s.el.textContent = s.text.replace(/\S/g, "\u00A0");
              s.el.style.opacity = "0";
            }
          }
        });
      }

      // ── Main Animation Loop ──
      let isSeeking = false;
      let nextSeekTime: number | null = null;

      const onSeeking = () => {
        isSeeking = true;
      };
      const onSeeked = () => {
        isSeeking = false;
        if (nextSeekTime !== null) {
          const t = nextSeekTime;
          nextSeekTime = null;
          if (video.readyState >= 1 && video.duration > 0) {
            isSeeking = true;
            video.currentTime = t;
          }
        }
      };
      const onLoadedMeta = () => {
        video.autoplay = false;
        video.pause();
      };
      video.addEventListener("seeking", onSeeking);
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("loadedmetadata", onLoadedMeta);
      video.autoplay = false;
      video.pause();

      // Safety timeout
      const safetyTimeout = window.setTimeout(() => {
        if (entrancePhase === "loading") {
          entrancePhase = "animating";
          entranceStart = performance.now();
        }
      }, 3500);

      let rafId = 0;
      let disposed = false;

      function tick(now: number) {
        // ── Smooth scroll interpolation ──
        smoothScrollProgress +=
          (scrollProgress - smoothScrollProgress) * 0.12;
        if (Math.abs(scrollProgress - smoothScrollProgress) < 0.0001)
          smoothScrollProgress = scrollProgress;

        // ── Video blur + scale ──
        const subtleBase = Math.max(
          0,
          Math.min(1, (smoothScrollProgress - 0.1) / 0.45)
        );
        const progressive = Math.max(
          0,
          Math.min(1, (smoothScrollProgress - 0.55) / 0.4)
        );
        const blurVal = subtleBase * 5 + progressive * 50;
        const scaleVal =
          1.03 +
          Math.max(0, Math.min(1, (smoothScrollProgress - 0.1) / 0.9)) * 0.08;

        // ── Video entrance ──
        let entranceZoom = 1.0;
        let entranceOpacity = 1.0;

        if (entrancePhase === "loading") {
          entranceZoom = 1.12;
          entranceOpacity = 0;
          if (video.readyState >= 3) {
            entrancePhase = "animating";
            entranceStart = performance.now();
          }
        }

        if (entrancePhase === "animating") {
          const elapsed = now - entranceStart;
          const progress = Math.min(1, elapsed / 1400);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          entranceZoom = 1.12 - 0.12 * easeOut;
          entranceOpacity = Math.min(1.0, elapsed / 500);

          if (progress >= 1) {
            entrancePhase = "complete";
            videoReady = true;
            header.classList.add("visible");
            mainContent.classList.add("visible");
          }
        }

        if (entrancePhase === "complete" && !videoReady) {
          videoReady = true;
          header.classList.add("visible");
          mainContent.classList.add("visible");
        }

        // Apply video styles
        video.style.filter = `blur(${blurVal}px)`;
        video.style.transform = `scale(${scaleVal * entranceZoom})`;
        video.style.opacity = String(entranceOpacity);

        // ── Video seek ──
        if (video.readyState >= 1 && video.duration > 0) {
          const targetTime = Math.max(
            0,
            Math.min(video.duration, smoothScrollProgress * video.duration)
          );
          if (Math.abs(video.currentTime - targetTime) > 0.008) {
            if (!isSeeking && !video.seeking) {
              isSeeking = true;
              video.currentTime = targetTime;
            } else {
              nextSeekTime = targetTime;
            }
          }
        }

        // ── Hero section parallax ──
        const scrollH =
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight;
        const scrollYNorm = scrollH > 0 ? window.scrollY / scrollH : 0;

        // Hero fade
        const heroOp = Math.max(0, Math.min(1, 1 - scrollYNorm / 0.26));
        const heroSc = 1 - (1 - 0.96) * Math.min(1, scrollYNorm / 0.26);
        heroSection.style.opacity = String(heroOp);
        heroSection.style.transform = `scale(${heroSc})`;

        // Desc fade
        const descOp = Math.max(0, Math.min(1, 1 - scrollYNorm / 0.12));
        const descYval = -30 * Math.min(1, scrollYNorm / 0.12);
        heroDesc.style.opacity = String(descOp);
        heroDesc.style.transform = `translateY(${descYval}px)`;

        // ── Cinematic paragraph ──
        const yVal = -120 * Math.min(1, window.scrollY / 1000);

        // Opacity keyframes: [0.08, 0.22, 0.42, 0.65] -> [0, 1, 1, 0]
        let cinOp = 0;
        if (scrollYNorm <= 0.08) cinOp = 0;
        else if (scrollYNorm <= 0.22)
          cinOp = (scrollYNorm - 0.08) / (0.22 - 0.08);
        else if (scrollYNorm <= 0.42) cinOp = 1;
        else if (scrollYNorm <= 0.65)
          cinOp = 1 - (scrollYNorm - 0.42) / (0.65 - 0.42);
        else cinOp = 0;

        cinematicInner.style.transform = `rotateX(24deg) translateY(${yVal}px) translateZ(15px)`;
        cinematicInner.style.opacity = String(Math.max(0, Math.min(1, cinOp)));

        // ── ScrambleIn updates ──
        updateScrambles(now);

        // ── Hero desc entrance ──
        if (videoReady && !heroDesc._entered) {
          heroDesc._entered = true;
          heroDesc.style.transition =
            "opacity 0.9s cubic-bezier(0.215,0.61,0.355,1) 0.2s, transform 0.9s cubic-bezier(0.215,0.61,0.355,1) 0.2s";
          heroDesc.style.opacity = "1";
          heroDesc.style.transform = "translateY(0)";
        }

        if (!disposed) rafId = requestAnimationFrame(tick);
      }

      // Set initial desc state
      heroDesc.style.opacity = "0";
      heroDesc.style.transform = "translateY(25px)";

      rafId = requestAnimationFrame(tick);

      // ── Cleanup on unmount ──
      return () => {
        disposed = true;
        cancelAnimationFrame(rafId);
        clearTimeout(safetyTimeout);
        window.removeEventListener("scroll", updateScrollProgress);
        hamburgerBtn.removeEventListener("click", onHamburger);
        hamburgerBtnM.removeEventListener("click", onHamburgerM);
        video.removeEventListener("seeking", onSeeking);
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("loadedmetadata", onLoadedMeta);
      };
    }

    return () => cleanup();
  }, []);

  return (
    <>
      {/* LAYER 0: Background Video */}
      <div id="video-layer">
        <video
          id="bg-video"
          loop
          muted
          playsInline
          preload="auto"
          src={VIDEO_URL}
        />
      </div>

      {/* LAYER 1: Bottom Blur */}
      <div id="bottom-blur" />

      {/* HEADER */}
      <header id="main-header">
        {/* Desktop */}
        <div
          className="desktop-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
          }}
        >
          <div className="header-left">
            <div
              className="logo-pill"
              id="logo-pill"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <LogoGlyph />
              <span>SynapseX</span>
            </div>
            <div className="menu-pill" id="menu-pill">
              <button
                className="hamburger-btn"
                id="hamburger-btn"
                aria-label="Toggle Menu"
              >
                <div className="hamburger-icon">
                  <span />
                  <span />
                  <span />
                </div>
              </button>
              <div className="menu-links">
                <span
                  onClick={() => {
                    window.scrollTo({
                      top: window.innerHeight,
                      behavior: "smooth",
                    });
                    document.getElementById("menu-pill")!.classList.remove("open");
                  }}
                >
                  About
                </span>
                <span
                  onClick={() => {
                    window.scrollTo({
                      top: window.innerHeight * 2,
                      behavior: "smooth",
                    });
                    document.getElementById("menu-pill")!.classList.remove("open");
                  }}
                >
                  Metrics
                </span>
              </div>
            </div>
          </div>
          <a
            className="download-btn"
            href="https://www.instagram.com/dmitriyinin"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-apple" />
            <span>Download</span>
          </a>
        </div>

        {/* Mobile */}
        <div className="mobile-header">
          <div className="mobile-left">
            <div
              className="logo-pill-m"
              id="logo-pill-m"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <LogoGlyph />
              <span>SynapseX</span>
            </div>
            <div className="menu-pill-m" id="menu-pill-m">
              <button
                className="hamburger-btn-m"
                id="hamburger-btn-m"
                aria-label="Toggle Menu Mobile"
              >
                <div className="hamburger-icon-m">
                  <span />
                  <span />
                  <span />
                </div>
              </button>
              <div className="menu-links-m">
                <span
                  onClick={() => {
                    window.scrollTo({
                      top: window.innerHeight,
                      behavior: "smooth",
                    });
                    (window as any).closeMobileMenu?.();
                  }}
                >
                  About
                </span>
                <span
                  onClick={() => {
                    window.scrollTo({
                      top: window.innerHeight * 2,
                      behavior: "smooth",
                    });
                    (window as any).closeMobileMenu?.();
                  }}
                >
                  Metrics
                </span>
              </div>
            </div>
          </div>
          <a
            className="download-btn-m"
            href="https://www.instagram.com/dmitriyinin"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-apple" />
            <span>Download</span>
          </a>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main id="main-content">
        <div className="dot-grid" />

        {/* SECTION 1: Hero */}
        <div id="hero-section">
          <div
            style={{
              width: "100%",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "48px",
            }}
          >
            <div className="hero-grid">
              <div style={{ textAlign: "left" }}>
                <div className="hero-title">
                  <span
                    className="scramble-line"
                    data-scramble-in
                    data-text="Brain"
                    data-delay="100"
                  >
                    {"\u00A0\u00A0\u00A0\u00A0\u00A0"}
                  </span>
                  <span
                    className="scramble-line"
                    data-scramble-in
                    data-text="And Body"
                    data-delay="300"
                  >
                    {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                  </span>
                </div>
              </div>
              <div />
            </div>

            <div className="hero-grid-bottom">
              <div className="hero-desc" id="hero-desc">
                <p>
                  Built at the intersection of neuroscience and artificial
                  intelligence. SynapseX continuously maps neural pathways,
                  cognitive load, and physiological states into a single
                  adaptive intelligence layer.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  textAlign: "right",
                }}
              >
                <div className="hero-title right">
                  <span
                    className="scramble-line"
                    data-scramble-in
                    data-text="One"
                    data-delay="200"
                  >
                    {"\u00A0\u00A0\u00A0"}
                  </span>
                  <span
                    className="scramble-line"
                    data-scramble-in
                    data-text="Network"
                    data-delay="400"
                  >
                    {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1.5: Cinematic Parallax Paragraph */}
        <div id="cinematic-section">
          <div id="cinematic-inner">
            <h2>
              A neural-AI interface built on the architecture of the human
              nervous system. SynapseX translates synaptic activity into
              computational intelligence. Every signal becomes measurable,
              structured, and visible. It continuously reconstructs internal
              state as a dynamic neural map. Biological noise is filtered into
              actionable cognitive patterns.
            </h2>
          </div>
        </div>

        {/* SECTION 2: 3D Perspective Carousel (replaces Swiper coverflow) */}
        <Carousel3D />
      </main>

      {/* SECTION 3+: Cinematic "ENTER THE A" launch film for Arogyamitra A3 */}
      <A3Film />
    </>
  );
}
