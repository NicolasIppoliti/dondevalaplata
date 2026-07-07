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
