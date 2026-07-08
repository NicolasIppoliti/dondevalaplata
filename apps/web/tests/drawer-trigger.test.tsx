import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DrawerTrigger } from "@/components/DrawerTrigger";

/**
 * Small client-state wrapper around the `Drawer` primitive (slice 1): a
 * trigger button that opens a Drawer/Sheet holding server-rendered
 * children (tables, methodology, comparisons) -- moving "Ver todos los
 * números"-style disclosures from a zero-JS `<details>` to the shared
 * Drawer, per DESIGN.md's slice 2 direction. The button owns ONLY the
 * open/close state; everything else (table markup, text) stays whatever
 * the caller passes as children, server-rendered.
 */
describe("DrawerTrigger", () => {
  it("starts closed: the trigger button is visible, the dialog is not", () => {
    render(
      <DrawerTrigger triggerLabel="Ver todos los números" title="Todos los números">
        <p>contenido completo</p>
      </DrawerTrigger>,
    );
    expect(
      screen.getByRole("button", { name: "Ver todos los números" }),
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the drawer with its children on click", () => {
    render(
      <DrawerTrigger triggerLabel="Ver todos los números" title="Todos los números">
        <p>contenido completo</p>
      </DrawerTrigger>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Ver todos los números" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Todos los números" });
    expect(dialog).toBeTruthy();
    expect(screen.getByText("contenido completo")).toBeTruthy();
  });

  it("closes on Escape, returning focus and hiding the dialog from the a11y tree", () => {
    render(
      <DrawerTrigger triggerLabel="Ver todos los números" title="Todos los números">
        <p>contenido completo</p>
      </DrawerTrigger>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Ver todos los números" }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
