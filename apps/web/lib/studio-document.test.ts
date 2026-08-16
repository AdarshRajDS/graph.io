import { describe, expect, it } from "vitest";

import { defaultSpecForKind } from "@math-vis/visualization-schema";

import { animatedParameters, documentFromSpecs, graphSummary } from "./studio-document";

describe("studio document", () => {
  it("wraps specs in named visible layers", () => {
    const document = documentFromSpecs([defaultSpecForKind("function-2d"), defaultSpecForKind("polar-curve")], 1);
    expect(document.layers).toHaveLength(2);
    expect(document.layers[0]?.visible).toBe(true);
    expect(document.selected).toBe(1);
    expect(graphSummary(document)).toMatch(/2 layers/);
  });

  it("animates marked parameters between min and max", () => {
    const spec = defaultSpecForKind("function-2d");
    const values = animatedParameters(spec, { a: { min: 0, max: 2, step: 0.1, animate: true } }, Math.PI / 2);
    expect(values.a).toBeCloseTo(2);
  });
});
