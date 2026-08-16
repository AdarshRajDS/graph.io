"use client";

import { layerColor, type VisualizationSpec } from "@math-vis/visualization-schema";

export function formatExpressionLine(spec: VisualizationSpec): string {
  if (spec.kind === "geometry") {
    return spec.shape;
  }
  if (spec.kind === "parametric-curve") {
    return `x = ${spec.expressionX},  y = ${spec.expressionY}`;
  }
  if (spec.kind === "vector-field") {
    return `P = ${spec.expressionX},  Q = ${spec.expressionY}`;
  }
  if (spec.kind === "polar-curve") {
    return `r = ${spec.expression}`;
  }
  if (spec.kind === "implicit-curve") {
    return `0 = ${spec.expression}`;
  }
  if (spec.kind === "surface") {
    return `z = ${spec.expression}`;
  }
  return `y = ${spec.expression}`;
}

export function Equation({ layers }: { layers: VisualizationSpec[] }) {
  return (
    <div className="equation" aria-label="Expressions">
      {layers.map((spec, index) => (
        <code className="equation-item" key={`${spec.kind}-${index}`} style={{ color: layerColor(index) }}>
          {formatExpressionLine(spec)}
        </code>
      ))}
    </div>
  );
}
