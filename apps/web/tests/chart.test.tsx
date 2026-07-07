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
