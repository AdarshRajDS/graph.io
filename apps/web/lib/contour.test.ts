import { describe, expect, it } from "vitest";

import { contourPolylines } from "./contour";

describe("contourPolylines", () => {
  it("finds the unit circle", () => {
    const lines = contourPolylines((x, y) => x * x + y * y - 1, [-2, 2], 16, 0);
    expect(lines.length).toBeGreaterThan(8);
  });
});
