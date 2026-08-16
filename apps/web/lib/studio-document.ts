import { KIND_LABELS, defaultSpecForKind, type VisualizationKind, type VisualizationSpec } from "@math-vis/visualization-schema";

export type StudioLayer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  spec: VisualizationSpec;
};

export type ParamMeta = {
  min: number;
  max: number;
  step: number;
  animate: boolean;
};

export type StudioDocument = {
  title: string;
  layers: StudioLayer[];
  selected: number;
  grid: boolean;
  loop: boolean;
  speed: number;
  paramMeta: Record<string, ParamMeta>;
};

export function createLayerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `layer-${Math.random().toString(36).slice(2, 10)}`;
}

export function layerFromSpec(spec: VisualizationSpec, index = 0): StudioLayer {
  return {
    id: createLayerId(),
    name: `${KIND_LABELS[spec.kind]} ${index + 1}`,
    visible: true,
    locked: false,
    spec,
  };
}

export function documentFromSpecs(layers: VisualizationSpec[], selected = 0): StudioDocument {
  return {
    title: "Untitled graph",
    layers: layers.map((spec, index) => layerFromSpec(spec, index)),
    selected,
    grid: true,
    loop: true,
    speed: 1,
    paramMeta: {},
  };
}

export function defaultStudioDocument(): StudioDocument {
  return documentFromSpecs([defaultSpecForKind("function-2d")], 0);
}

export function visibleSpecs(document: StudioDocument): VisualizationSpec[] {
  return document.layers.filter((layer) => layer.visible).map((layer) => layer.spec);
}

export function selectedLayer(document: StudioDocument): StudioLayer {
  return document.layers[document.selected] ?? document.layers[0];
}

export function defaultParamMeta(value: number): ParamMeta {
  const span = Math.max(2, Math.abs(value) * 2);
  return {
    min: Math.max(-50, value - span),
    max: Math.min(50, value + span),
    step: 0.1,
    animate: false,
  };
}

export function graphSummary(document: StudioDocument): string {
  const kinds = document.layers.map((layer) => KIND_LABELS[layer.spec.kind]).join(", ");
  const spec = selectedLayer(document).spec;
  const params = Object.entries(spec.parameters)
    .map(([name, value]) => `${name}=${value}`)
    .join(", ");
  return `${document.layers.length} layer${document.layers.length === 1 ? "" : "s"}: ${kinds}. Selected parameters: ${params || "none"}.`;
}

export const STORAGE_KEY = "graph-io.studio.v1";
export const RECENTS_KEY = "graph-io.recents.v1";

export function saveLocalDocument(document: StudioDocument): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
    const recents = loadRecentDocuments().filter((item) => item.title !== document.title);
    recents.unshift({ title: document.title, savedAt: Date.now() });
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, 8)));
  } catch {
    /* ignore quota */
  }
}

export function loadLocalDocument(): StudioDocument | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StudioDocument;
    if (!parsed?.layers?.length) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadRecentDocuments(): Array<{ title: string; savedAt: number }> {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as Array<{ title: string; savedAt: number }>) : [];
  } catch {
    return [];
  }
}

export function animatedParameters(
  spec: VisualizationSpec,
  meta: Record<string, ParamMeta>,
  phase: number,
): Record<string, number> {
  const next = { ...spec.parameters };
  for (const [name, value] of Object.entries(spec.parameters)) {
    const item = meta[name];
    if (!item?.animate) {
      continue;
    }
    const t = (Math.sin(phase) + 1) / 2;
    next[name] = item.min + (item.max - item.min) * t;
  }
  return next;
}

export function applyAnimatedSpecs(document: StudioDocument, phase: number): VisualizationSpec[] {
  return document.layers
    .filter((layer) => layer.visible)
    .map((layer) => ({
      ...layer.spec,
      parameters: animatedParameters(layer.spec, document.paramMeta, phase),
    }));
}

export const KIND_SEARCH_HINT: Record<VisualizationKind, string> = {
  "function-2d": "Function",
  "parametric-curve": "Parametric",
  "polar-curve": "Polar",
  "implicit-curve": "Implicit",
  "vector-field": "Vector field",
  surface: "Surface contours",
  geometry: "Geometry",
  annotation: "Formula label",
};
