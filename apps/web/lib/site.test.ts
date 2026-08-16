import { describe, expect, it } from "vitest";

import { ASSET_PREFIX, SITE_DESCRIPTION, SITE_NAME } from "./site";

describe("site metadata", () => {
  it("names the product graph.io", () => {
    expect(SITE_NAME).toBe("graph.io");
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(40);
    expect(ASSET_PREFIX === "" || ASSET_PREFIX.startsWith("/")).toBe(true);
  });
});
