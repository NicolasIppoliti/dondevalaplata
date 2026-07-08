/**
 * Canonical production site URL. Used to build absolute share links (Web
 * Share API / WhatsApp intent / copy-link, feature H3b) and as
 * `metadataBase` for resolving relative Open Graph image URLs. Static
 * constant, never derived from a request header -- this is a static
 * portal, deployed at one fixed domain.
 */
export const SITE_URL = "https://dondevalaplata.vercel.app";
