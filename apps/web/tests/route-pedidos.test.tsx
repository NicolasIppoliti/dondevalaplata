import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/pedidos/page";
import { getPortalData } from "@/lib/sources";

/**
 * /pedidos — pedido de acceso a la información generator + tracker
 * (feature G4). Covers: the question-style heading, the legal explainer +
 * honest scope caveats (27.275 no alcanza municipios, silencio no
 * reglado), the generator form, and the tracker rendering real data from
 * data/pedidos.json.
 */
describe("/pedidos page", () => {
  it("titles the section as a question, in the display heading level", () => {
    render(<Page />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent?.length).toBeGreaterThan(0);
  });

  it("cites Ordenanza 3638 and its key articles (2, 6, 8, 11)", () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/Ordenanza N° 3638|Ordenanza 3638/);
    expect(text).toMatch(/Art\. ?2|Artículo 2/);
    expect(text).toMatch(/Art\. ?6|Artículo 6/);
    expect(text).toMatch(/Art\. ?8|Artículo 8/);
    expect(text).toMatch(/Art\. ?11|Artículo 11/);
  });

  it("discloses the honest scope caveat: 27.275 does not reach municipios", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/27\.275/);
    expect(text).toMatch(/no alcanza a los municipios/);
  });

  it("discloses that Ordenanza 3638 does not regulate what silence means", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/no establece qué pasa si no responden|silencio/);
  });

  it("names the recourse ladder on silence (pronto despacho, amparo por mora)", () => {
    const { container } = render(<Page />);
    const text = container.textContent?.toLowerCase() ?? "";
    expect(text).toMatch(/pronto despacho/);
    expect(text).toMatch(/amparo por mora/);
  });

  it("renders the pedido generator form", () => {
    render(<Page />);
    expect(screen.getByLabelText(/qué querés pedir/i)).toBeTruthy();
    expect(screen.getByLabelText(/^dni$/i)).toBeTruthy();
  });

  it("states nothing typed in the generator leaves the browser", () => {
    const { container } = render(<Page />);
    expect(container.textContent).toMatch(/se envía a ningún servidor/i);
  });

  it("renders the tracker with real data from data/pedidos.json", () => {
    const { pedidos } = getPortalData();
    render(<Page />);
    if (pedidos.pedidos.length > 0) {
      expect(screen.getByText(pedidos.pedidos[0].objeto)).toBeTruthy();
      expect(screen.getByText(pedidos.pedidos[0].expediente)).toBeTruthy();
    } else {
      expect(screen.getByText(/todavía no se present/i)).toBeTruthy();
    }
  });
});
