"use client";

import { useState } from "react";
import { Drawer } from "@/components/Drawer";

/**
 * Small client-state wrapper around the `Drawer` primitive (slice 1): a
 * trigger button that owns ONLY open/close state. Everything the drawer
 * displays (tables, methodology, comparisons) is passed in as `children`
 * -- typically server-rendered markup from the caller's Server Component
 * page -- so moving a disclosure from the old zero-JS `<details>` pattern
 * to this Drawer adds only this thin state shell to the client bundle,
 * not the content itself.
 */
export function DrawerTrigger({
  triggerLabel,
  title,
  description,
  children,
  triggerClassName,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={
          triggerClassName ??
          "inline-flex min-h-11 items-center gap-2 border-2 border-ink px-4 font-mono text-sm text-ink hover:bg-ink hover:text-surface"
        }
      >
        {triggerLabel}
        <span aria-hidden="true">›</span>
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
      >
        {children}
      </Drawer>
    </>
  );
}
