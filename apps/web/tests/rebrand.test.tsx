import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import Home from "@/app/page";

/**
 * Rebrand: the portal's public name is now "¿Dónde va la plata?" (full:
 * "¿Dónde va la plata? — Coronel Rosales"), replacing "Portal de
 * Transparencia [de Coronel Rosales]" everywhere the site names itself.
 */
const BRAND_SHORT = "¿Dónde va la plata?";
const BRAND_FULL = "¿Dónde va la plata? — Coronel Rosales";
const OLD_BRAND = "Portal de Transparencia";

// `apps/web` is this project's own package root, and Vitest always runs
// with that as the process cwd (see package.json's "test" script).
const APP_ROOT = process.cwd();

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, files);
    } else if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("rebrand: ¿Dónde va la plata?", () => {
  it("SiteHeader shows the new brand, opening ¿ included", () => {
    render(<SiteHeader />);
    expect(screen.getByText(BRAND_SHORT)).toBeTruthy();
  });

  it("SiteFooter mentions the new brand", () => {
    const { container } = render(<SiteFooter />);
    expect(container.textContent).toContain(BRAND_SHORT);
  });

  it("Home hero uses the new brand headline", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain(BRAND_SHORT);
  });

  it("root layout defines a title template carrying the full new brand", () => {
    const layoutSource = readFileSync(
      join(APP_ROOT, "app", "layout.tsx"),
      "utf-8",
    );
    expect(layoutSource).toContain(BRAND_FULL);
    expect(layoutSource).toMatch(/template:\s*"%s/);
  });

  it("no source file under app/ or components/ still self-references the old brand name", () => {
    const files = [
      ...collectSourceFiles(join(APP_ROOT, "app")),
      ...collectSourceFiles(join(APP_ROOT, "components")),
    ];
    const offenders = files.filter((file) =>
      readFileSync(file, "utf-8").includes(OLD_BRAND),
    );
    expect(offenders).toEqual([]);
  });
});

describe("vocabulary: 'Multas del Tribunal de Cuentas', never bare 'HTC'", () => {
  it("SiteHeader's nav no longer uses the 'Fallos HTC' abbreviation", () => {
    render(<SiteHeader />);
    expect(
      screen.getByRole("link", { name: "Multas del Tribunal de Cuentas" }),
    ).toBeTruthy();
    expect(screen.queryByText(/\bHTC\b/)).toBeNull();
  });
});

describe("Home — mobile-first fold + tappable rows", () => {
  it("shows a one-line subhead explaining what the site is, without needing to scroll", () => {
    render(<Home />);
    expect(
      screen.getByText(
        "Portal vecinal independiente que sigue la plata pública de Coronel Rosales.",
      ),
    ).toBeTruthy();
  });

  it("makes the whole question row (not just a small cta) the link into each section", () => {
    render(<Home />);
    const link = screen.getByRole("link", { name: /¿Cuánto llegó este mes\?/ });
    expect(link.tagName).toBe("A");
    expect(link).toHaveProperty(
      "href",
      expect.stringContaining("/coparticipacion"),
    );
    // The Fraunces question heading lives INSIDE the link (whole row is
    // tappable), not next to a separate "ver →" link.
    expect(link.querySelector("h2")?.textContent).toContain(
      "¿Cuánto llegó este mes?",
    );
  });

  it("offers at least one tappable index chip right under the hero number (peeks above the fold)", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: "Plata que entra" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Multas" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Fuentes" })).toBeTruthy();
  });

  it("explains the hero number in plain language directly below it", () => {
    render(<Home />);
    expect(
      screen.getByText(
        "La coparticipación es la plata que la Provincia le gira al municipio todos los meses.",
      ),
    ).toBeTruthy();
  });

  it("phrases the month-over-month badge in plain language (not jargon like 'real vs.')", () => {
    render(<Home />);
    expect(screen.getByText(/ya descontada la inflación/)).toBeTruthy();
    expect(screen.queryByText(/real vs\./)).toBeNull();
  });
});
