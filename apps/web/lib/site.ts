/**
 * Canonical production site URL. Used to build absolute share links (Web
 * Share API / WhatsApp intent / copy-link, feature H3b) and as
 * `metadataBase` for resolving relative Open Graph image URLs. Static
 * constant, never derived from a request header -- this is a static
 * portal, deployed at one fixed domain.
 */
export const SITE_URL = "https://dondevalaplata.vercel.app";

/**
 * Rectification/contact channel for the titularidad registral field (Ley
 * 25.326 art. 16, derecho de rectificación -- AAIP, Agencia de Acceso a
 * la Información Pública, is the enforcement authority for this right).
 * Real inbox controlled by the portal owner (fragua.dev), receiving
 * rectification requests per Ley 25.326 (derecho de rectificación).
 * See DESIGN.md's titularidad decision entry.
 */
export const RECTIFICATION_EMAIL = "rectificaciones@fragua.dev";

/**
 * Feature flag for the titularidad registral (vendor-ownership) field.
 * Parked per owner decision 2026-07-10 (real-world risk of naming private
 * vendor owners, flagged by the owner's trusted contacts). Keep the code +
 * data; do not render until owner + legal green-light. Flip to true only
 * after that. See DESIGN.md's titularidad decision entry for the full
 * rationale and `tests/titularidad-flag.test.ts` for the guard that keeps
 * an accidental flip from slipping through review.
 */
export const TITULARIDAD_ENABLED = false;
