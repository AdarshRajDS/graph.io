import { defaultFunction2dSpec, defaultParametricSpec } from "@math-vis/visualization-schema";
import { describe, expect, it } from "vitest";

import {
  MANIM_BG,
  MANIM_BLUE,
  MANIM_HEIGHT,
  MANIM_WIDTH,
  axesRange,
  clipTimeline,
  dataToPixel,
  layerStrokes,
  manimEase,
  prefixByLength,
  xTickStep,
} from "./manim-clip";

describe("Manim-styled clip", () => {
  it("uses Community Edition black and BLUE", () => {
    expect(MANIM_BG).toBe("#000000");
    expect(MANIM_BLUE).toBe("#58C4DD");
    expect(MANIM_WIDTH / MANIM_HEIGHT).toBeCloseTo(16 / 9);
  });

  it("maps the origin to the frame center", () => {
    const layout = { xMin: -10, xMax: 10, yMin: -5, yMax: 5 };
    const [x, y] = dataToPixel(0, 0, layout);
    expect(x).toBeCloseTo(MANIM_WIDTH / 2);
    expect(y).toBeCloseTo(MANIM_HEIGHT / 2);
  });

  it("uses Manim Axes tick spacing for a length-20 domain", () => {
    expect(xTickStep(-10, 10)).toBe(2);
  });

  it("fades axes before creating the curve", () => {
    expect(clipTimeline(0)).toEqual({ axesOpacity: 0, curveProgress: 0 });
    expect(clipTimeline(400).axesOpacity).toBe(1);
    expect(clipTimeline(400).curveProgress).toBe(0);
    expect(clipTimeline(2000).curveProgress).toBe(1);
    expect(manimEase(0.5)).toBeCloseTo(0.5);
  });

  it("samples a sine on the first layer in Manim blue", () => {
    const layout = axesRange([defaultFunction2dSpec]);
    expect(layout).toEqual({ xMin: -10, xMax: 10, yMin: -5, yMax: 5 });
    const strokes = layerStrokes(defaultFunction2dSpec, MANIM_BLUE);
    expect(strokes.color).toBe(MANIM_BLUE);
    const line = strokes.polylines[0];
    expect(line.length).toBeGreaterThan(100);
    const origin = line.find(([x]) => Math.abs(x) < 0.03);
    expect(origin?.[1]).toBeCloseTo(0, 1);
  });

  it("prefixes a polyline for Create-style drawing", () => {
    const prefix = prefixByLength(
      [
        [0, 0],
        [2, 0],
        [2, 2],
      ],
      3,
    );
    expect(prefix[prefix.length - 1]).toEqual([2, 1]);
  });

  it("samples a parametric circle", () => {
    const strokes = layerStrokes(defaultParametricSpec, MANIM_BLUE);
    const line = strokes.polylines[0];
    expect(line.length).toBeGreaterThan(50);
    const xs = line.map(([x]) => x);
    expect(Math.max(...xs)).toBeGreaterThan(1.5);
  });
});
