import type { Metadata } from "next";
import { fraunces, instrumentSans, newsreader, splineSansMono } from "./fonts";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s — ¿Dónde va la plata? — Coronel Rosales",
    default: "¿Dónde va la plata? — Coronel Rosales",
  },
  description:
    "Datos públicos de coparticipación y fallos del Tribunal de Cuentas de Coronel Rosales, con enlaces a fuente y archivo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={`${fraunces.variable} ${instrumentSans.variable} ${splineSansMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper font-sans text-ink">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-surface"
        >
          Saltar al contenido principal
        </a>
        {/*
          SiteHeader + <main id="main-content"> are NOT rendered here.
          Highlighting the active nav item needs to know the current
          section, and nested route segments can't reach back up into an
          ancestor-rendered header without either React Context (Client
          Component only) or `usePathname()` (also Client-only, and it
          throws outside a mounted Next.js router -- exactly how this
          repo's tests render page/header components directly). Each
          top-level section instead gets a tiny `layout.tsx` that renders
          `<SiteHeader activeHref="/section" />` itself (see
          app/coparticipacion/layout.tsx and siblings); the home page ("/"
          has no nested layout) renders its own with `activeHref={null}`.
          This keeps nav highlighting fully static/zero-JS.
        */}
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
