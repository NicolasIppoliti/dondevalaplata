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
