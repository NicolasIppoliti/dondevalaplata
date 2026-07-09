import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import Home from "@/app/page";
import { formatPeriodEsAr } from "@/lib/format";
import { getPortalData } from "@/lib/sources";

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
  it("SiteHeader itself never uses the bare 'HTC' abbreviation anywhere in its own markup", () => {
    render(<SiteHeader />);
    expect(screen.queryByText(/\bHTC\b/)).toBeNull();
  });
});

/**
 * IA consolidation ("4 puertas"): SiteHeader's primary nav is now exactly
 * 4 "doors" -- Coparticipación, Gastos, Transparencia, Pedidos -- down from
 * 9 items. Adjudicaciones/Multas del Tribunal de Cuentas fold into the
 * Gastos/Transparencia doors respectively (their own pages stay reachable
 * as tabs, see `tests/section-tabs.test.tsx` + the route tests for those
 * pages), and Novedades folds into Transparencia the same way. Fuentes and
 * Acerca de move out of the primary nav entirely, into the footer (see the
 * "SiteFooter — Fuentes/Acerca de links" describe block below).
 */
describe("SiteHeader — consolidated 4-door nav", () => {
  it("renders exactly the 4 primary doors, nothing else", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: /navegaci[oó]n principal/i });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Coparticipación",
      "Gastos",
      "Transparencia",
      "Pedidos",
    ]);
  });

  it("no longer exposes Adjudicaciones, Multas del Tribunal de Cuentas, Novedades, Fuentes or Acerca de as their own primary nav items", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: /navegaci[oó]n principal/i });
    expect(within(nav).queryByRole("link", { name: /^adjudicaciones$/i })).toBeNull();
    expect(
      within(nav).queryByRole("link", { name: /multas del tribunal/i }),
    ).toBeNull();
    expect(within(nav).queryByRole("link", { name: /^novedades$/i })).toBeNull();
    expect(within(nav).queryByRole("link", { name: /^fuentes$/i })).toBeNull();
    expect(within(nav).queryByRole("link", { name: /^acerca de$/i })).toBeNull();
  });
});

describe("SiteHeader — active nav item", () => {
  it("marks the matching nav item aria-current='page' when activeHref matches", () => {
    render(<SiteHeader activeHref="/coparticipacion" />);
    const active = screen.getByRole("link", { name: "Coparticipación" });
    expect(active.getAttribute("aria-current")).toBe("page");
    const inactive = screen.getByRole("link", { name: "Pedidos" });
    expect(inactive.getAttribute("aria-current")).toBeNull();
  });

  it("links to /gastos (feature G2, gasto por partida explorer)", () => {
    render(<SiteHeader activeHref="/gastos" />);
    const gastos = screen.getByRole("link", { name: /gastos/i });
    expect(gastos.getAttribute("href")).toBe("/gastos");
    expect(gastos.getAttribute("aria-current")).toBe("page");
  });

  it("marks 'Gastos' active when activeHref is /adjudicaciones (adjudicaciones is now a Gastos tab, not its own door)", () => {
    render(<SiteHeader activeHref="/adjudicaciones" />);
    expect(
      screen.getByRole("link", { name: "Gastos" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks 'Transparencia' active when activeHref is /novedades (novedades is now a Transparencia tab, not its own door)", () => {
    render(<SiteHeader activeHref="/novedades" />);
    expect(
      screen.getByRole("link", { name: "Transparencia" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks 'Transparencia' active when activeHref is /fallos (fallos is now a Transparencia tab, not its own door)", () => {
    render(<SiteHeader activeHref="/fallos" />);
    expect(
      screen.getByRole("link", { name: "Transparencia" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks no nav item active when activeHref is null (default, e.g. home)", () => {
    render(<SiteHeader />);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.getAttribute("aria-current")).toBeNull();
    }
  });
});

describe("SiteHeader — brand identity (fidelity slice F1, Mockup A)", () => {
  it("shows the square '$' logo badge before the wordmark", () => {
    render(<SiteHeader />);
    expect(screen.getByText("$")).toBeTruthy();
  });

  it("shows the 'Coronel Rosales · Punta Alta' subtitle under the wordmark", () => {
    render(<SiteHeader />);
    expect(screen.getByText("Coronel Rosales · Punta Alta")).toBeTruthy();
  });
});

describe("Home — two-column hero (fidelity slice F1, Mockup A)", () => {
  it("shows the eyebrow + Fraunces headline with 'plata pública' in stamp red, without needing to scroll", () => {
    render(<Home />);
    expect(screen.getByText("Portal vecinal independiente")).toBeTruthy();
    const headline = screen.getByRole("heading", {
      level: 2,
      name: "Seguimos la plata pública de Coronel Rosales.",
    });
    expect(headline).toBeTruthy();
    expect(within(headline).getByText("plata pública").tagName).toBe("SPAN");
  });

  it("shows the supporting line explaining the site's sourcing/neutrality promise", () => {
    render(<Home />);
    const paragraphs = screen.getAllByText(
      (_content, node) =>
        node?.tagName === "P" &&
        (node.textContent ?? "").includes(
          "Cada cifra enlaza su fuente oficial, una copia archivada y su huella",
        ) &&
        (node.textContent ?? "").includes(
          "No opinamos sobre ninguna gestión: mostramos los números que se pueden chequear.",
        ),
    );
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it("offers the two hero CTAs: primary 'Ver la coparticipación' + outline 'Cómo verificamos'", () => {
    render(<Home />);
    const primary = screen.getByRole("link", {
      name: "Ver la coparticipación",
    });
    expect(primary).toHaveProperty(
      "href",
      expect.stringContaining("/coparticipacion"),
    );
    const secondary = screen.getByRole("link", { name: "Cómo verificamos" });
    expect(secondary).toHaveProperty(
      "href",
      expect.stringContaining("/fuentes"),
    );
  });

  it("shows the dashed freshness pill stating the data-lag caveat", () => {
    render(<Home />);
    expect(
      screen.getByText(/la Provincia publica con 2 a 3 meses de rezago/),
    ).toBeTruthy();
  });

  it("keeps the 'fuentes' row as one whole tappable link (not just a small cta)", () => {
    // Fidelity slice F2: the OTHER three question rows became real
    // dashboard cards (chart, fallos grid, gauge) with a separate "ver
    // todo →" link -- see "Home — dashboard landing (fidelity slice F2)"
    // below -- but "¿De dónde salen los datos?" stays a simple, single
    // link row (task scope explicitly keeps it as a plain row/link).
    render(<Home />);
    const link = screen.getByRole("link", {
      name: /¿De dónde salen los datos\?/,
    });
    expect(link.tagName).toBe("A");
    expect(link).toHaveProperty("href", expect.stringContaining("/fuentes"));
    // The Fraunces question heading lives INSIDE the link (whole row is
    // tappable), not next to a separate "ver →" link.
    expect(link.querySelector("h2")?.textContent).toContain(
      "¿De dónde salen los datos?",
    );
  });

  it("declares the constant-pesos base month next to the headline figure (DESIGN.md 'toda cifra ajustada declara...')", () => {
    const { coparticipacion } = getPortalData();
    const baseMonthLabel = formatPeriodEsAr(coparticipacion.baseMonth);
    render(<Home />);
    expect(
      screen.getByText(`en pesos constantes de ${baseMonthLabel} (IPC INDEC)`),
    ).toBeTruthy();
  });

  it("phrases the month-over-month delta chip the way Mockup A does ('real vs. <mes>')", () => {
    render(<Home />);
    expect(screen.getByText(/real vs\./)).toBeTruthy();
  });
});
