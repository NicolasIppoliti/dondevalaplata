import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SvgChart } from "@/components/chart/SvgChart";
import { DataTable } from "@/components/chart/DataTable";
import type { ChartSeriesData } from "@/components/chart/types";

const series: ChartSeriesData[] = [
  {
    id: "06182",
    label: "Coronel Rosales",
    points: [
      { period: "2026-03", value: 100 },
      { period: "2026-04", value: 200 },
    ],
  },
  {
    id: "06056",
    label: "Bahía Blanca",
    points: [
      { period: "2026-03", value: 300 },
      { period: "2026-04", value: 400 },
    ],
  },
];

describe("SvgChart", () => {
  it("renders a static SVG with one polyline per series and no client script", () => {
    const { container } = render(
      <SvgChart series={series} ariaLabel="Serie de prueba" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Serie de prueba");
    expect(container.querySelectorAll("polyline")).toHaveLength(2);
  });
});

describe("DataTable", () => {
  it("renders an accessible table with column headers and row headers", () => {
    render(
      <DataTable
        caption="Tabla de prueba"
        series={series}
        formatValue={(v) => String(v)}
      />,
    );
    const table = screen.getByRole("table", { name: "Tabla de prueba" });
    const columnHeaders = within(table).getAllByRole("columnheader");
    expect(columnHeaders.map((th) => th.textContent)).toEqual([
      "Período",
      "Coronel Rosales",
      "Bahía Blanca",
    ]);
    const rowHeaders = within(table).getAllByRole("rowheader");
    expect(rowHeaders).toHaveLength(2);
    expect(rowHeaders[0].getAttribute("scope")).toBe("row");
    expect(columnHeaders[0].getAttribute("scope")).toBe("col");
  });
});

// Bug reproduction: series were indexed POSITIONALLY (row index into
// series[0]'s period array) instead of by period key. A series missing a
// middle month shifted every later value one row up and, once its shorter
// points array ran out, fabricated a "$ 0" for the last row.
const seriesWithGap: ChartSeriesData[] = [
  {
    id: "06182",
    label: "Coronel Rosales",
    points: [
      { period: "2026-01", value: 10 },
      { period: "2026-02", value: 20 },
      { period: "2026-03", value: 30 },
    ],
  },
  {
    id: "06056",
    label: "Bahía Blanca",
    points: [
      { period: "2026-01", value: 100 },
      // 2026-02 missing (not yet published for this municipio)
      { period: "2026-03", value: 300 },
    ],
  },
];

describe("DataTable — red numbers integrity fix (never color-only)", () => {
  it("prefixes a negative-variation cell with a neutral ▼ marker, not color alone", () => {
    const drop: ChartSeriesData[] = [
      {
        id: "06182",
        label: "Coronel Rosales",
        points: [
          { period: "2026-03", value: 200 },
          { period: "2026-04", value: 100 },
        ],
      },
    ];
    render(
      <DataTable
        caption="Tabla de prueba"
        series={drop}
        formatValue={(v) => String(v)}
        colorizeBySign
      />,
    );
    const cell = screen.getByText(/▼/);
    expect(cell.textContent).toContain("100");
  });

  it("shows the red-numbers legend once when colorizeBySign is on", () => {
    render(
      <DataTable
        caption="Tabla de prueba"
        series={series}
        formatValue={(v) => String(v)}
        colorizeBySign
      />,
    );
    expect(
      screen.getByText("En rojo: cayó respecto del mes anterior."),
    ).toBeTruthy();
  });

  it("does not show the legend when colorizeBySign is off (default)", () => {
    render(
      <DataTable
        caption="Tabla de prueba"
        series={series}
        formatValue={(v) => String(v)}
      />,
    );
    expect(
      screen.queryByText("En rojo: cayó respecto del mes anterior."),
    ).toBeNull();
  });
});

describe("DataTable — full precision on tap/hover", () => {
  it("carries the full-precision value in a title attribute when formatFullPrecision is given", () => {
    const { container } = render(
      <DataTable
        caption="Tabla de prueba"
        series={series}
        formatValue={() => "$ 100"}
        formatFullPrecision={(v) => `$ ${v}`}
      />,
    );
    const withTitle = container.querySelector('[title="$ 100"]');
    expect(withTitle).not.toBeNull();
  });
});

describe("DataTable — period-keyed indexing (missing middle month)", () => {
  it("aligns cells by period key, never shifting a shorter series' values", () => {
    render(
      <DataTable
        caption="Tabla con hueco"
        series={seriesWithGap}
        formatValue={(v) => String(v)}
      />,
    );
    const table = screen.getByRole("table", { name: "Tabla con hueco" });
    const bodyRows = table.querySelectorAll("tbody tr");
    expect(bodyRows).toHaveLength(3); // union of periods: 3 rows, not 2

    const cellsFor = (row: Element) =>
      Array.from(row.querySelectorAll("th, td")).map((el) => el.textContent);

    expect(cellsFor(bodyRows[0])).toEqual(["2026-01", "10", "100"]);
    // The missing month must show an explicit "no data" marker, NOT the
    // next real value shifted up, and NOT a fabricated "0".
    expect(cellsFor(bodyRows[1])).toEqual(["2026-02", "20", "s/d"]);
    expect(cellsFor(bodyRows[2])).toEqual(["2026-03", "30", "300"]);
  });
});

describe("SvgChart — hero chart mode (coparticipación page)", () => {
  it("hides the swatch legend when showLegend is false (a single bold end-of-line label already identifies the line)", () => {
    const { container } = render(
      <SvgChart
        series={[series[0]]}
        ariaLabel="Serie de prueba"
        showLastPointLabel
        showLegend={false}
      />,
    );
    expect(container.querySelector("ul")).toBeNull();
  });

  it("still shows the legend by default (existing multi-series callers are unaffected)", () => {
    const { container } = render(
      <SvgChart series={series} ariaLabel="Serie de prueba" />,
    );
    expect(container.querySelector("ul")).not.toBeNull();
  });

  it("renders more gridlines when gridLineCount is raised (>=1 intermediate tick per year on a multi-year series)", () => {
    const { container: fewGridLines } = render(
      <SvgChart
        series={series}
        ariaLabel="Serie de prueba"
        gridLineCount={3}
      />,
    );
    const { container: manyGridLines } = render(
      <SvgChart
        series={series}
        ariaLabel="Serie de prueba"
        gridLineCount={6}
      />,
    );
    const countLines = (container: HTMLElement) =>
      container.querySelectorAll("svg > g > line").length;
    expect(countLines(manyGridLines)).toBeGreaterThan(countLines(fewGridLines));
  });

  it("renders an axis unit caption above the chart when axisUnitLabel is given", () => {
    render(
      <SvgChart
        series={series}
        ariaLabel="Serie de prueba"
        axisUnitLabel="Montos en pesos, ajustados por inflación"
      />,
    );
    expect(
      screen.getByText("Montos en pesos, ajustados por inflación"),
    ).toBeTruthy();
  });

  it("applies a custom height className instead of the default h-auto (so the hero chart can be ~50vh tall)", () => {
    const { container } = render(
      <SvgChart
        series={series}
        ariaLabel="Serie de prueba"
        heightClassName="h-[50vh] max-h-[480px] w-full"
      />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toBe("h-[50vh] max-h-[480px] w-full");
  });
});

describe("SvgChart — period-keyed indexing (missing middle month)", () => {
  it("skips the missing point instead of shifting later points leftward", () => {
    const { container } = render(
      <SvgChart series={seriesWithGap} ariaLabel="Serie con hueco" />,
    );
    const polylines = container.querySelectorAll("polyline");
    expect(polylines).toHaveLength(2);

    const gappedPoints = polylines[1].getAttribute("points") ?? "";
    const coords = gappedPoints.trim().split(/\s+/);
    // Only 2 real points for the gapped series (Jan, Mar) -- no fabricated
    // third point for the missing February.
    expect(coords).toHaveLength(2);
    const [firstX] = coords[0].split(",").map(Number);
    const [secondX] = coords[1].split(",").map(Number);
    // The second real point (March) must sit at the March x-position
    // (index 2 of 3 canonical periods), not compressed into index 1 as if
    // it were the series' second point.
    expect(secondX).toBeGreaterThan(firstX);
    const fullSeriesPoints = (polylines[0].getAttribute("points") ?? "")
      .trim()
      .split(/\s+/);
    const marchXFromFullSeries = Number(fullSeriesPoints[2].split(",")[0]);
    expect(secondX).toBeCloseTo(marchXFromFullSeries, 1);
  });
});
