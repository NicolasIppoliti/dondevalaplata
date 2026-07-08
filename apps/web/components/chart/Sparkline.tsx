import { computeChartLayout, type ChartPointInput } from "@/lib/chartGeometry";

/**
 * Small, quiet decorative trend line for the home hero card -- server
 * rendered, zero client JS (no hover/tooltip; the interactive chart with
 * that behavior lives on /coparticipacion). Purely visual texture next to
 * the CountUp headline figure, so it is `aria-hidden` by default: the
 * accessible figure is the headline number + its plain-language
 * conclusion sentence, never this line alone.
 */
const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 46;
const PADDING = { top: 4, right: 4, bottom: 4, left: 4 };

export function Sparkline({
  points,
  ariaHidden = true,
  className,
}: {
  points: ChartPointInput[];
  ariaHidden?: boolean;
  className?: string;
}) {
  if (points.length < 2) return null;

  const layout = computeChartLayout({
    points,
    viewBoxWidth: VIEW_WIDTH,
    viewBoxHeight: VIEW_HEIGHT,
    padding: PADDING,
  });
  const last = layout.coords[layout.coords.length - 1];
  const linePoints = layout.coords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      aria-hidden={ariaHidden}
      className={className ?? "h-[46px] w-full"}
      preserveAspectRatio="none"
    >
      <polyline
        points={linePoints}
        fill="none"
        stroke="var(--color-ink-2)"
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.55}
      />
      <circle cx={last.x} cy={last.y} r={3.2} fill="var(--color-stamp)" />
    </svg>
  );
}
