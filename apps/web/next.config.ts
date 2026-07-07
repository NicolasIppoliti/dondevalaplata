import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Vercel CLI builds force the tracing root to `apps/web`, which restricts
  // Turbopack module resolution below the repo root and breaks the
  // `../../data/*.json` and `../../archive-manifest.json` imports. Pin it
  // to the monorepo root explicitly so local and `vercel build` agree.
  outputFileTracingRoot: path.join(currentDir, "../.."),
  turbopack: {
    // This monorepo has no root package.json/lockfile: `data/*.json` and
    // `archive-manifest.json` live one level above `apps/web`. Turbopack
    // only resolves modules within its detected root, so point it at the
    // repo root explicitly (see D1/D2: ETL writes `data/`, web reads it).
    root: path.join(currentDir, "../.."),
  },
};

export default nextConfig;
