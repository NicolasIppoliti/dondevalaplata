import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import novedadesValid from "./fixtures/novedades.valid.json";
import { NovedadesFeed } from "@/components/novedades/NovedadesFeed";
import { loadNovedades } from "@/lib/data";

/**
 * NovedadesFeed (feature H2b): the watchdog "novedades" publication-
 * behavior log -- a neutral, factual list of "what the municipality
 * published and when" + "what remains unpublished". Every event's `kind`
 * must be visibly labeled (seeded/auto-detected/auto-stale), per the
 * HONESTY requirement that seeded/known facts are never blended silently
 * with computed ones.
 */
describe("NovedadesFeed", () => {
  const novedades = loadNovedades(novedadesValid);

  it("renders one item per event, in the order given (already newest-first)", () => {
    render(<NovedadesFeed novedades={novedades} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  it("labels each event's kind visibly (never blends seeded with computed silently)", () => {
    render(<NovedadesFeed novedades={novedades} />);
    expect(screen.getByText(/dato verificado a mano/i)).toBeTruthy();
    expect(screen.getByText(/detectado autom[aá]ticamente/i)).toBeTruthy();
    expect(screen.getByText(/estado en vivo/i)).toBeTruthy();
  });

  it("shows each event's title and detail", () => {
    render(<NovedadesFeed novedades={novedades} />);
    expect(
      screen.getByText(/Situación Económico-Financiera del 1er semestre 2026/),
    ).toBeTruthy();
    expect(screen.getByText(/Dimensión ASAP al máximo puntaje\./)).toBeTruthy();
  });

  it('renders "sigue sin actualizar" facts with the neutral ocre token, never stamp/alarm', () => {
    const { container } = render(<NovedadesFeed novedades={novedades} />);
    expect(container.querySelector(".border-ocre")).not.toBeNull();
  });

  it("is framed factually, never a judgment of a person or gestión", () => {
    const { container } = render(<NovedadesFeed novedades={novedades} />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/intendente|concejal|partido|corrupci[oó]n/i);
  });

  it("renders an empty-state message when there are no events (never crashes)", () => {
    render(<NovedadesFeed novedades={{ ...novedades, events: [] }} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText(/sin novedades/i)).toBeTruthy();
  });
});
