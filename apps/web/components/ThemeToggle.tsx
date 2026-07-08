"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ddvlp-theme";
type Theme = "light" | "dark";

// A tiny external store instead of `useState` + `useEffect`: reading
// localStorage (a browser-only API) can't safely happen during the first
// client render without risking a hydration mismatch against the
// server-rendered "light" default, and syncing it via a plain effect that
// calls `setState` synchronously trips `react-hooks/set-state-in-effect`
// for good reason (it's exactly the double-render-on-mount pattern that
// rule flags). `useSyncExternalStore` is the React-native fix: it takes a
// `getServerSnapshot` for the hydration pass and a live `getSnapshot` for
// after, with no effect involved at all.
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): Theme {
  return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(next: Theme) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable (private mode, quota). data-theme is
    // still applied for the current page load.
  }
  // `storage` only fires in OTHER tabs on write -- notify this tab's own
  // subscribers directly (also re-dispatches `storage` so a real
  // cross-tab listener stays in sync for free).
  notify();
  window.dispatchEvent(new Event("storage"));
}

/**
 * Optional, localStorage-persisted dark toggle. Light stays the DEFAULT
 * (see app/layout.tsx's inline anti-flash script, which reads the same
 * key before first paint so there's never a light->dark flash on repeat
 * visits) -- the OS `prefers-color-scheme` is intentionally NOT read here,
 * so a visitor's browser/OS setting can never silently flip the paper
 * palette without an explicit in-page choice.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";

  const toggle = useCallback(() => {
    applyTheme(isDark ? "light" : "dark");
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-md border border-rule bg-surface text-ink transition-colors hover:bg-surface-2"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
