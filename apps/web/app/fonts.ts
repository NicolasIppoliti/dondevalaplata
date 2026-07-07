import { Fraunces, Instrument_Sans, Newsreader, Spline_Sans_Mono } from "next/font/google";

/**
 * Self-hosted font definitions (design system "El Recibo del Municipio",
 * DESIGN.md typography table). `next/font/google` downloads and hosts every
 * font file at build time -- the browser never requests fonts.googleapis.com
 * or fonts.gstatic.com at runtime.
 *
 * - Fraunces and Newsreader load as true variable fonts with the `opsz`
 *   (optical size) axis enabled: DESIGN.md calls for "opsz alto" on display
 *   headings and Newsreader's opsz range (6-72) is the whole point of using
 *   it for pull-quotes at both body and larger sizes. Next.js only allows
 *   `axes` when `weight: "variable"` (a fixed weight range can't carry extra
 *   axes), so both ship as a single variable file per style; CSS
 *   `font-weight` then picks the specific weights DESIGN.md calls for
 *   (Fraunces 600/700 display, italic 400; Newsreader italic 400). Fraunces'
 *   italic style is loaded per the DESIGN.md subsetting note even though no
 *   component currently sets `font-style: italic` on it -- an unused
 *   `@font-face` is never actually fetched by the browser, so this carries
 *   no real runtime cost.
 * - Instrument Sans and Spline Sans Mono use discrete static weights (no
 *   axes needed), matching DESIGN.md's literal subsetting list.
 */

export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-fraunces",
});

export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: "normal",
  display: "swap",
  variable: "--font-instrument-sans",
});

export const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: "normal",
  display: "swap",
  variable: "--font-spline-sans-mono",
});

export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  style: ["italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-newsreader",
});
