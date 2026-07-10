import type { Metadata } from "next";
import { SITE_URL } from "./site";

/**
 * SEO: shared per-route metadata builder. Next.js metadata merges only
 * SHALLOWLY across layout/page segments -- a page that sets its own
 * `openGraph` key REPLACES the parent's `openGraph` object wholesale, it
 * does not deep-merge individual fields ("Metadata merging" in the
 * `generateMetadata` API reference). Every route on this static portal
 * therefore builds its FULL metadata (title, description, canonical,
 * openGraph, twitter) through this single helper instead of hand-rolling
 * openGraph/twitter per page, so no route accidentally loses a field the
 * root layout set as a default.
 */

export const SITE_NAME = "¿Dónde va la plata? — Coronel Rosales";

const TITLE_SUFFIX = "¿Dónde va la plata? — Coronel Rosales";

interface PageMetadataInput {
  /**
   * Page-specific title. For every route except home, this is the RAW
   * title WITHOUT the site suffix -- the root layout's `title.template`
   * ("%s — ¿Dónde va la plata? — Coronel Rosales") appends that suffix to
   * the `<title>` tag automatically, so this builder keeps `title` as-is
   * and appends the SAME suffix explicitly only to `openGraph.title` /
   * `twitter.title`, which never go through that template.
   */
  title: string;
  description: string;
  /** Route path, e.g. "/coparticipacion". Use "" for the home page. */
  path: string;
  /**
   * True only for the home page, whose title IS already the site's full
   * default title (root layout's `title.default`) -- passing `title`
   * through unchanged for openGraph/twitter avoids double-appending the
   * suffix.
   */
  isHome?: boolean;
}

export function buildPageMetadata({
  title,
  description,
  path,
  isHome = false,
}: PageMetadataInput): Metadata {
  const url = path === "" ? SITE_URL : `${SITE_URL}${path}`;
  const fullTitle = isHome ? title : `${title} — ${TITLE_SUFFIX}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "es_AR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
