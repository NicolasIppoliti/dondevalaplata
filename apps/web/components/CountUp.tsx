"use client";

import { useCountUp } from "@/lib/hooks/useCountUp";
import { formatArsHuman } from "@/lib/format";

export type CountUpVariant = "plain" | "arsHuman";

const FORMATTERS: Record<CountUpVariant, (value: number) => string> = {
  plain: (value) => value.toLocaleString("es-AR"),
  arsHuman: formatArsHuman,
};

/**
 * Thin presentational wrapper around `useCountUp` (lib/hooks/useCountUp.ts
 * carries the reduced-motion + failsafe logic). Used for hero figures: the
 * home hero amount and the /transparencia 81/100 score.
 *
 * `variant` selects a named formatter instead of accepting a function prop
 * on purpose: this component is rendered from Server Component pages, and
 * functions cannot cross the Server->Client Component boundary in React
 * Server Components (a slice 1 latent bug -- unexercised until slice 2
 * actually wired `<CountUp>` into `app/page.tsx` and `next build` failed
 * with "Functions cannot be passed directly to Client Components").
 */
export function CountUp({
  target,
  duration,
  variant = "plain",
  className,
}: {
  target: number;
  duration?: number;
  variant?: CountUpVariant;
  className?: string;
}) {
  const value = useCountUp(target, { duration });
  return <span className={className}>{FORMATTERS[variant](value)}</span>;
}
