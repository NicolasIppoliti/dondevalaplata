import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/fuentes/page";
import { getPortalData } from "@/lib/sources";

describe("/fuentes page", () => {
  it("shows both a Fuente original link and a Copia archivada affordance for every manifest record", () => {
    const { manifest } = getPortalData();
    render(<Page />);
    const originalLinks = screen.getAllByRole("link", { name: /fuente original/i });
    expect(originalLinks).toHaveLength(manifest.length);
  });

  it("groups records by capability with a heading per group, including archive-only families", () => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { name: /coparticipaci[oó]n/i }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /fallos/i })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /boletines oficiales/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /gobierno abierto/i }),
    ).toBeTruthy();
  });
});
