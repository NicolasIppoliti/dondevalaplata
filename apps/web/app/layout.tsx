import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { fraunces, instrumentSans, newsreader, splineSansMono } from "./fonts";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SITE_NAME } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const DEFAULT_TITLE = "¿Dónde va la plata? — Coronel Rosales";
const DEFAULT_DESCRIPTION =
  "Datos públicos de coparticipación y fallos del Tribunal de Cuentas de Coronel Rosales, con enlaces a fuente y archivo.";

export const metadata: Metadata = {
  // Resolves relative Open Graph/Twitter image URLs (e.g. the H3b
  // `/compartir/[fact]/opengraph-image.tsx` cards, and the site-wide
  // default `app/opengraph-image.tsx`) to absolute URLs against the real
  // production domain.
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s — ¿Dónde va la plata? — Coronel Rosales",
    default: DEFAULT_TITLE,
  },
  description: DEFAULT_DESCRIPTION,
  // Sensible site-wide default (SEO): every route overrides this with its
  // own `buildPageMetadata()` call (lib/seo.ts) except the home page,
  // which has no distinct title/description of its own and relies on
  // this default as-is.
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `env(safe-area-inset-*)` (used by the mobile bottom tab bar's padding)
  // is only non-zero with `viewport-fit=cover`.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#17150f" },
  ],
};

// Anti-flash theme init: reads the same `ddvlp-theme` key ThemeToggle
// writes to, BEFORE first paint (`strategy="beforeInteractive"`), so a
// repeat visitor who chose dark never sees a light flash. Light is the
// default whenever nothing (or something unexpected) is stored -- this
// never reads `prefers-color-scheme`, on purpose (see globals.css).
const THEME_INIT_SCRIPT = `(function () {
  try {
    var stored = localStorage.getItem("ddvlp-theme");
    document.documentElement.setAttribute("data-theme", stored === "dark" ? "dark" : "light");
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={`${fraunces.variable} ${instrumentSans.variable} ${splineSansMono.variable} ${newsreader.variable} h-full antialiased`}
      // `THEME_INIT_SCRIPT` below sets `data-theme` on this element
      // BEFORE first paint (`beforeInteractive`), intentionally ahead of
      // React hydration, so a repeat visitor's stored dark-mode choice
      // never flashes light first (see the script's own comment + the
      // ThemeToggle/dark-mode section of DESIGN.md). React can't know
      // about that attribute at SSR time, so it always reports a
      // hydration mismatch on `data-theme` specifically -- this is the
      // standard, documented fix for exactly this pattern (Next.js's own
      // dark-mode guide), not a real markup bug.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-paper pb-20 font-sans text-ink sm:pb-0">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
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

          `MobileBottomNav` below IS a client island (usePathname) -- that
          asymmetry is intentional, see its own file comment: the desktop
          header's active-nav is cosmetic and can stay zero-JS, but the
          bottom tab bar is always-mounted app chrome across every route,
          which is exactly the kind of small interactive island this
          redesign allows.
        */}
        {children}
        <SiteFooter />
        <MobileBottomNav />
      </body>
    </html>
  );
}
