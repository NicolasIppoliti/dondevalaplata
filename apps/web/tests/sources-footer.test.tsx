import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SourcesFooter } from "@/components/SourcesFooter";
import type { SourceLink } from "@/lib/sources";

const links: SourceLink[] = [
  {
    id: "ipc/nivel-general-nacional",
    source: "apis.datos.gob.ar",
    sourceUrl: "https://apis.datos.gob.ar/series/api/series/?ids=148.3",
    archivedUrl: "https://pub-example.r2.dev/ipc/ipc-nivel-general-nacional.json",
    sha256: "6cb6b6dceb54c2ad97a4d9252888a1089c910308c56fb3fbe3556321c04609cf",
    fetchedAt: "2026-07-07T02:09:31Z",
  },
];

describe("SourcesFooter", () => {
  it("renders both the original and archived link, plus a shortened sha256", () => {
    render(<SourcesFooter links={links} note="Nota de rezago de ejemplo." />);
    const original = screen.getByRole("link", { name: /fuente original/i });
    expect(original).toHaveProperty(
      "href",
      "https://apis.datos.gob.ar/series/api/series/?ids=148.3",
    );
    const archived = screen.getByRole("link", { name: /copia archivada/i });
    expect(archived).toHaveProperty(
      "href",
      "https://pub-example.r2.dev/ipc/ipc-nivel-general-nacional.json",
    );
    expect(screen.getByText(/6cb6b6dceb5…/)).toBeTruthy();
    expect(screen.getByText("Nota de rezago de ejemplo.")).toBeTruthy();
  });

  it("still shows a dead official URL rather than hiding it when archivedUrl is missing", () => {
    render(
      <SourcesFooter
        links={[{ ...links[0], archivedUrl: null }]}
      />,
    );
    expect(screen.getByRole("link", { name: /fuente original/i })).toBeTruthy();
    expect(screen.getByText(/copia archivada no disponible/i)).toBeTruthy();
  });
});
