import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ShareButton } from "@/components/ShareButton";

const URL = "https://dondevalaplata.fragua.dev/compartir/deuda";
const TITLE = "El municipio no actualiza su deuda hace 281 días";
const TEXT = `${TITLE} — dondevalaplata.fragua.dev`;

describe("ShareButton (feature H3b)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    // @ts-expect-error test cleanup: navigator.share is not always defined
    delete navigator.share;
  });

  it("renders a labeled, keyboard-operable button (never icon-only)", () => {
    render(<ShareButton url={URL} title={TITLE} text={TEXT} />);
    const button = screen.getByRole("button", { name: /compartir/i });
    expect(button.tagName).toBe("BUTTON");
  });

  it("calls navigator.share with the title/text/url when the Web Share API is available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share: shareMock });

    render(<ShareButton url={URL} title={TITLE} text={TEXT} />);
    fireEvent.click(screen.getByRole("button", { name: /compartir/i }));

    await vi.waitFor(() => expect(shareMock).toHaveBeenCalledOnce());
    expect(shareMock).toHaveBeenCalledWith({ title: TITLE, text: TEXT, url: URL });
  });

  it("falls back to a WhatsApp link + copy-link menu when the Web Share API is unavailable", () => {
    render(<ShareButton url={URL} title={TITLE} text={TEXT} />);
    fireEvent.click(screen.getByRole("button", { name: /compartir/i }));

    const whatsappLink = screen.getByRole("link", { name: /whatsapp/i });
    expect(whatsappLink.getAttribute("href")).toContain("wa.me");
    expect(whatsappLink.getAttribute("href")).toContain(
      encodeURIComponent(URL),
    );
    expect(
      screen.getByRole("button", { name: /copiar enlace/i }),
    ).toBeTruthy();
  });

  it("copies the URL to the clipboard when 'Copiar enlace' is clicked", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<ShareButton url={URL} title={TITLE} text={TEXT} />);
    fireEvent.click(screen.getByRole("button", { name: /compartir/i }));
    fireEvent.click(screen.getByRole("button", { name: /copiar enlace/i }));

    await screen.findByText(/enlace copiado/i);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(URL);
  });

  it("exposes aria-expanded on the trigger so screen readers know the fallback menu state", () => {
    render(<ShareButton url={URL} title={TITLE} text={TEXT} />);
    const button = screen.getByRole("button", { name: /compartir/i });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });
});
