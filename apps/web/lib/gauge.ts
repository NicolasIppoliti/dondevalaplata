/**
 * Pure SVG ring/gauge geometry (e.g. the /transparencia score ring):
 * `circumference` sizes `stroke-dasharray`, `offset` sizes
 * `stroke-dashoffset` so that exactly `value/max` of the ring reads as
 * "filled" clockwise. Server-rendered, zero client JS -- the ring's
 * progressive "fill" motion is a pure-CSS `@keyframes` animation (see
 * `app/globals.css`'s `.gauge-arc`) driven by these two numbers, not a
 * runtime chart library.
 */

const DEFAULT_GAUGE_RADIUS = 52;

export interface GaugeGeometry {
  radius: number;
  circumference: number;
  offset: number;
}

/**
 * Clamped to a `[0, max]` ratio so an out-of-range `value` (should never
 * happen with real, validated portal data, but this function never trusts
 * an upstream caller blindly) can never render a ring that visually
 * overflows past "full" or wraps past "empty". A non-positive `max` is
 * treated as an empty ring rather than dividing by zero.
 */
export function computeGaugeGeometry(
  value: number,
  max: number,
  radius: number = DEFAULT_GAUGE_RADIUS,
): GaugeGeometry {
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = circumference * (1 - ratio);
  return { radius, circumference, offset };
}
