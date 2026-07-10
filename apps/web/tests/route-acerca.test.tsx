import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/acerca/page";

describe("/acerca page", () => {
  it("includes an explicit neutrality statement", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { name: /neutralidad/i }),
    ).toBeTruthy();
  });

  it("includes a Ley 25.326 (personal data) note", () => {
    render(<Page />);
    expect(screen.getAllByText(/ley\s*25\.326/i).length).toBeGreaterThan(0);
  });

  it("attributes the portal to Fragua as an independent civic project, honestly (not anonymous, not partisan)", () => {
    render(<Page />);
    expect(screen.getAllByText(/fragua/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/proyecto c[ií]vico independiente/i),
    ).toBeTruthy();
    expect(screen.getAllByText(/sin fines partidarios/i).length).toBeGreaterThan(0);
  });
});
