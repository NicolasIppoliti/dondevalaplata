import { describe, expect, it, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Drawer } from "@/components/Drawer";

/**
 * Reusable overlay primitive (right-drawer on desktop, bottom-sheet on
 * mobile via CSS breakpoints -- no JS branching for that part). Will host
 * full data tables + methodology in later slices; this slice ships the
 * primitive itself. Contract under test: renders children, open/close
 * state, and -- the explicit acceptance bar -- closed means genuinely out
 * of the accessibility tree (`aria-hidden`), not just visually hidden.
 */
function ControlledDrawer({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        abrir
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Todos los números"
      >
        <p>contenido del drawer</p>
        <button type="button">acción interna</button>
      </Drawer>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Drawer", () => {
  it("renders children", () => {
    render(
      <Drawer open={true} onClose={() => {}} title="Título">
        <p>hola</p>
      </Drawer>,
    );
    expect(screen.getByText("hola")).toBeTruthy();
  });

  it("closed = not in the accessibility tree (aria-hidden), even though still mounted", () => {
    render(
      <Drawer open={false} onClose={() => {}} title="Título">
        <p>oculto</p>
      </Drawer>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open = reachable via role dialog, with an accessible name from the title", () => {
    render(
      <Drawer open={true} onClose={() => {}} title="Todos los números">
        <p>visible</p>
      </Drawer>,
    );
    expect(
      screen.getByRole("dialog", { name: "Todos los números" }),
    ).toBeTruthy();
  });

  it("toggles open/close state from a controlling parent", () => {
    render(<ControlledDrawer />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "abrir" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("Escape key calls onClose", () => {
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose} title="Título">
        <p>contenido</p>
      </Drawer>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("backdrop click calls onClose", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Drawer open={true} onClose={onClose} title="Título">
        <p>contenido</p>
      </Drawer>,
    );
    const backdrop = container.querySelector("[data-drawer-backdrop]");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll while open and restores it on close", () => {
    const { rerender } = render(
      <Drawer open={true} onClose={() => {}} title="Título">
        <p>contenido</p>
      </Drawer>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    act(() => {
      rerender(
        <Drawer open={false} onClose={() => {}} title="Título">
          <p>contenido</p>
        </Drawer>,
      );
    });
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("never combines a closed-state translate utility with the open-state one on the same render (Tailwind v4 same-specificity cascade bug regression)", () => {
    // Real bug found via visual QA (slice 2): Tailwind v4 compiles
    // `translate-y-*` utilities to the native CSS `translate` property
    // (not `transform`). `translate-y-full` (unconditional base class) and
    // `translate-y-0` (conditionally appended when open) have IDENTICAL
    // specificity (both single-class selectors) -- so when BOTH are
    // present in the className string at once, the winner is decided by
    // stylesheet SOURCE ORDER, not DOM class-attribute order, and
    // `translate-y-full` won regardless of `open`. The panel's
    // `aria-hidden`/dialog-role state was correct, so jsdom-only tests
    // (which don't compute real CSS cascade) never caught this -- only a
    // real browser paint did. The fix must ensure the "closed" and "open"
    // translate utilities are mutually exclusive in the rendered class
    // list for a given `open` value, on both the mobile (translate-y-*)
    // and desktop (sm:translate-x-*) axes.
    const classTokens = (className: string) => new Set(className.split(/\s+/).filter(Boolean));

    const { rerender, container } = render(
      <Drawer open={false} onClose={() => {}} title="Título">
        <p>contenido</p>
      </Drawer>,
    );
    const panelClosed = container.querySelector('[role="dialog"]');
    const closedTokens = classTokens(panelClosed?.className ?? "");
    expect(closedTokens.has("translate-y-full")).toBe(true);
    expect(closedTokens.has("translate-y-0")).toBe(false);
    expect(closedTokens.has("sm:translate-x-full")).toBe(true);
    expect(closedTokens.has("sm:translate-x-0")).toBe(false);

    rerender(
      <Drawer open={true} onClose={() => {}} title="Título">
        <p>contenido</p>
      </Drawer>,
    );
    const panelOpen = screen.getByRole("dialog");
    const openTokens = classTokens(panelOpen.className);
    expect(openTokens.has("translate-y-0")).toBe(true);
    expect(openTokens.has("translate-y-full")).toBe(false);
    expect(openTokens.has("sm:translate-x-0")).toBe(true);
    expect(openTokens.has("sm:translate-x-full")).toBe(false);
  });

  it("traps Tab focus within the dialog while open", () => {
    render(<ControlledDrawer initialOpen={true} />);
    const dialog = screen.getByRole("dialog");
    const internalButton = screen.getByRole("button", {
      name: "acción interna",
    });
    const closeButton = screen.getByRole("button", { name: /cerrar/i });

    // Focus is moved into the dialog on open.
    expect(dialog.contains(document.activeElement)).toBe(true);

    closeButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(internalButton);

    internalButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(closeButton);
  });
});
