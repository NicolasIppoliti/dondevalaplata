"use client";

import { useCountUp } from "@/lib/hooks/useCountUp";

/**
 * Thin presentational wrapper around `useCountUp` (lib/hooks/useCountUp.ts
 * carries the reduced-motion + failsafe logic). Used for hero figures: the
 * home hero amount and the /transparencia 81/100 score. `format` lets each
 * call site keep its own es-AR number formatting (e.g. `formatArsHuman`)
 * without this component knowing about money-specific rules.
 */
export function CountUp({
  target,
  duration,
  format = (value: number) => value.toLocaleString("es-AR"),
  className,
}: {
  target: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const value = useCountUp(target, { duration });
  return <span className={className}>{format(value)}</span>;
}
