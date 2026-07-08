"use client";

import { useEffect, useState } from "react";

export interface UseCountUpOptions {
  /** Animation duration in ms. Default 900ms. */
  duration?: number;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** Grace period added on top of `duration` before the failsafe fires. */
const FAILSAFE_MARGIN_MS = 250;

/**
 * Reduced-motion-safe count-up for hero figures (home hero amount,
 * /transparencia 81/100 score).
 *
 * - SSR + first client render both return `target` directly -- a visitor
 *   without JS (or before hydration) never sees a flash of "0". Once
 *   mounted, the animation takes over on the next animation frame
 *   (0 -> target), as a progressive enhancement.
 * - `prefers-reduced-motion: reduce` skips the animation entirely and
 *   returns `target` immediately, no animation frame scheduled at all.
 * - A `setTimeout` failsafe (`duration` + 250ms) force-settles on `target`
 *   even if `requestAnimationFrame` stalls or never fires again. This is
 *   the same class of "motion primitive can silently strand content" bug
 *   the mockup author hit with an IntersectionObserver-driven reveal (see
 *   ScrollReveal.tsx) -- here applied to a numeric count instead of
 *   visibility.
 */
export function useCountUp(target: number, options: UseCountUpOptions = {}) {
  const { duration = 900 } = options;
  const [value, setValue] = useState(target);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;

    // `value` is already initialized to `target` (see useState above), so
    // reduced motion needs no state change at all -- nothing to settle.
    if (prefersReducedMotion) {
      return;
    }

    let rafId: number;
    let settled = false;
    const start = performance.now();

    function settle() {
      if (settled) return;
      settled = true;
      setValue(target);
    }

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        settle();
      }
    }

    rafId = requestAnimationFrame(tick);
    const failsafe = window.setTimeout(settle, duration + FAILSAFE_MARGIN_MS);

    return () => {
      settled = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(failsafe);
    };
  }, [target, duration]);

  return value;
}
