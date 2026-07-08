import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Page from "@/app/novedades/page";
import { getPortalData } from "@/lib/sources";

/**
 * /novedades — the watchdog "novedades" feed (feature H2b): a neutral,
 * factual log of what the municipality published (and what it hasn't),
 * driven by `data/novedades.json`. Every event's kind is visibly labeled
 * (seeded/auto-detected/auto-stale), never blended silently.
 */
describe("/novedades page", () => {
  it("titles the section as a question, in the display heading level", () => {
    render(<Page />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent?.toLowerCase()).toMatch(
      /qu[eé] public[oó] el municipio|novedades/,
    );
  });

  it("explains the mechanism: the monthly cron diffs published documents and grows this log", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/mensual|cada mes/);
    expect(text).toMatch(/compara|diferencia|diff/);
  });

  it("renders every event from data/novedades.json", () => {
    const { novedades } = getPortalData();
    render(<Page />);
    const region = screen.getByRole("heading", { name: /^Novedades$/ }).closest(
      "section",
    ) as HTMLElement;
    const items = within(region).getAllByRole("listitem");
    expect(items).toHaveLength(novedades.events.length);
  });

  it("labels seeded, auto-detected and auto-stale events distinctly (honesty requirement)", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/dato verificado a mano/i);
    expect(text).toMatch(/estado en vivo/i);
  });

  it("is framed factually, never a judgment of a person or gestión", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/intendente|concejal|partido|corrupci[oó]n/i);
  });

  it("renders dual-link provenance for cited sources", () => {
    render(<Page />);
    expect(
      screen.getAllByRole("link", { name: /fuente original/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: /copia archivada/i }).length,
    ).toBeGreaterThan(0);
  });
});
