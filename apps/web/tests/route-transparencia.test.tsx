import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Page from "@/app/transparencia/page";
import { getPortalData } from "@/lib/sources";

/**
 * /transparencia — "¿Qué tan transparente es el municipio?" (Índice de
 * Transparencia Fiscal Municipal, ASAP). Covers: correct attribution
 * (civil association, NOT a ministry; fiscal not integral scope), the
 * honesty invariant reflected in the UI (qué-hace-bien + qué-falta
 * dimensions sum to the total, each shown got <= max), the verified
 * 70->81 trend, dual-link provenance, and the "100 != integral
 * transparency" disclosure.
 */
describe("/transparencia page", () => {
  it("titles the section as a question, in the display heading level", () => {
    render(<Page />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain(
      "¿Qué tan transparente es el municipio?",
    );
  });

  it("shows the headline score and its category", () => {
    render(<Page />);
    expect(screen.getByText("81 / 100")).toBeTruthy();
    expect(screen.getByText("Alto cumplimiento")).toBeTruthy();
  });

  it("attributes the index to ASAP, explicit that it is a civil association, not a ministry", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/ASAP/);
    expect(text.toLowerCase()).toMatch(/asociaci[oó]n civil/);
    expect(text.toLowerCase()).toMatch(/no (es |)un ministerio/);
    expect(text.toLowerCase()).not.toContain("capital humano");
  });

  it("discloses the scope is FISCAL transparency, not integral", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/transparencia fiscal/);
    expect(text).toMatch(/no (es |)(transparencia )?integral/);
  });

  it("names the report explicitly (Informe de Mayo 2026)", () => {
    render(<Page />);
    expect(screen.getAllByText(/informe de mayo 2026/i).length).toBeGreaterThan(0);
  });

  it("states the verified trend sentence: 70 (nov 2025) to 81 (may 2026)", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/70/);
    expect(text).toMatch(/81/);
    expect(text.toLowerCase()).toMatch(/noviembre.*2025/);
    expect(text.toLowerCase()).toMatch(/mayo.*2026/);
  });

  it("colors the trend as a real arithmetic increase (+11), not a person/party judgment", () => {
    render(<Page />);
    expect(screen.getByText(/\+11/)).toBeTruthy();
  });

  it("lists exactly the 3 full-mark dimensions under 'qué hace bien'", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: /qu[eé] hace bien/i });
    const scoped = within(section);
    expect(scoped.getByText(/Acceso web f[aá]cil a la informaci[oó]n/)).toBeTruthy();
    expect(scoped.getByText(/Presupuesto vigente publicado/)).toBeTruthy();
    expect(
      scoped.getByText(/Situaci[oó]n econ[oó]mico-financiera \(SEF\) trimestral/),
    ).toBeTruthy();
    expect(scoped.getAllByText(/5\s*\/\s*5|30\s*\/\s*30|35\s*\/\s*35/).length).toBe(3);
  });

  it("lists exactly the 3 gap dimensions under 'qué falta', with got/max shown", () => {
    render(<Page />);
    const section = screen.getByRole("region", { name: /qu[eé] falta/i });
    const scoped = within(section);
    expect(scoped.getByText(/Ejecuci[oó]n presupuestaria trimestral/)).toBeTruthy();
    expect(scoped.getByText(/Gastos por finalidad y funci[oó]n/)).toBeTruthy();
    expect(
      scoped.getByText(/Stock de deuda y perfil de vencimientos/),
    ).toBeTruthy();
    expect(scoped.getAllByText(/5\s*\/\s*10|3\s*\/\s*10/).length).toBe(3);
  });

  it("frames the gap section neutrally, never blaming a person or party", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    // No official/party name anywhere on this page.
    expect(text).not.toMatch(/intendente|concejal|partido|gesti[oó]n de/i);
  });

  it("HONESTY CHECK reflected in the UI: qué-hace-bien + qué-falta dimensions sum to the published total", () => {
    const { transparencia } = getPortalData();
    render(<Page />);
    const sum = transparencia.dimensions.reduce((acc, d) => acc + d.got, 0);
    expect(sum).toBe(transparencia.total);
    for (const dimension of transparencia.dimensions) {
      expect(dimension.got).toBeLessThanOrEqual(dimension.max);
    }
  });

  it("discloses that a 100 here means full FISCAL transparency, not integral transparency", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/100[\s\S]{0,80}(fiscal|integral)/);
    expect(text).toMatch(/compras|salarios|declaraciones juradas|actas|datos abiertos/);
  });

  it("renders dual-link provenance (original + archived) for both archived ASAP reports", () => {
    render(<Page />);
    const originalLinks = screen.getAllByRole("link", {
      name: /fuente original/i,
    });
    expect(originalLinks).toHaveLength(2);
    const archivedLinks = screen.getAllByRole("link", {
      name: /copia archivada/i,
    });
    expect(archivedLinks).toHaveLength(2);
  });

  it("links to the ASAP index page (stable anchor across municipios)", () => {
    render(<Page />);
    const link = screen.getByRole("link", { name: /[ií]ndice.*municipios/i });
    expect(link.getAttribute("href")).toContain(
      "asap.org.ar/informes-detalle/cumplimiento-municipios/8",
    );
  });

  it("shows a short sha256 for the primary (Mayo 2026) report", () => {
    const { container } = render(<Page />);
    expect(container.textContent).toMatch(/sha256\s+689df97fe6f/);
  });
});
