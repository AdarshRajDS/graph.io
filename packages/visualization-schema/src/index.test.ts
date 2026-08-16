import { describe, expect, it } from "vitest";

import function2d from "../fixtures/function-2d.json";
import implicitCurve from "../fixtures/implicit-curve.json";
import invalidPython from "../fixtures/invalid-python.json";
import parametric from "../fixtures/parametric-curve.json";
import paritySurface from "../fixtures/parity-surface.json";
import surface from "../fixtures/surface.json";
import vectorField from "../fixtures/vector-field.json";
import { assertCapabilityCoverage, CAPABILITIES, capabilityFor } from "./capabilities";
import { EXAMPLES } from "./examples";
import { compileExpression, parseExpression } from "./parser";
import { parseSceneDocument } from "./scene";
import { sampleExplicitSurface } from "./sampling";
import {
  cloneVisualizationSpec,
  defaultSpecForKind,
  parseVisualizationSpec,
  safeParseVisualizationSpec,
  specWithUserExpressions,
  visualizationKinds,
} from "./spec";

describe("expression parser", () => {
  it("evaluates a * sin(b * x)", () => {
    const fn = compileExpression("a * sin(b * x)", ["x", "a", "b"]);
    expect(fn({ x: 0, a: 2, b: 1 })).toBeCloseTo(0);
    expect(fn({ x: Math.PI / 2, a: 2, b: 1 })).toBeCloseTo(2);
  });

  it("accepts implicit multiplication such as 2x and 3(x+1)", () => {
    const times = compileExpression("2x + 1", ["x"]);
    expect(times({ x: 3 })).toBeCloseTo(7);
    const grouped = compileExpression("3(x+1)", ["x"]);
    expect(grouped({ x: 2 })).toBeCloseTo(9);
  });

  it("accepts ** as exponentiation and hyperbolic functions", () => {
    const fn = compileExpression("sinh(x) + a ** 2", ["x", "a"]);
    expect(fn({ x: 0, a: 3 })).toBeCloseTo(9);
  });

  it("rejects unknown functions and python-like payloads", () => {
    expect(() => parseExpression("__import__('os')", ["x"])).toThrow(/not allowed|Unexpected/);
    expect(() => parseExpression("eval(x)", ["x"])).toThrow();
    expect(() => parseExpression("os.system('id')", ["x"])).toThrow();
  });
});

describe("visualization spec fixtures", () => {
  it("accepts golden fixtures", () => {
    expect(parseVisualizationSpec(function2d).kind).toBe("function-2d");
    expect(parseVisualizationSpec(parametric).kind).toBe("parametric-curve");
    expect(parseVisualizationSpec(vectorField).kind).toBe("vector-field");
    expect(parseVisualizationSpec(implicitCurve).kind).toBe("implicit-curve");
    expect(parseVisualizationSpec(surface).kind).toBe("surface");
  });

  it("rejects python source fixtures", () => {
    expect(safeParseVisualizationSpec(invalidPython).success).toBe(false);
  });
});

describe("specWithUserExpressions", () => {
  it("builds a function spec and infers parameter sliders", () => {
    const spec = specWithUserExpressions("function-2d", { expression: "c * cos(x)" }, { c: 3 });
    expect(spec.kind).toBe("function-2d");
    if (spec.kind === "function-2d") {
      expect(spec.expression).toBe("c * cos(x)");
      expect(spec.parameters).toEqual({ c: 3 });
    }
  });

  it("builds parametric and vector-field specs from paired expressions", () => {
    const parametricSpec = specWithUserExpressions("parametric-curve", {
      expressionX: "a * cos(t)",
      expressionY: "b * sin(t)",
    });
    expect(parametricSpec.kind).toBe("parametric-curve");
    expect(parametricSpec.parameters).toEqual({ a: 1, b: 1 });

    const field = specWithUserExpressions("vector-field", {
      expressionX: "-y",
      expressionY: "x",
    });
    expect(field.kind).toBe("vector-field");
    expect(field.parameters).toEqual({});
  });

  it("rejects unknown functions", () => {
    expect(() => specWithUserExpressions("function-2d", { expression: "eval(x)" })).toThrow();
  });
});

describe("example catalogue", () => {
  it("parses every bundled example", () => {
    expect(EXAMPLES.length).toBeGreaterThan(20);
    const kinds = new Set(EXAMPLES.map((item) => item.kind));
    expect(kinds.has("polar-curve")).toBe(true);
    expect(kinds.has("implicit-curve")).toBe(true);
    expect(kinds.has("surface")).toBe(true);
    expect(kinds.has("geometry")).toBe(true);
    expect(kinds.has("annotation")).toBe(true);
  });

  it("clones specs so template edits cannot leak into the catalogue", () => {
    const ellipse = EXAMPLES.find((item) => item.id === "ellipse");
    if (!ellipse || ellipse.spec.kind !== "parametric-curve") {
      throw new Error("expected ellipse example");
    }
    const copy = cloneVisualizationSpec(ellipse.spec);
    copy.parameters.a = 7;
    expect(ellipse.spec.parameters.a).toBe(3);

    const first = defaultSpecForKind("function-2d");
    const second = defaultSpecForKind("function-2d");
    first.parameters.a = 9;
    expect(second.parameters.a).toBe(1);
  });
});

describe("capability registry", () => {
  it("covers every visualization kind", () => {
    assertCapabilityCoverage();
    expect(CAPABILITIES.map((item) => item.type).sort()).toEqual([...visualizationKinds].sort());
    expect(capabilityFor("surface").browser3D).toBe(true);
  });
});

describe("numeric parity fixture", () => {
  it("matches shared surface samples", () => {
    const fn = compileExpression(paritySurface.expression, paritySurface.allowedNames);
    for (const sample of paritySurface.samples) {
      expect(fn(sample.scope)).toBeCloseTo(sample.value, 10);
    }
  });

  it("samples an explicit surface mesh without executing code", () => {
    const fn = compileExpression("x^2 + y^2", ["x", "y"]);
    const mesh = sampleExplicitSurface((x, y) => fn({ x, y }), [-1, 1], 4);
    expect(mesh.samples).toHaveLength(25);
    const origin = mesh.samples.find((point) => point.x === 0 && point.y === 0);
    expect(origin?.z).toBeCloseTo(0);
    expect(() => compileExpression("__import__('os')", ["x", "y"])).toThrow();
  });
});

describe("scene document", () => {
  it("accepts stacked 2d layers and rejects python payloads", () => {
    const scene = parseSceneDocument({
      version: 1,
      layers: [function2d, parametric],
    });
    expect(scene.layers).toHaveLength(2);
    expect(parseSceneDocument(function2d).layers).toHaveLength(1);
    expect(() => parseSceneDocument({ version: 1, layers: [invalidPython] })).toThrow();
  });
});
