import { describe, expect, it } from "vitest";

import { EXAMPLES } from "@math-vis/visualization-schema";

import {
  applySceneSearch,
  sceneFromSearchParams,
  sceneHref,
  sceneToSearchParams,
  specFromSearchParams,
  specToSearchParams,
} from "./url-state";

describe("specFromSearchParams", () => {
  it("restores a and b", () => {
    const spec = specFromSearchParams(new URLSearchParams("a=3&b=4"));
    expect(spec.kind).toBe("function-2d");
    if (spec.kind === "function-2d") {
      expect(spec.parameters.a).toBe(3);
      expect(spec.parameters.b).toBe(4);
    }
  });

  it("reverts invalid numbers to defaults", () => {
    const spec = specFromSearchParams(new URLSearchParams("a=nope&b=999"));
    if (spec.kind === "function-2d") {
      expect(spec.parameters.a).toBe(1);
      expect(spec.parameters.b).toBe(1);
    }
  });

  it("restores a custom function expression", () => {
    const spec = specFromSearchParams(new URLSearchParams("expr=cos(x)"));
    expect(spec.kind).toBe("function-2d");
    if (spec.kind === "function-2d") {
      expect(spec.expression).toBe("cos(x)");
      expect(spec.parameters).toEqual({});
    }
  });

  it("restores polar expressions from the URL", () => {
    const spec = specFromSearchParams(new URLSearchParams("kind=polar-curve&expr=a*(1-cos(t))&a=2"));
    expect(spec.kind).toBe("polar-curve");
    if (spec.kind === "polar-curve") {
      expect(spec.expression).toContain("cos(t)");
    }
  });

  it("restores parametric expressions from the URL", () => {
    const spec = specFromSearchParams(
      new URLSearchParams("kind=parametric-curve&exprX=cos(t)&exprY=sin(t)"),
    );
    expect(spec.kind).toBe("parametric-curve");
    if (spec.kind === "parametric-curve") {
      expect(spec.expressionX).toBe("cos(t)");
      expect(spec.expressionY).toBe("sin(t)");
    }
  });

  it("falls back when an expression is not allowed", () => {
    const spec = specFromSearchParams(new URLSearchParams("expr=eval(x)"));
    expect(spec.kind).toBe("function-2d");
    if (spec.kind === "function-2d") {
      expect(spec.expression).toBe("a * sin(b * x)");
    }
  });
});

describe("specToSearchParams", () => {
  it("round-trips a custom function spec", () => {
    const spec = specFromSearchParams(new URLSearchParams("expr=c*sin(x)&c=2"));
    const params = specToSearchParams(spec);
    expect(params.get("schema")).toBe("1");
    expect(params.get("kind")).toBe("function-2d");
    expect(params.get("expr")).toBe("c*sin(x)");
    expect(params.get("c")).toBe("2");
  });

  it("keeps the GitHub Pages base path when writing search params", () => {
    const spec = specFromSearchParams(new URLSearchParams("expr=sin(x)"));
    expect(applySceneSearch("https://adarshrajds.github.io/graph.io/", [spec], 0)).toMatch(
      /^\/graph\.io\/\?/,
    );
    expect(applySceneSearch("https://adarshrajds.github.io/graph.io/", [spec], 0)).not.toMatch(
      /^\/\?/,
    );
    expect(sceneHref("/graph.io/", [spec], 0)).toContain("/graph.io/?");
  });

  it("round-trips stacked layers in the URL", () => {
    const functionSpec = specFromSearchParams(new URLSearchParams("expr=sin(x)"));
    const polar = specFromSearchParams(new URLSearchParams("kind=polar-curve&expr=cos(t)"));
    const params = sceneToSearchParams([functionSpec, polar], 1);
    const scene = sceneFromSearchParams(params);
    expect(scene.layers).toHaveLength(2);
    expect(scene.selected).toBe(1);
    expect(scene.notice).toBeNull();
    expect(scene.layers[1]?.kind).toBe("polar-curve");
  });

  it("restores a recovery notice for malformed and unsupported share URLs", () => {
    const damaged = sceneFromSearchParams(new URLSearchParams("layers={not-json"));
    expect(damaged.notice).toMatch(/damaged/i);
    expect(damaged.layers).toHaveLength(1);

    const unsupported = sceneFromSearchParams(new URLSearchParams("schema=9&expr=sin(x)"));
    expect(unsupported.notice).toMatch(/not supported/i);
  });

  it("round-trips every example's parameters through the URL", () => {
    for (const example of EXAMPLES) {
      const restored = specFromSearchParams(specToSearchParams(example.spec));
      expect(restored.kind).toBe(example.spec.kind);
      expect(restored.parameters).toEqual(example.spec.parameters);
    }
  });
});
