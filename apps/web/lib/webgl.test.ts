import { describe, expect, it } from "vitest";

import { hasWebGL } from "./webgl";

describe("hasWebGL", () => {
  it("returns false in a node test environment", () => {
    expect(hasWebGL()).toBe(false);
  });
});
