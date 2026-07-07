import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    // This monorepo has no root package.json/lockfile: `data/*.json` and
    // `archive-manifest.json` live one level above `apps/web`. Turbopack
    // only resolves modules within its detected root, so point it at the
    // repo root explicitly (see D1/D2: ETL writes `data/`, web reads it).
    root: path.join(currentDir, "../.."),
  },
};

export default nextConfig;
