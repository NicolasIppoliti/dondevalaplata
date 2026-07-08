import { describe, expect, it, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ScrollReveal } from "@/components/ScrollReveal";

/**
 * Lightweight scroll-reveal. The mockup author hit a real bug where an
 * IntersectionObserver-driven reveal could leave content permanently
 * hidden (observer misfires / never triggers). These tests pin down the
 * three failsafes: (1) content always renders regardless of JS/observer
 * support, (2) `prefers-reduced-motion` skips the hide-then-reveal dance
 * entirely, (3) a timeout force-reveals even if the observer never fires.
 */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches, media: "" }));
}

// jsdom itself doesn't implement requestAnimationFrame; ScrollReveal uses
// it purely as a "next tick" activator (see its own comment), so a
// synchronous polyfill is a faithful enough stand-in for these tests.
function stubRaf() {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  FakeIntersectionObserver.instances = [];
});

describe("ScrollReveal", () => {
  it("always renders children -- content is never removed from the DOM", () => {
    render(<ScrollReveal>Contenido siempre presente</ScrollReveal>);
    expect(screen.getByText("Contenido siempre presente")).toBeTruthy();
  });

  it("stays visible (never arms) when IntersectionObserver is unavailable, e.g. jsdom itself", () => {
    render(<ScrollReveal>Sin observer</ScrollReveal>);
    expect(screen.getByText("Sin observer").dataset.reveal).toBe("visible");
  });

  it("stays visible when prefers-reduced-motion is set, even with an observer available", () => {
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    stubMatchMedia(true);
    render(<ScrollReveal>Reduced motion</ScrollReveal>);
    expect(screen.getByText("Reduced motion").dataset.reveal).toBe("visible");
  });

  it("arms then reveals once the observer reports the element intersecting", () => {
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    stubMatchMedia(false);
    stubRaf();
    render(<ScrollReveal>Con observer</ScrollReveal>);
    const node = screen.getByText("Con observer");
    expect(node.dataset.reveal).toBe("armed");

    act(() => {
      FakeIntersectionObserver.instances[0]?.trigger(true);
    });
    expect(node.dataset.reveal).toBe("revealed");
  });

  it("failsafe: reveals even if the observer never fires", () => {
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    stubMatchMedia(false);
    stubRaf();
    render(<ScrollReveal>Failsafe</ScrollReveal>);
    const node = screen.getByText("Failsafe");
    expect(node.dataset.reveal).toBe("armed");

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(node.dataset.reveal).toBe("revealed");
  });
});
