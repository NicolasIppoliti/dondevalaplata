"use client";

import { useEffect, useRef, useState } from "react";
import { useId } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable overlay primitive: right-slide-in drawer on desktop, bottom
 * sheet on mobile -- purely via CSS breakpoints (`sm:`), no JS viewport
 * branching. Will host full data tables + methodology in later slices;
 * this slice ships the primitive itself.
 *
 * Accessibility contract:
 * - `role="dialog"` + `aria-modal` + `aria-labelledby` pointing at the
 *   title.
 * - Closed = `aria-hidden="true"` (+ `inert`) on both the backdrop and the
 *   panel -- genuinely out of the accessibility tree, not just visually
 *   hidden, even though both stay mounted (so the exit transition can
 *   still play).
 * - Real focus trap: Tab/Shift+Tab manually cycle through the panel's
 *   focusable elements (rather than relying on the browser's native tab
 *   order + boundary interception, which is both more fragile across
 *   browsers and untestable under jsdom, which does not implement native
 *   Tab-key focus movement).
 * - Escape closes; backdrop click closes; body scroll locks while open and
 *   restores on close; focus moves into the panel on open and returns to
 *   the previously focused element on close.
 * - Drag-down-to-dismiss on mobile via the grip handle (pointer events).
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragState = useRef<{ dragging: boolean; startY: number }>({
    dragging: false,
    startY: 0,
  });

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Focus management: move focus in on open, trap Tab, restore on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function getFocusable(): HTMLElement[] {
      const panel = panelRef.current;
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      event.preventDefault();
      const currentIndex = focusable.indexOf(
        document.activeElement as HTMLElement,
      );
      const delta = event.shiftKey ? -1 : 1;
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + delta + focusable.length) % focusable.length;
      focusable[nextIndex]?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragState.current = { dragging: true, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current.dragging) return;
    const delta = Math.max(0, event.clientY - dragState.current.startY);
    setDragOffset(delta);
  }

  function handlePointerUp() {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    if (dragOffset > 120) {
      onClose();
    }
    setDragOffset(0);
  }

  return (
    <>
      <div
        data-drawer-backdrop
        aria-hidden={!open}
        inert={!open}
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-ink/45 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
        style={
          dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined
        }
        className={`fixed z-[61] flex max-h-[88dvh] flex-col rounded-t-2xl bg-surface text-ink shadow-card transition-transform duration-300 ease-out inset-x-0 bottom-0 translate-y-full sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-[min(560px,94vw)] sm:translate-x-full sm:translate-y-0 sm:rounded-none sm:rounded-l-2xl ${
          open ? "translate-y-0 sm:translate-x-0" : ""
        } ${className ?? ""}`}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex cursor-grab justify-center py-2 sm:hidden"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-rule" />
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-rule px-5 pt-1 pb-4">
          <div>
            <h2
              id={titleId}
              className="font-display text-xl font-semibold text-ink"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 font-mono text-xs text-muted"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-md border border-rule bg-surface text-ink hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 pt-4 pb-8">{children}</div>
      </div>
    </>
  );
}
