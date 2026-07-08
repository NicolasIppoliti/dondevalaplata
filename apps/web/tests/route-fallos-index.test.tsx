import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import FallosIndexPage from "@/app/fallos/page";
import { getPortalData } from "@/lib/sources";

/**
 * /fallos index (slice 3 restyle): each ejercicio becomes a modern-skin
 * card (elevated, modest radius) whose ONLY link text is "Ejercicio {year}"
 * -- unchanged from before, so `fallos-recency-order.test.tsx`'s exact
 * `/^Ejercicio \d{4}$/` accessible-name regex keeps passing -- with a
 * sibling (non-link) line stating how many fallos exist for that
 * ejercicio, computed from the real data, never hardcoded.
 */
describe("/fallos index — card restyle (slice 3)", () => {
  it("shows a fallo count for every ejercicio card, matching the real data", () => {
    const { fallos } = getPortalData();
    render(<FallosIndexPage />);

    for (const ejercicio of new Set(
      fallos.records.map((record) => record.ejercicio),
    )) {
      const count = fallos.records.filter(
        (record) => record.ejercicio === ejercicio,
      ).length;
      const link = screen.getByRole("link", {
        name: `Ejercicio ${ejercicio}`,
      });
      const card = link.closest("li");
      expect(card).not.toBeNull();
      const expectedWord = count === 1 ? "multa" : "multas";
      expect(within(card as HTMLElement).getByText(new RegExp(`${count}\\s+${expectedWord}`, "i"))).toBeTruthy();
    }
  });

  it("keeps the link's accessible name exactly 'Ejercicio {year}' (count line lives outside the link)", () => {
    render(<FallosIndexPage />);
    const link = screen.getByRole("link", { name: "Ejercicio 2024" });
    expect(link.textContent?.trim()).toBe("Ejercicio 2024");
  });
});
