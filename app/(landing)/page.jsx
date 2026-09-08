"use client";

import { useEffect, useRef, useState } from "react";
import anime from "animejs";

const IMAGES = [
  {
    // float-bob — Vercel logo: minimalist monochrome graphite
    src: "/float-bob-2026-09-08.gif",
    overlay: "none",
    gradient: "linear-gradient(150deg, #1a1a1d 0%, #121214 50%, #0a0a0c 100%)",
  },
  {
    // float-bob (1) — Later logo: warm charcoal with subtle depth
    src: "/float-bob-2026-09-08 (1).gif",
    overlay: "none",
    gradient: "linear-gradient(143deg, #19112e 0%, #130d23 52%, #0d0819 100%)",
  },
  {
    // pop-spring — Apple logo: Apple Space Black / Natural Titanium metallic gradient
    src: "/pop-spring-2026-09-08.gif",
    overlay: "none",
    gradient: "linear-gradient(140deg, #2b2c31 0%, #1c1d22 45%, #101114 100%)",
  },
  {
    // pop-spring (1) — Razer logo: deep obsidian green
    src: "/pop-spring-2026-09-08 (1).gif",
    overlay: "none",
    gradient: "linear-gradient(127deg, #0c1d13 0%, #08140e 54%, #060f0a 100%)",
  },
  {
    // trace-bold-sketch — Green slanted bars: pure dark graphite
    src: "/trace-bold-sketch-2026-09-08.gif",
    overlay: "none",
    gradient: "linear-gradient(152deg, #202020 0%, #181818 43%, #111111 100%)",
  },
  {
    // trace-classic — Cloudflare logo: warm deep charcoal
    src: "/trace-classic-2026-09-08.gif",
    overlay: "none",
    gradient: "linear-gradient(146deg, #1e1a16 0%, #161210 50%, #0f0c09 100%)",
  },
  {
    // trace-comet — Samsung logo: Samsung Galaxy Cosmic Midnight Blue
    src: "/trace-comet-2026-09-08.gif",
    overlay: "none",
    gradient: "linear-gradient(148deg, #112255 0%, #0b1538 48%, #050818 100%)",
  },
  {
    // trace-stagger — Supabase logo: cool dark steel
    src: "/trace-stagger-2026-09-08.gif",
    overlay: "none",
    gradient: "linear-gradient(141deg, #101922 0%, #0b1219 53%, #070d14 100%)",
  },
];

const CAPTION_TEXT = "narrowing to breath, ground, and the next ten meters.";

function OrbitOverlay({ kind }) {
  const shadow = { textShadow: "0 1px 3px rgba(0,0,0,.7)" };
  const shadowStrong = { textShadow: "0 1px 4px rgba(0,0,0,.6)" };

  switch (kind) {
    case "split":
      return (
        <div
          className="absolute inset-x-[11px] bottom-[14px] flex justify-between text-[15px] font-extrabold tracking-tight text-white"
          style={shadowStrong}
        >
          <span>JAN</span>
          <span>17TH</span>
        </div>
      );
    case "wordmark":
      return (
        <>
          <div className="absolute left-[9px] top-[9px] h-[14px] w-[14px] rounded-sm border border-white/70 opacity-85" />
          <div
            className="absolute left-[9px] bottom-[9px] text-[14px] font-extrabold tracking-tight text-white"
            style={shadowStrong}
          >
            DUNE<sup className="text-[8px]">&deg;</sup>
          </div>
        </>
      );
    case "burst":
      return (
        <div
          className="absolute inset-0 flex items-center justify-center text-[34px] text-white"
          style={{ textShadow: "0 0 12px rgba(255,255,255,.5)" }}
        >
          &#10038;
        </div>
      );
    case "runningCaption":
      return (
        <>
          <div
            className="absolute left-[9px] top-[9px] text-[9px] font-semibold tracking-wide text-white"
            style={shadow}
          >
            RUNNING
          </div>
          <div
            className="absolute right-[9px] top-[9px] text-[9px] font-semibold text-white"
            style={shadow}
          >
            01
          </div>
          <div
            className="absolute inset-x-[9px] bottom-[9px] text-[8px] font-medium leading-snug text-white opacity-90"
            style={shadow}
          >
            Nowhere to be. Everywhere to go.
          </div>
        </>
      );
    case "caption":
      return (
        <div
          className="absolute inset-x-[9px] bottom-[9px] text-[8px] font-medium leading-snug text-white opacity-85"
          style={shadow}
        >
          {CAPTION_TEXT}
        </div>
      );
    case "beforeCityCaption":
      return (
        <>
          <div
            className="absolute left-[9px] top-[9px] text-[9px] font-semibold tracking-wide text-white"
            style={shadow}
          >
            Before the city
          </div>
          <div
            className="absolute inset-x-[9px] bottom-[9px] text-[8px] font-medium leading-snug text-white opacity-85"
            style={shadow}
          >
            {CAPTION_TEXT}
          </div>
        </>
      );
    case "big":
      return (
        <div
          className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[16px] font-extrabold tracking-tight text-white"
          style={shadowStrong}
        >
          DUBT
        </div>
      );
    default:
      return null;
  }
}

const BASE_ANGULAR_SPEED = 9; // deg / sec at idle
const FAST_SPEED_MULT = 16; // multiplier while actively scrolling/dragging
const START_ANGLE = 1.3;
const IDLE_DELAY = 260; // ms of no input before speed target relaxes
const TARGET_DECAY = 0.94;
const SMOOTHING = 0.14;
const DESKTOP_BREAKPOINT = 640;
const DESKTOP_GAP_REDUCTION = 12; // px closer to center CTA, desktop only
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OrbisLanding() {
  const stageRef = useRef(null);
  const orbitContainerRef = useRef(null);
  const itemRefs = useRef([]);
  const ctaWrapRef = useRef(null);
  const ctaInputRef = useRef(null);

  const [revealed, setRevealed] = useState(() => IMAGES.map(() => false));
  const [isOpen, setIsOpen] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [canHover, setCanHover] = useState(true);

  const nudgeRef = useRef(() => {});

  // Reveal the cards one-by-one shortly after mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      IMAGES.forEach((_, i) => {
        setTimeout(() => {
          setRevealed((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, i * 60);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setCanHover(window.matchMedia("(hover: hover)").matches);
  }, []);

  // Core orbit animation: layout, speed, drag, scroll, resize.
  useEffect(() => {
    const stage = stageRef.current;
    const container = orbitContainerRef.current;
    if (!stage || !container) return;

    const N = IMAGES.length;

    function viewportScale() {
      return Math.min(1.35, Math.max(0.5, window.innerWidth / 1512));
    }
    function isDesktop() {
      return window.innerWidth > DESKTOP_BREAKPOINT;
    }

    let scale = viewportScale();
    let CARD_SIZE = 150 * scale;

    function computeBaseRadius() {
      return 262 * scale - (isDesktop() ? DESKTOP_GAP_REDUCTION : 0);
    }

    let baseRadius = computeBaseRadius();
    let rotation = START_ANGLE;
    let radius = baseRadius;
    let hasSpread = false;

    let speedEnergy = 0;
    let targetSpeedEnergy = 0;
    let lastInteraction = 0;
    let lastTime = null;
    let dragging = false;
    let lastAngle = 0;
    let rafId = 0;

    function applyCardSize() {
      itemRefs.current.forEach((el) => {
        if (!el) return;
        el.style.width = `${CARD_SIZE}px`;
        el.style.height = `${CARD_SIZE}px`;
        el.style.marginLeft = `${-CARD_SIZE / 2}px`;
        el.style.marginTop = `${-CARD_SIZE / 2}px`;
      });
    }
    applyCardSize();

    function triggerSpreadOnce() {
      if (hasSpread) return;
      hasSpread = true;
      const radiusState = { r: baseRadius };
      anime({
        targets: radiusState,
        r: baseRadius + 42 * scale,
        duration: 900,
        easing: "easeOutCubic",
        update: () => {
          radius = radiusState.r;
        },
      });
    }

    function layout() {
      for (let i = 0; i < N; i++) {
        const angle = rotation + (360 / N) * i;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        const el = itemRefs.current[i];
        if (el) el.style.transform = `translate(${x}px, ${y}px)`;
      }
    }

    function tick(t) {
      if (lastTime === null) lastTime = t;
      const dt = (t - lastTime) / 1000;
      lastTime = t;

      if (t - lastInteraction > IDLE_DELAY) {
        targetSpeedEnergy *= TARGET_DECAY;
        if (targetSpeedEnergy < 0.0008) targetSpeedEnergy = 0;
      }

      speedEnergy += (targetSpeedEnergy - speedEnergy) * SMOOTHING;
      if (Math.abs(targetSpeedEnergy - speedEnergy) < 0.0008) {
        speedEnergy = targetSpeedEnergy;
      }

      const speedMult = 1 + speedEnergy * (FAST_SPEED_MULT - 1);
      if (!dragging) {
        rotation += BASE_ANGULAR_SPEED * speedMult * dt;
      }

      layout();
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    function onResize() {
      scale = viewportScale();
      CARD_SIZE = 150 * scale;
      applyCardSize();
      baseRadius = computeBaseRadius();
      radius = hasSpread ? baseRadius + 42 * scale : baseRadius;
    }
    window.addEventListener("resize", onResize);

    function onWheel(e) {
      const boost = Math.min(Math.abs(e.deltaY) / 100, 0.85);
      targetSpeedEnergy = Math.min(1, targetSpeedEnergy + boost);
      lastInteraction = performance.now();
    }
    window.addEventListener("wheel", onWheel, { passive: true });

    function angleFromCenter(clientX, clientY) {
      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
    }

    function pointerDown(e) {
      const p = "touches" in e ? e.touches[0] : e;
      dragging = true;
      stage.classList.add("cursor-grabbing");
      stage.classList.remove("cursor-grab");
      lastAngle = angleFromCenter(p.clientX, p.clientY);
      targetSpeedEnergy = Math.min(1, targetSpeedEnergy + 0.3);
      lastInteraction = performance.now();
    }

    function pointerMove(e) {
      if (!dragging) return;
      const p = "touches" in e ? e.touches[0] : e;
      const angle = angleFromCenter(p.clientX, p.clientY);
      let delta = angle - lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      rotation += delta;
      lastAngle = angle;
      targetSpeedEnergy = Math.min(
        1,
        targetSpeedEnergy + Math.min(Math.abs(delta) / 18, 0.25)
      );
      lastInteraction = performance.now();
    }

    function pointerUp() {
      dragging = false;
      stage.classList.remove("cursor-grabbing");
      stage.classList.add("cursor-grab");
    }

    stage.addEventListener("mousedown", pointerDown);
    window.addEventListener("mousemove", pointerMove);
    window.addEventListener("mouseup", pointerUp);
    stage.addEventListener("touchstart", pointerDown, { passive: true });
    window.addEventListener("touchmove", pointerMove, { passive: true });
    window.addEventListener("touchend", pointerUp);

    nudgeRef.current = () => {
      triggerSpreadOnce();
      targetSpeedEnergy = Math.min(1, targetSpeedEnergy + 0);
      lastInteraction = performance.now();
    };

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel);
      stage.removeEventListener("mousedown", pointerDown);
      window.removeEventListener("mousemove", pointerMove);
      window.removeEventListener("mouseup", pointerUp);
      stage.removeEventListener("touchstart", pointerDown);
      window.removeEventListener("touchmove", pointerMove);
      window.removeEventListener("touchend", pointerUp);
    };
  }, []);

  function shakeInput() {
    setShake(false);
    requestAnimationFrame(() => setShake(true));
  }

  function submitEmail() {
    const value = ctaInputRef.current?.value.trim() ?? "";
    if (value && !EMAIL_RE.test(value)) {
      shakeInput();
      ctaInputRef.current?.focus();
      return;
    }
    nudgeRef.current();
    setIsDone(true);
    setTimeout(() => {
      setIsDone(false);
      setIsOpen(false);
      if (ctaInputRef.current) ctaInputRef.current.value = "";
    }, 2200);
  }

  function handleWrapMouseEnter() {
    if (!canHover) return;
    setIsOpen(true);
    nudgeRef.current();
  }
  function handleWrapMouseLeave() {
    if (!canHover) return;
    setIsOpen(false);
  }

  function handleButtonClick() {
    if (canHover) {
      submitEmail();
      return;
    }
    if (!isOpen) {
      setIsOpen(true);
      nudgeRef.current();
      setTimeout(() => ctaInputRef.current?.focus(), 250);
      return;
    }
    submitEmail();
  }

  const open = isOpen || isDone;

  return (
    <div className="fixed inset-0 flex select-none flex-col justify-between bg-black text-white">
      {/* header */}
      <header className="relative z-20 flex items-center justify-between px-[18px] py-[18px] sm:px-[34px] sm:py-[28px]">
        {/* Logo / wordmark slot — add content here if needed */}
      </header>

      {/* orbit stage */}
      <div
        ref={stageRef}
        className="absolute inset-0 flex cursor-grab items-center justify-center [touch-action:none]"
      >
        <div className="vignette absolute inset-0 z-[5] pointer-events-none" />

        <div
          ref={orbitContainerRef}
          className="absolute left-1/2 top-1/2 h-0 w-0 will-change-transform"
        >
          {IMAGES.map((img, i) => (
            <div
              key={img.src}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={`absolute left-0 top-0 h-[150px] w-[150px] origin-center overflow-hidden rounded-[12px] border border-white/15 backdrop-blur-md shadow-[0_16px_36px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] transition-opacity duration-[800ms] ease-in-out ${
                revealed[i] ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Glass frosted gradient background */}
              <div
                className="absolute inset-0 opacity-90"
                style={{ background: img.gradient }}
              />

              {/* Glass specular sheen reflection */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.10] via-transparent to-black/25" />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 block h-full w-full select-none object-contain scale-[1.25]"
              />

              <OrbitOverlay kind={img.overlay} />
            </div>
          ))}
        </div>

        {/* center CTA */}
        <div
          ref={ctaWrapRef}
          onMouseEnter={handleWrapMouseEnter}
          onMouseLeave={handleWrapMouseLeave}
          className="absolute left-1/2 top-1/2 z-[15] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        >
          <div
            className={`cta-glow pointer-events-none absolute -inset-[70px] rounded-full blur-[28px] transition-opacity duration-[600ms] ease-in-out ${
              open ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/MotionPod.svg"
            alt="MotionPod"
            width={64}
            height={64}
            draggable={false}
            className="mb-4 h-14 w-14 sm:h-16 sm:w-16 select-none object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.65)] transition-transform duration-300 ease-out hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = "/motionpod.svg";
            }}
          />

          <input
            ref={ctaInputRef}
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            inputMode="email"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitEmail();
            }}
            className={`relative w-[210px] rounded-full border border-white/20 bg-white/[0.04] text-center text-sm text-white outline-none transition-[height,opacity,margin-bottom,padding] duration-[380ms] ease-panel placeholder:text-white/45 ${
              open
                ? "mb-[10px] h-[44px] px-4 opacity-100 pointer-events-auto"
                : "mb-0 h-0 px-4 opacity-0 pointer-events-none"
            } ${shake ? "animate-cta-shake" : ""}`}
            onAnimationEnd={() => setShake(false)}
          />

          {isDone ? (
            <span className="whitespace-nowrap text-sm font-semibold text-[#8fd19e]">
              Thanks — you&apos;re on the list.
            </span>
          ) : (
            <button
              onClick={handleButtonClick}
              className={`group relative w-[210px] overflow-hidden whitespace-nowrap rounded-full px-5 py-[13px] text-base font-bold tracking-tight transition-[transform,box-shadow,background-color,color] duration-200 ease-spring ${
                open ? "bg-white text-neutral-900" : "bg-transparent text-white"
              } ${
                open
                  ? "hover:scale-[1.035] hover:shadow-[0_10px_30px_rgba(255,255,255,0.22)] active:scale-[0.96]"
                  : ""
              }`}
            >
              Get Early Access
              {open && (
                <span className="pointer-events-none absolute inset-0 -translate-x-[140%] bg-gradient-to-r from-transparent via-black/[0.08] to-transparent transition-transform duration-[750ms] ease-in-out group-hover:translate-x-[140%]" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
