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

/**
 * Feature H4 (shareable PNG images): "hand over the image, site optional".
 * Per-fact WhatsApp (square) and historia (vertical) PNG URLs are passed in
 * via the `images` prop (built by the caller from `lib/shareImage.ts`) --
 * `ShareButton` never needs to know about `ShareFact` internals.
 */
const IMAGES = {
  whatsapp: {
    url: "https://dondevalaplata.fragua.dev/compartir/deuda/whatsapp",
    filename: "ddvlp-deuda-whatsapp.png",
  },
  historia: {
    url: "https://dondevalaplata.fragua.dev/compartir/deuda/historia",
    filename: "ddvlp-deuda-historia.png",
  },
};

function stubFetchBlob() {
  const blob = new Blob(["fake-png-bytes"], { type: "image/png" });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ blob: () => Promise.resolve(blob) }),
  );
}

describe("ShareButton image actions (feature H4)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    // @ts-expect-error test cleanup: not always defined
    delete navigator.share;
    // @ts-expect-error test cleanup: not always defined
    delete navigator.canShare;
  });

  it("renders no image actions when the `images` prop is omitted (backward compatible)", () => {
    render(<ShareButton url={URL} title={TITLE} text={TEXT} />);
    expect(screen.queryByText(/imagen para whatsapp/i)).toBeNull();
    expect(screen.queryByText(/imagen para historia/i)).toBeNull();
  });

  it("renders labeled download links for both image formats, each pointing at its real PNG URL", () => {
    render(
      <ShareButton url={URL} title={TITLE} text={TEXT} images={IMAGES} />,
    );
    const whatsappLink = screen.getByRole("link", {
      name: /imagen para whatsapp/i,
    });
    expect(whatsappLink.getAttribute("href")).toBe(IMAGES.whatsapp.url);
    expect(whatsappLink.getAttribute("download")).toBe(
      IMAGES.whatsapp.filename,
    );

    const historiaLink = screen.getByRole("link", {
      name: /imagen para historia de instagram/i,
    });
    expect(historiaLink.getAttribute("href")).toBe(IMAGES.historia.url);
    expect(historiaLink.getAttribute("download")).toBe(
      IMAGES.historia.filename,
    );
  });

  it("states honestly that Instagram stories have no auto-post API -- the visitor posts the downloaded image themselves", () => {
    render(
      <ShareButton url={URL} title={TITLE} text={TEXT} images={IMAGES} />,
    );
    expect(
      screen.getByText(/no (hay|existe) (una )?forma de publicarla/i),
    ).toBeTruthy();
  });

  it("shares the fetched PNG as a File via the Web Share API when the browser supports file sharing (canShare returns true)", async () => {
    stubFetchBlob();
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);
    Object.assign(navigator, { share: shareMock, canShare: canShareMock });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(
      <ShareButton url={URL} title={TITLE} text={TEXT} images={IMAGES} />,
    );
    fireEvent.click(
      screen.getByRole("link", { name: /imagen para whatsapp/i }),
    );

    await vi.waitFor(() => expect(shareMock).toHaveBeenCalledOnce());
    const sharePayload = shareMock.mock.calls[0][0];
    expect(sharePayload.files).toHaveLength(1);
    expect(sharePayload.files[0].name).toBe(IMAGES.whatsapp.filename);
    expect(sharePayload.text).toBe(TEXT);
    expect(sharePayload.url).toBe(URL);
    // No manual fallback download was triggered -- the native share sheet
    // handled it.
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("falls back to a real file download when the browser can't share files (canShare returns false)", async () => {
    stubFetchBlob();
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(false);
    Object.assign(navigator, { share: shareMock, canShare: canShareMock });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(
      <ShareButton url={URL} title={TITLE} text={TEXT} images={IMAGES} />,
    );
    fireEvent.click(
      screen.getByRole("link", { name: /imagen para historia de instagram/i }),
    );

    await vi.waitFor(() => expect(clickSpy).toHaveBeenCalledOnce());
    expect(shareMock).not.toHaveBeenCalled();
  });
});
