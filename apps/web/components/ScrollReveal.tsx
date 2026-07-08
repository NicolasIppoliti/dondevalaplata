"use client";

import { useEffect, useRef, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/**
 * Force-reveal after this long even if the observer never reports an
 * intersection. The mockup author hit exactly this bug: an
 * IntersectionObserver-driven reveal that, under certain scroll positions,
 * never fired -- permanently hiding real content. This failsafe is the
 * fix: content can only ever stay hidden for at most this long.
 */
const FAILSAFE_MS = 1600;

type Phase = "visible" | "armed" | "revealed";

/**
 * CSS-first, JS-enhanced scroll reveal. Default phase is always "visible"
 * -- both during SSR and on the very first client render -- so content
 * renders unconditionally without JS, before hydration, and even if
 * IntersectionObserver isn't supported at all (that's jsdom's own default,
 * matching a real degraded/older browser). Only once mounted, with motion
 * allowed AND an observer available, does it "arm" (fade+offset) and wait
 * to reveal on scroll -- with the failsafe above guaranteeing it can never
 * get stuck armed.
 */
export function ScrollReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("visible");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      return; // Stays "visible" -- content is never hidden.
    }

    let settled = false;
    let observer: IntersectionObserver | undefined;
    let failsafe: number | undefined;

    function reveal() {
      if (settled) return;
      settled = true;
      setPhase("revealed");
    }

    // The rAF activator: arming (fade+offset) is deferred to the next
    // animation frame rather than done synchronously here, so the observer
    // + failsafe are only ever set up for an element that's actually about
    // to render as "armed" -- and it keeps this effect's own body free of
    // a synchronous setState call.
    const armId = requestAnimationFrame(() => {
      setPhase("armed");
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            reveal();
          }
        },
        { threshold: 0.15 },
      );
      observer.observe(node);
      failsafe = window.setTimeout(reveal, FAILSAFE_MS);
    });

    return () => {
      settled = true;
      cancelAnimationFrame(armId);
      observer?.disconnect();
      if (failsafe !== undefined) window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={phase}
      className={`transition-[opacity,transform] duration-500 ease-out ${
        phase === "armed"
          ? "translate-y-3 opacity-0"
          : "translate-y-0 opacity-100"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
