import type { Metadata } from "next";
import { fraunces, instrumentSans, newsreader, splineSansMono } from "./fonts";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
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
        <SiteHeader />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1080px] flex-1 px-5 py-10"
        >
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
