import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const githubPages = process.env.GITHUB_PAGES === "1";
const pagesBasePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: githubPages ? "export" : "standalone",
  transpilePackages: ["@math-vis/api-client", "@math-vis/visualization-schema", "mafs", "three"],
  ...(githubPages
    ? {
        basePath: pagesBasePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        outputFileTracingRoot: path.join(configDir, "../.."),
      }),
};

export default nextConfig;
