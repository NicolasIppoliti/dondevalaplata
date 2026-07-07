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
});
