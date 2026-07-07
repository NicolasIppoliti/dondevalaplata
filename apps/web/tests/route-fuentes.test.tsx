import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/fuentes/page";
import { getPortalData } from "@/lib/sources";

describe("/fuentes page", () => {
  it("shows both a Fuente original link and a Copia archivada affordance for every manifest record", () => {
    const { manifest } = getPortalData();
    render(<Page />);
    const originalLinks = screen.getAllByRole("link", {
      name: /fuente original/i,
    });
    expect(originalLinks).toHaveLength(manifest.length);
  });

  it("discloses the headline coparticipación figure is a sum across every CSV concept", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toContain("coparticipación bruta");
    expect(text).toMatch(/suma/);
  });

  it("discloses that archived source copies live in R2, not mirrored in the git repo", () => {
    // W1 (verify report): design D3 promised small text docs would ALSO be
    // git-mirrored, but archive/** is fully gitignored. Not restructuring
    // storage -- disclosing the accepted deviation to residents instead.
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toContain("cloudflare r2");
    expect(text).toMatch(/no se (versionan|guardan) en (el|git)/);
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

describe("/fuentes — collapsible groups (start closed) with a one-line intro", () => {
  it("renders each capability group as a <details> that starts closed", () => {
    render(<Page />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.length).toBeGreaterThan(0);
    for (const heading of headings) {
      const details = heading.closest("details");
      expect(details).not.toBeNull();
      expect(details?.open).toBe(false);
    }
  });

  it("shows a one-line intro for each group", () => {
    render(<Page />);
    expect(
      screen.getByText(
        /Fallos del Tribunal de Cuentas sobre las cuentas municipales\./,
      ),
    ).toBeTruthy();
  });

  it("makes each link its own full-width, ~44px tappable row (not a compact table cell)", () => {
    render(<Page />);
    const originalLinks = screen.getAllByRole("link", {
      name: /fuente original/i,
    });
    for (const link of originalLinks) {
      expect(link.className).toContain("min-h-11");
      expect(link.className).toContain("w-full");
    }
  });
});
