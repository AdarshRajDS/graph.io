import { describe, expect, it } from "vitest";

import { defaultFunction2dSpec, defaultPolarSpec } from "@math-vis/visualization-schema";

import { formatExpressionLine } from "./Equation";

describe("formatExpressionLine", () => {
  it("renders a function as a single y = line", () => {
    expect(formatExpressionLine({ ...defaultFunction2dSpec, expression: "exp(-a * abs(x)) * sin(b * x)" })).toBe(
      "y = exp(-a * abs(x)) * sin(b * x)",
    );
  });

  it("renders a polar curve as r = ", () => {
    expect(formatExpressionLine(defaultPolarSpec).startsWith("r = ")).toBe(true);
  });
});
