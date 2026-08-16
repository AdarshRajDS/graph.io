import { describe, expect, it } from "vitest";

import { ASSET_PREFIX, publicAsset, SITE_DESCRIPTION, SITE_NAME } from "./site";

describe("site metadata", () => {
  it("names the product graph.io", () => {
    expect(SITE_NAME).toBe("graph.io");
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(40);
    expect(ASSET_PREFIX === "" || ASSET_PREFIX.startsWith("/")).toBe(true);
  });

  it("prefixes public files for GitHub Pages", () => {
    expect(publicAsset("/brand/logo.png", "")).toBe("/brand/logo.png");
    expect(publicAsset("/brand/logo.png", "/graph.io")).toBe("/graph.io/brand/logo.png");
  });
});
