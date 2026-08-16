import { describe, expect, it } from "vitest";

import { sceneFromSearchParams, sceneHref, sceneToSearchParams, specFromSearchParams, specToSearchParams } from "./url-state";

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
    expect(params.get("kind")).toBe("function-2d");
    expect(params.get("expr")).toBe("c*sin(x)");
    expect(params.get("c")).toBe("2");
  });

  it("builds a share URL without a Next.js navigation", () => {
    const spec = specFromSearchParams(new URLSearchParams("expr=sin(x)"));
    expect(sceneHref("/", [spec], 0)).toContain("expr=sin%28x%29");
  });

  it("round-trips stacked layers in the URL", () => {
    const functionSpec = specFromSearchParams(new URLSearchParams("expr=sin(x)"));
    const polar = specFromSearchParams(new URLSearchParams("kind=polar-curve&expr=cos(t)"));
    const params = sceneToSearchParams([functionSpec, polar], 1);
    const scene = sceneFromSearchParams(params);
    expect(scene.layers).toHaveLength(2);
    expect(scene.selected).toBe(1);
    expect(scene.layers[1]?.kind).toBe("polar-curve");
  });
});
