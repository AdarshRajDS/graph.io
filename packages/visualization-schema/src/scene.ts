import { z } from "zod";

import { parseVisualizationSpec, visualizationSpecSchema, type VisualizationSpec } from "./spec";

export const MAX_LAYERS = 8;

export const LAYER_COLORS = [
  "oklch(0.48 0.16 32)",
  "oklch(0.46 0.12 250)",
  "oklch(0.48 0.11 150)",
  "oklch(0.52 0.13 80)",
  "oklch(0.48 0.13 320)",
  "oklch(0.44 0.1 200)",
  "oklch(0.42 0.08 20)",
  "oklch(0.4 0.1 280)",
] as const;

export const sceneDocumentSchema = z.object({
  version: z.literal(1),
  layers: z.array(visualizationSpecSchema).min(1).max(MAX_LAYERS),
});

export type SceneDocument = {
  version: 1;
  layers: VisualizationSpec[];
};

export function layerColor(index: number): string {
  return LAYER_COLORS[index % LAYER_COLORS.length];
}

export function parseSceneDocument(value: unknown): SceneDocument {
  if (value && typeof value === "object" && "layers" in value) {
    const parsed = sceneDocumentSchema.parse(value);
    return {
      version: 1,
      layers: parsed.layers.map((layer) => parseVisualizationSpec(layer)),
    };
  }
  return { version: 1, layers: [parseVisualizationSpec(value)] };
}

export function sceneFromLayers(layers: VisualizationSpec[]): SceneDocument {
  if (layers.length < 1 || layers.length > MAX_LAYERS) {
    throw new Error("Layer count is invalid");
  }
  return { version: 1, layers: layers.map((layer) => parseVisualizationSpec(layer)) };
}
