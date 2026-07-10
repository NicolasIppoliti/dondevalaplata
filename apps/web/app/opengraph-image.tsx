import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_HOST } from "@/lib/site";

/**
 * SEO: site-wide default Open Graph image, used by every route that does
 * not define a more specific one (Next.js file-convention precedence --
 * `app/compartir/[fact]/opengraph-image.tsx`, feature H3b, still wins for
 * that route specifically). Same generation approach as the H3b share
 * cards (`ImageResponse` + vendored `.woff` brand fonts under
 * `assets/fonts/`, see that file's comment for why raw `.woff` bytes are
 * required instead of `next/font/google`), simplified to a generic
 * site-identity card with no per-fact data -- build-time only, no
 * Request-time API, cached by Next like every other metadata file.
 */

export const alt = "¿Dónde va la plata? — Coronel Rosales";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F2EFE4";
const INK = "#1A1A17";
const MUTED = "#6B6558";
const STAMP = "#C4361E";
const RULE = "#D8D2C0";

export default async function Image() {
  const [fraunces, splineSansMono, instrumentSans] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Fraunces-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/SplineSansMono-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSans-SemiBold.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          padding: "56px 64px",
          fontFamily: "Instrument Sans",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: INK,
                color: PAPER,
                fontFamily: "Spline Sans Mono",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              $
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: INK }}>
                ¿Dónde va la plata?
              </div>
              <div
                style={{
                  fontFamily: "Spline Sans Mono",
                  fontSize: 15,
                  color: MUTED,
                }}
              >
                Coronel Rosales · Punta Alta
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: "Spline Sans Mono",
              fontSize: 16,
              fontWeight: 700,
              color: STAMP,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Portal cívico
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          <div
            style={{
              fontFamily: "Fraunces",
              fontWeight: 700,
              fontSize: 52,
              lineHeight: 1.15,
              color: INK,
              maxWidth: 1020,
            }}
          >
            Seguimos la plata pública de Coronel Rosales.
          </div>
          <div
            style={{ fontSize: 26, color: INK, marginTop: 20, maxWidth: 940 }}
          >
            Coparticipación y fallos del Tribunal de Cuentas, con fuente y
            copia archivada en cada dato.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `2px solid ${RULE}`,
            paddingTop: 20,
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontFamily: "Spline Sans Mono",
              fontSize: 16,
              color: MUTED,
            }}
          >
            Portal ciudadano independiente, sin fines partidarios
          </div>
          <div
            style={{
              fontFamily: "Spline Sans Mono",
              fontSize: 18,
              fontWeight: 700,
              color: INK,
            }}
          >
            {SITE_HOST}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 700, style: "normal" },
        {
          name: "Spline Sans Mono",
          data: splineSansMono,
          weight: 700,
          style: "normal",
        },
        {
          name: "Instrument Sans",
          data: instrumentSans,
          weight: 600,
          style: "normal",
        },
      ],
    },
  );
}
