"use client";

import { Circle, Coordinates, Ellipse, Mafs, Plot, Point, Polygon, Polyline } from "mafs";
import type { ReactNode } from "react";

import {
  compileExpression,
  layerColor,
  type GeometrySpec,
  type VisualizationSpec,
} from "@math-vis/visualization-schema";

import { SurfacePreview } from "@/components/SurfacePreview";
import { contourPolylines } from "@/lib/contour";

type Props = {
  layers: VisualizationSpec[];
  phase: number;
  viewKey: number;
  zoom?: number;
  grid?: boolean;
};

export function PlotCanvas({ layers, phase, viewKey, zoom = 1, grid = true }: Props) {
  const first = layers[0];
  if (layers.length === 1 && first?.kind === "surface") {
    return <SurfacePreview spec={first} phase={phase} viewKey={viewKey} />;
  }
  return (
    <Frame viewKey={viewKey} viewBox={scaleView(viewBoxFor(layers), zoom)} grid={grid}>
      {layers.map((spec, index) => (
        <LayerGlyph key={`${spec.kind}-${index}`} spec={spec} phase={phase} color={layerColor(index)} />
      ))}
    </Frame>
  );
}

function scaleView(
  viewBox: { x: [number, number]; y: [number, number] },
  zoom: number,
): { x: [number, number]; y: [number, number] } {
  const cx = (viewBox.x[0] + viewBox.x[1]) / 2;
  const cy = (viewBox.y[0] + viewBox.y[1]) / 2;
  const hx = (viewBox.x[1] - viewBox.x[0]) / (2 * zoom);
  const hy = (viewBox.y[1] - viewBox.y[0]) / (2 * zoom);
  return { x: [cx - hx, cx + hx], y: [cy - hy, cy + hy] };
}

function viewBoxFor(layers: VisualizationSpec[]): { x: [number, number]; y: [number, number] } {
  if (layers.length !== 1) {
    return { x: [-8, 8], y: [-5, 5] };
  }
  const spec = layers[0];
  if (spec.kind === "function-2d" || spec.kind === "annotation") {
    return { x: spec.domain, y: [-5, 5] };
  }
  if (spec.kind === "parametric-curve" || spec.kind === "polar-curve") {
    return { x: [-5, 5], y: [-5, 5] };
  }
  return { x: spec.domain, y: spec.domain };
}

function LayerGlyph({ spec, phase, color }: { spec: VisualizationSpec; phase: number; color: string }) {
  if (spec.kind === "function-2d" || spec.kind === "annotation") {
    const fn = compileExpression(spec.expression, ["x", ...Object.keys(spec.parameters)]);
    return (
      <Plot.OfX
        y={(x) => fn({ x: x + phase, ...spec.parameters })}
        color={color}
        weight={3}
        svgPathProps={{ strokeLinecap: "round" }}
      />
    );
  }
  if (spec.kind === "parametric-curve") {
    const fx = compileExpression(spec.expressionX, ["t", ...Object.keys(spec.parameters)]);
    const fy = compileExpression(spec.expressionY, ["t", ...Object.keys(spec.parameters)]);
    return (
      <Plot.Parametric
        xy={(t) => [fx({ t, ...spec.parameters }), fy({ t, ...spec.parameters })]}
        t={spec.domain}
        color={color}
        weight={3}
        svgPathProps={{ strokeLinecap: "round" }}
      />
    );
  }
  if (spec.kind === "polar-curve") {
    const fr = compileExpression(spec.expression, ["t", ...Object.keys(spec.parameters)]);
    return (
      <Plot.Parametric
        xy={(t) => {
          const r = fr({ t, ...spec.parameters });
          return [r * Math.cos(t), r * Math.sin(t)];
        }}
        t={spec.domain}
        color={color}
        weight={3}
        svgPathProps={{ strokeLinecap: "round" }}
      />
    );
  }
  if (spec.kind === "implicit-curve" || spec.kind === "surface") {
    const fn = compileExpression(spec.expression, ["x", "y", ...Object.keys(spec.parameters)]);
    const levels = spec.kind === "surface" ? [-2, -1, 0, 1, 2] : [0];
    return (
      <>
        {levels.flatMap((level) =>
          contourPolylines((x, y) => fn({ x, y, ...spec.parameters }), spec.domain, spec.kind === "surface" ? 28 : 36, level).map(
            (points, index) => <Polyline key={`${level}-${index}`} points={points} color={color} weight={spec.kind === "surface" ? 1.5 : 3} />,
          ),
        )}
      </>
    );
  }
  if (spec.kind === "geometry") {
    return <GeometryPlot spec={spec} color={color} />;
  }
  const fx = compileExpression(spec.expressionX, ["x", "y", ...Object.keys(spec.parameters)]);
  const fy = compileExpression(spec.expressionY, ["x", "y", ...Object.keys(spec.parameters)]);
  return (
    <Plot.VectorField
      xy={([x, y]) => [fx({ x, y, ...spec.parameters }), fy({ x, y, ...spec.parameters })]}
      step={0.75}
    />
  );
}

function Frame({
  children,
  viewKey,
  viewBox,
  grid,
}: {
  children: ReactNode;
  viewKey: number;
  viewBox: { x: [number, number]; y: [number, number] };
  grid: boolean;
}) {
  return (
    <div className="canvas-wrap">
      <div className="canvas-stage">
        <Mafs key={`${viewKey}-${grid}`} viewBox={viewBox} zoom pan>
          {grid ? <Coordinates.Cartesian subdivisions={2} /> : null}
          {children}
        </Mafs>
      </div>
    </div>
  );
}

function GeometryPlot({ spec, color }: { spec: GeometrySpec; color: string }) {
  const p = spec.parameters;
  const r = Math.max(0.15, Math.abs(p.r ?? 2));
  const a = Math.max(0.15, Math.abs(p.a ?? 2));
  const b = Math.max(0.15, Math.abs(p.b ?? 1.5));
  if (spec.shape === "circle") {
    return <Circle center={[0, 0]} radius={r} color={color} strokeOpacity={1} fillOpacity={0.08} />;
  }
  if (spec.shape === "ellipse") {
    return <Ellipse center={[0, 0]} radius={[a, b]} color={color} strokeOpacity={1} fillOpacity={0.08} />;
  }
  if (spec.shape === "square") {
    return <Polygon points={[[-a, -a], [a, -a], [a, a], [-a, a]]} color={color} fillOpacity={0.08} />;
  }
  if (spec.shape === "rectangle") {
    return <Polygon points={[[-a, -b], [a, -b], [a, b], [-a, b]]} color={color} fillOpacity={0.08} />;
  }
  if (spec.shape === "triangle") {
    return <Polygon points={[[0, a], [-a, -a], [a, -a]]} color={color} fillOpacity={0.08} />;
  }
  if (spec.shape === "polygon") {
    const n = Math.max(3, Math.min(12, Math.round(p.n ?? 6)));
    const points: Array<[number, number]> = [];
    for (let i = 0; i < n; i += 1) {
      const t = (i / n) * Math.PI * 2 - Math.PI / 2;
      points.push([a * Math.cos(t), a * Math.sin(t)]);
    }
    return <Polygon points={points} color={color} fillOpacity={0.08} />;
  }
  if (spec.shape === "line") {
    return <Polyline points={[[-a, 0], [a, 0]]} color={color} weight={3} />;
  }
  if (spec.shape === "arc") {
    const points: Array<[number, number]> = [];
    for (let i = 0; i <= 24; i += 1) {
      const t = (i / 24) * Math.PI;
      points.push([r * Math.cos(t), r * Math.sin(t)]);
    }
    return <Polyline points={points} color={color} weight={3} />;
  }
  if (spec.shape === "annulus") {
    return (
      <>
        <Circle center={[0, 0]} radius={b} color={color} fillOpacity={0.08} />
        <Circle center={[0, 0]} radius={a} color={color} fillOpacity={0} />
      </>
    );
  }
  return <Point x={0} y={0} color={color} />;
}
