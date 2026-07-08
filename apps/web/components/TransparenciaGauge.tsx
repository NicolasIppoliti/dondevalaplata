import { CountUp } from "@/components/CountUp";
import { computeGaugeGeometry } from "@/lib/gauge";

/**
 * The /transparencia score ring (server-rendered SVG, geometry from the
 * pure, tested `computeGaugeGeometry` -- see `lib/gauge.ts`), extracted
 * into its own component (fidelity slice F2) so the home dashboard preview
 * can REUSE the exact same ring at a smaller `size` instead of a second,
 * duplicated inline SVG. Behavior/markup is otherwise unchanged from the
 * ring `/transparencia` already shipped: the arc uses `--ink-2` (neutral
 * graphite, never `--olive`/`--stamp` -- the absolute score itself is not
 * an arithmetic variation of anything, see DESIGN.md's neutrality rule),
 * its "fill" motion is the pure-CSS `.gauge-arc` keyframe (app/globals.css),
 * and `<CountUp>`'s SSR/first-render already shows the FINAL value so a
 * no-JS visitor never sees a bare "0".
 *
 * The ring itself stays `aria-hidden`: the fraction text underneath it is
 * the ONE accessible source of truth for the score, never duplicated.
 *
 * `fontSize` scales proportionally with `size` (both anchored to the
 * original 176px/26px pairing /transparencia already validated) so a
 * smaller preview ring keeps the same visual relationship between the ring
 * and the text inside it, without a second magic number to keep in sync.
 */

const DEFAULT_SIZE = 176;
const DEFAULT_FONT_SIZE = 26;

interface TransparenciaGaugeProps {
  value: number;
  max: number;
  size?: number;
}

export function TransparenciaGauge({
  value,
  max,
  size = DEFAULT_SIZE,
}: TransparenciaGaugeProps) {
  const gauge = computeGaugeGeometry(value, max);
  const fontSize = Math.round((size / DEFAULT_SIZE) * DEFAULT_FONT_SIZE);

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg
        aria-hidden="true"
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="-rotate-90"
      >
        <circle
          cx="60"
          cy="60"
          r={gauge.radius}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="13"
        />
        <circle
          cx="60"
          cy="60"
          r={gauge.radius}
          fill="none"
          stroke="var(--color-ink-2)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={gauge.circumference}
          strokeDashoffset={gauge.offset}
          className="gauge-arc"
          style={
            {
              "--gauge-circumference": gauge.circumference,
              "--gauge-offset": gauge.offset,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className="font-mono leading-none font-semibold tracking-tight text-ink tabular-nums"
          style={{ fontSize }}
        >
          <CountUp target={value} variant="plain" />
          {` / ${max}`}
        </p>
      </div>
    </div>
  );
}
