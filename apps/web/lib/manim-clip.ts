import {
  compileExpression,
  type GeometrySpec,
  type VisualizationSpec,
} from "@math-vis/visualization-schema";

import { contourPolylines } from "@/lib/contour";
import { CLIP_DURATION_MS, CLIP_FPS, pickRecorderMime } from "@/lib/record-plot";

/** Manim Community Edition `BLACK` / `BLUE`. */
export const MANIM_BG = "#000000";
export const MANIM_BLUE = "#58C4DD";
export const MANIM_AXIS = "#FFFFFF";

export const MANIM_LAYER_COLORS = [
  MANIM_BLUE,
  "#FFFF00",
  "#83C167",
  "#FC6255",
  "#9A72AC",
  "#FF862F",
  "#D147BD",
  "#5CD0B3",
] as const;

export const MANIM_WIDTH = 1920;
export const MANIM_HEIGHT = 1080;
export const MANIM_FRAME_WIDTH = 14.222;
export const MANIM_X_LENGTH = 10;
export const MANIM_Y_LENGTH = 6;
export const MANIM_FADE_S = 0.4;
export const MANIM_CREATE_S = 1.6;

export type PlotLayout = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export function axesRange(layers: VisualizationSpec[]): PlotLayout {
  const spec = layers[0];
  if (!spec) {
    return { xMin: -8, xMax: 8, yMin: -5, yMax: 5 };
  }
  if (spec.kind === "function-2d" || spec.kind === "annotation") {
    return { xMin: spec.domain[0], xMax: spec.domain[1], yMin: -5, yMax: 5 };
  }
  if (spec.kind === "parametric-curve" || spec.kind === "polar-curve") {
    return { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  }
  return { xMin: spec.domain[0], xMax: spec.domain[1], yMin: spec.domain[0], yMax: spec.domain[1] };
}

export function xTickStep(xMin: number, xMax: number): number {
  return Math.max(1, (xMax - xMin) / 10);
}

export function dataToPixel(x: number, y: number, layout: PlotLayout): [number, number] {
  const sx = ((x - layout.xMin) / (layout.xMax - layout.xMin) - 0.5) * MANIM_X_LENGTH;
  const sy = ((y - layout.yMin) / (layout.yMax - layout.yMin) - 0.5) * MANIM_Y_LENGTH;
  const units = MANIM_WIDTH / MANIM_FRAME_WIDTH;
  return [MANIM_WIDTH / 2 + sx * units, MANIM_HEIGHT / 2 - sy * units];
}

export function manimEase(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function clipTimeline(elapsedMs: number): { axesOpacity: number; curveProgress: number } {
  const t = Math.max(0, elapsedMs) / 1000;
  if (t <= MANIM_FADE_S) {
    return { axesOpacity: manimEase(t / MANIM_FADE_S), curveProgress: 0 };
  }
  if (t <= MANIM_FADE_S + MANIM_CREATE_S) {
    return { axesOpacity: 1, curveProgress: manimEase((t - MANIM_FADE_S) / MANIM_CREATE_S) };
  }
  return { axesOpacity: 1, curveProgress: 1 };
}

export function sampleExplicit(
  fn: (x: number) => number,
  domain: [number, number],
  n = 800,
): Array<Array<[number, number]>> {
  const polylines: Array<Array<[number, number]>> = [];
  let current: Array<[number, number]> = [];
  const [lo, hi] = domain;
  for (let i = 0; i <= n; i += 1) {
    const x = lo + (i / n) * (hi - lo);
    const y = fn(x);
    if (!Number.isFinite(y) || Math.abs(y) > 1e6) {
      if (current.length > 1) {
        polylines.push(current);
      }
      current = [];
      continue;
    }
    if (current.length > 0 && Math.abs(y - current[current.length - 1][1]) > 8) {
      polylines.push(current);
      current = [[x, y]];
      continue;
    }
    current.push([x, y]);
  }
  if (current.length > 1) {
    polylines.push(current);
  }
  return polylines;
}

export function polylineLength(points: Array<[number, number]>): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    length += Math.hypot(dx, dy);
  }
  return length;
}

export function prefixByLength(points: Array<[number, number]>, travel: number): Array<[number, number]> {
  if (points.length === 0 || travel <= 0) {
    return [];
  }
  const out: Array<[number, number]> = [points[0]];
  let remaining = travel;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const seg = Math.hypot(dx, dy);
    if (seg <= remaining) {
      out.push(points[i]);
      remaining -= seg;
      continue;
    }
    const t = remaining / (seg || 1);
    out.push([points[i - 1][0] + dx * t, points[i - 1][1] + dy * t]);
    return out;
  }
  return out;
}

function ticks(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  const start = Math.ceil((min + 1e-9) / step) * step;
  for (let value = start; value < max - 1e-9; value += step) {
    values.push(Number(value.toFixed(6)));
  }
  return values;
}

type StrokeLayer = { color: string; polylines: Array<Array<[number, number]>> };

export function layerStrokes(spec: VisualizationSpec, color: string): StrokeLayer {
  if (spec.kind === "function-2d" || spec.kind === "annotation") {
    const fn = compileExpression(spec.expression, ["x", ...Object.keys(spec.parameters)]);
    return {
      color,
      polylines: sampleExplicit((x) => fn({ x, ...spec.parameters }), spec.domain),
    };
  }
  if (spec.kind === "parametric-curve") {
    const fx = compileExpression(spec.expressionX, ["t", ...Object.keys(spec.parameters)]);
    const fy = compileExpression(spec.expressionY, ["t", ...Object.keys(spec.parameters)]);
    return {
      color,
      polylines: [
        sampleParametric((t) => [fx({ t, ...spec.parameters }), fy({ t, ...spec.parameters })], spec.domain),
      ],
    };
  }
  if (spec.kind === "polar-curve") {
    const fr = compileExpression(spec.expression, ["t", ...Object.keys(spec.parameters)]);
    return {
      color,
      polylines: [
        sampleParametric((t) => {
          const r = fr({ t, ...spec.parameters });
          return [r * Math.cos(t), r * Math.sin(t)];
        }, spec.domain),
      ],
    };
  }
  if (spec.kind === "implicit-curve" || spec.kind === "surface") {
    const fn = compileExpression(spec.expression, ["x", "y", ...Object.keys(spec.parameters)]);
    const levels = spec.kind === "surface" ? [-2, -1, 0, 1, 2] : [0];
    return {
      color,
      polylines: levels.flatMap((level) =>
        contourPolylines((x, y) => fn({ x, y, ...spec.parameters }), spec.domain, spec.kind === "surface" ? 28 : 36, level),
      ),
    };
  }
  if (spec.kind === "geometry") {
    return { color, polylines: geometryPolylines(spec) };
  }
  return { color, polylines: [] };
}

function sampleParametric(xy: (t: number) => [number, number], domain: [number, number], n = 800): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const [lo, hi] = domain;
  for (let i = 0; i <= n; i += 1) {
    const t = lo + (i / n) * (hi - lo);
    const [x, y] = xy(t);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push([x, y]);
    }
  }
  return points;
}

function geometryPolylines(spec: GeometrySpec): Array<Array<[number, number]>> {
  const p = spec.parameters;
  const r = Math.max(0.15, Math.abs(p.r ?? 2));
  const a = Math.max(0.15, Math.abs(p.a ?? 2));
  const b = Math.max(0.15, Math.abs(p.b ?? 1.5));
  const circle = (radius: number): Array<[number, number]> => {
    const points: Array<[number, number]> = [];
    for (let i = 0; i <= 96; i += 1) {
      const t = (i / 96) * Math.PI * 2;
      points.push([radius * Math.cos(t), radius * Math.sin(t)]);
    }
    return points;
  };
  if (spec.shape === "circle") {
    return [circle(r)];
  }
  if (spec.shape === "ellipse") {
    const points: Array<[number, number]> = [];
    for (let i = 0; i <= 96; i += 1) {
      const t = (i / 96) * Math.PI * 2;
      points.push([a * Math.cos(t), b * Math.sin(t)]);
    }
    return [points];
  }
  if (spec.shape === "square") {
    return [[[-a, -a], [a, -a], [a, a], [-a, a], [-a, -a]]];
  }
  if (spec.shape === "rectangle") {
    return [[[-a, -b], [a, -b], [a, b], [-a, b], [-a, -b]]];
  }
  if (spec.shape === "triangle") {
    return [[[0, a], [-a, -a], [a, -a], [0, a]]];
  }
  if (spec.shape === "polygon") {
    const n = Math.max(3, Math.min(12, Math.round(p.n ?? 6)));
    const points: Array<[number, number]> = [];
    for (let i = 0; i <= n; i += 1) {
      const t = (i / n) * Math.PI * 2 - Math.PI / 2;
      points.push([a * Math.cos(t), a * Math.sin(t)]);
    }
    return [points];
  }
  if (spec.shape === "line") {
    return [[[-a, 0], [a, 0]]];
  }
  if (spec.shape === "arc") {
    const points: Array<[number, number]> = [];
    for (let i = 0; i <= 48; i += 1) {
      const t = (i / 48) * Math.PI;
      points.push([r * Math.cos(t), r * Math.sin(t)]);
    }
    return [points];
  }
  if (spec.shape === "annulus") {
    return [circle(a), circle(b)];
  }
  return [[[0, 0], [0.01, 0]]];
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  layout: PlotLayout,
): void {
  if (points.length < 2) {
    return;
  }
  ctx.beginPath();
  const start = dataToPixel(points[0][0], points[0][1], layout);
  ctx.moveTo(start[0], start[1]);
  for (let i = 1; i < points.length; i += 1) {
    const [px, py] = dataToPixel(points[i][0], points[i][1], layout);
    ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: [number, number],
  to: [number, number],
  size: number,
): void {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  ctx.beginPath();
  ctx.moveTo(to[0], to[1]);
  ctx.lineTo(to[0] - size * Math.cos(angle - 0.4), to[1] - size * Math.sin(angle - 0.4));
  ctx.lineTo(to[0] - size * Math.cos(angle + 0.4), to[1] - size * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}

function drawAxes(ctx: CanvasRenderingContext2D, layout: PlotLayout, opacity: number): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = MANIM_AXIS;
  ctx.fillStyle = MANIM_AXIS;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const origin = dataToPixel(0, 0, layout);
  const left = dataToPixel(layout.xMin, 0, layout);
  const right = dataToPixel(layout.xMax, 0, layout);
  const bottom = dataToPixel(0, layout.yMin, layout);
  const top = dataToPixel(0, layout.yMax, layout);
  ctx.beginPath();
  ctx.moveTo(left[0], left[1]);
  ctx.lineTo(right[0], right[1]);
  ctx.moveTo(bottom[0], bottom[1]);
  ctx.lineTo(top[0], top[1]);
  ctx.stroke();
  drawArrowHead(ctx, left, right, 18);
  drawArrowHead(ctx, bottom, top, 18);

  const xStep = xTickStep(layout.xMin, layout.xMax);
  ctx.font = '28px "Latin Modern Math", "STIX Two Text", "Times New Roman", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const value of ticks(layout.xMin, layout.xMax, xStep)) {
    const [px, py] = dataToPixel(value, 0, layout);
    ctx.beginPath();
    ctx.moveTo(px, py - 8);
    ctx.lineTo(px, py + 8);
    ctx.stroke();
    if (Math.abs(value) > 1e-9) {
      ctx.fillText(String(Math.round(value)), px, py + 12);
    }
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const value of ticks(layout.yMin, layout.yMax, 1)) {
    const [px, py] = dataToPixel(0, value, layout);
    ctx.beginPath();
    ctx.moveTo(px - 8, py);
    ctx.lineTo(px + 8, py);
    ctx.stroke();
    if (Math.abs(value) > 1e-9) {
      ctx.fillText(String(Math.round(value)), px - 14, py);
    }
  }
  ctx.restore();
}

function drawVectorField(
  ctx: CanvasRenderingContext2D,
  spec: VisualizationSpec,
  layout: PlotLayout,
  opacity: number,
  color: string,
): void {
  if (spec.kind !== "vector-field") {
    return;
  }
  const fx = compileExpression(spec.expressionX, ["x", "y", ...Object.keys(spec.parameters)]);
  const fy = compileExpression(spec.expressionY, ["x", "y", ...Object.keys(spec.parameters)]);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  const step = 0.75;
  for (let x = spec.domain[0]; x <= spec.domain[1] + 1e-9; x += step) {
    for (let y = spec.domain[0]; y <= spec.domain[1] + 1e-9; y += step) {
      const vx = fx({ x, y, ...spec.parameters });
      const vy = fy({ x, y, ...spec.parameters });
      if (!Number.isFinite(vx) || !Number.isFinite(vy)) {
        continue;
      }
      const scale = 0.28;
      const from = dataToPixel(x, y, layout);
      const to = dataToPixel(x + vx * scale, y + vy * scale, layout);
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.lineTo(to[0], to[1]);
      ctx.stroke();
      drawArrowHead(ctx, from, to, 8);
    }
  }
  ctx.restore();
}

export function paintManimFrame(
  ctx: CanvasRenderingContext2D,
  layers: VisualizationSpec[],
  elapsedMs: number,
): void {
  const layout = axesRange(layers);
  const { axesOpacity, curveProgress } = clipTimeline(elapsedMs);
  ctx.fillStyle = MANIM_BG;
  ctx.fillRect(0, 0, MANIM_WIDTH, MANIM_HEIGHT);
  drawAxes(ctx, layout, axesOpacity);
  layers.forEach((spec, index) => {
    const color = MANIM_LAYER_COLORS[index % MANIM_LAYER_COLORS.length];
    if (spec.kind === "vector-field") {
      drawVectorField(ctx, spec, layout, axesOpacity * curveProgress, color);
      return;
    }
    const { polylines } = layerStrokes(spec, color);
    const total = polylines.reduce((sum, line) => sum + polylineLength(line), 0);
    let remaining = total * curveProgress;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const line of polylines) {
      const length = polylineLength(line);
      if (remaining <= 0) {
        break;
      }
      const drawn = prefixByLength(line, Math.min(remaining, length));
      drawPolyline(ctx, drawn, layout);
      remaining -= length;
    }
    ctx.restore();
  });
}

export async function recordManimStyleClip(
  layers: VisualizationSpec[],
  durationMs = CLIP_DURATION_MS,
  onProgress?: (ratio: number) => void,
): Promise<{ blob: Blob; extension: "webm" | "mp4" }> {
  if (layers.length === 0) {
    throw new Error("Nothing to film");
  }
  const mime = pickRecorderMime();
  const canvas = document.createElement("canvas");
  canvas.width = MANIM_WIDTH;
  canvas.height = MANIM_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not open a drawing surface");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const stream = canvas.captureStream(CLIP_FPS);
  const recorder = new MediaRecorder(stream, { mimeType: mime.mimeType, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Recording failed"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime.mimeType }));
  });
  recorder.start();
  const started = performance.now();
  const frameGap = 1000 / CLIP_FPS;
  while (performance.now() - started < durationMs) {
    const frameStart = performance.now();
    paintManimFrame(ctx, layers, performance.now() - started);
    onProgress?.(Math.min(1, (performance.now() - started) / durationMs));
    const wait = frameGap - (performance.now() - frameStart);
    if (wait > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, wait));
    }
  }
  if (recorder.state !== "inactive") {
    recorder.stop();
  }
  stream.getTracks().forEach((track) => track.stop());
  return { blob: await finished, extension: mime.extension };
}
