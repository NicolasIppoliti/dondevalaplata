import { describe, expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCountUp } from "@/lib/hooks/useCountUp";

/**
 * Motion primitive for hero figures (e.g. the home hero amount, the
 * /transparencia 81/100 score). Two safety nets are under test:
 *  (1) `prefers-reduced-motion` skips the animation entirely.
 *  (2) A setTimeout failsafe force-settles on `target` even if
 *      `requestAnimationFrame` stalls or never fires again -- the same
 *      class of bug the mock author hit with an IntersectionObserver-driven
 *      reveal (see ScrollReveal.tsx), just for a numeric count.
 */
function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

function stubRaf() {
  let nextId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    nextId += 1;
    callbacks.set(nextId, cb);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => {
    callbacks.delete(handle);
  });
  return {
    flush(now: number) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((cb) => cb(now));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("useCountUp", () => {
  it("returns the target value immediately when prefers-reduced-motion is set", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useCountUp(1750));
    expect(result.current).toBe(1750);
  });

  it("animates from 0 toward the target across frames and settles exactly on target", () => {
    stubMatchMedia(false);
    const raf = stubRaf();
    const start = 1000;
    vi.spyOn(performance, "now").mockReturnValue(start);

    const { result } = renderHook(() => useCountUp(1750, { duration: 900 }));

    act(() => {
      vi.mocked(performance.now).mockReturnValue(start + 450);
      raf.flush(start + 450);
    });
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1750);

    act(() => {
      vi.mocked(performance.now).mockReturnValue(start + 900);
      raf.flush(start + 900);
    });
    expect(result.current).toBe(1750);
  });

  it("failsafe: force-settles on target even if requestAnimationFrame never fires again", () => {
    vi.useFakeTimers();
    stubMatchMedia(false);
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const { result } = renderHook(() => useCountUp(81, { duration: 500 }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(81);
  });
});
