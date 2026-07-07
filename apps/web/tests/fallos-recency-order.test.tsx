import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FallosIndexPage from "@/app/fallos/page";
import { FalloEjercicioView } from "@/components/fallos/FalloEjercicioView";
import { getPortalData } from "@/lib/sources";

/**
 * Honesty guarantee for the recency-order capability: surfacing the newest
 * ejercicio first must NEVER become a removal or suppression mechanism.
 * Both halves are asserted together, in the SAME tests, so ordering can
 * never regress into hiding data without this test catching it:
 *
 *   (a) completeness -- every ejercicio present in data/fallos.json is
 *       still listed, and every distinct official with a fine (i.e. every
 *       administration named in the data) still appears somewhere on the
 *       site.
 *   (b) ordering -- the listed ejercicios are strictly descending (newest
 *       first), so the current administration's ejercicio naturally leads
 *       simply because it is the most recent -- not because anything else
 *       was demoted or removed.
 */
describe("fallos recency order (honesty guarantee)", () => {
  it("lists every ejercicio in data/fallos.json, newest first, with none dropped", () => {
    const { fallos } = getPortalData();
    const expectedEjercicios = [
      ...new Set(fallos.records.map((record) => record.ejercicio)),
    ];

    render(<FallosIndexPage />);
    const links = screen.getAllByRole("link", { name: /^Ejercicio \d{4}$/ });
    const listedEjercicios = links.map((link) =>
      link.textContent?.replace("Ejercicio ", "").trim(),
    );

    // (a) completeness: identical set, identical count -- nothing dropped.
    expect(new Set(listedEjercicios)).toEqual(new Set(expectedEjercicios));
    expect(listedEjercicios).toHaveLength(expectedEjercicios.length);

    // (b) ordering: strictly descending by year (newest ejercicio first).
    const expectedOrder = [...expectedEjercicios].sort(
      (a, b) => Number(b) - Number(a),
    );
    expect(listedEjercicios).toEqual(expectedOrder);
    expect(listedEjercicios[0]).toBe(
      String(Math.max(...expectedEjercicios.map(Number))),
    );
  });

  it("keeps every distinct official reachable through some ejercicio -- ordering never hides an administration", () => {
    const { fallos } = getPortalData();
    const ejercicios = [
      ...new Set(fallos.records.map((record) => record.ejercicio)),
    ];
    const expectedOfficials = new Set(
      fallos.records.map((record) => record.official),
    );

    const renderedOfficials = new Set<string>();
    for (const ejercicio of ejercicios) {
      const { container } = render(
        <FalloEjercicioView ejercicio={ejercicio} />,
      );
      for (const official of expectedOfficials) {
        if (container.textContent?.includes(official)) {
          renderedOfficials.add(official);
        }
      }
    }

    expect(renderedOfficials).toEqual(expectedOfficials);
  });
});
