export const SITE_NAME = "graph.io";
export const SITE_DESCRIPTION =
  "Draw interactive functions, polar curves, vector fields, and surfaces in the browser. Share a graph with a URL and download a short video of the plot.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adarshrajds.github.io/graph.io";
export const ASSET_PREFIX = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function publicAsset(path: string, prefix = ASSET_PREFIX): string {
  const base = prefix.replace(/\/$/, "");
  const file = path.startsWith("/") ? path : `/${path}`;
  return `${base}${file}`;
}
