import {
  defaultSpecForKind,
  parseSceneDocument,
  specWithUserExpressions,
  visualizationKinds,
  type GeometryShape,
  type VisualizationKind,
  type VisualizationSpec,
} from "@math-vis/visualization-schema";

export const URL_SCHEMA_VERSION = "1";
const URL_SCHEMA_PARAM = "schema";

const RESERVED_QUERY_KEYS = new Set([
  URL_SCHEMA_PARAM,
  "kind",
  "expr",
  "exprX",
  "exprY",
  "shape",
  "layers",
  "sel",
]);

export type SceneUrlState = {
  layers: VisualizationSpec[];
  selected: number;
  notice: string | null;
};

function numberParam(value: string | null, fallback: number): number {
  if (value === null) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < -50 || parsed > 50) {
    return fallback;
  }
  return parsed;
}

function parametersFromUrl(params: URLSearchParams): Record<string, number> {
  const parameters: Record<string, number> = {};
  for (const [key, value] of params.entries()) {
    if (/^[a-z]$/.test(key) && !RESERVED_QUERY_KEYS.has(key)) {
      parameters[key] = numberParam(value, 1);
    }
  }
  return parameters;
}

function isKind(value: string | null): value is VisualizationKind {
  return visualizationKinds.includes(value as VisualizationKind);
}

function unsupportedVersionNotice(version: string | null): string | null {
  if (version === null || version === URL_SCHEMA_VERSION) {
    return null;
  }
  return `This share link uses schema version ${version}, which is not supported. Showing a default graph instead.`;
}

function recoveredScene(notice: string): SceneUrlState {
  return { layers: [defaultSpecForKind("function-2d")], selected: 0, notice };
}

export function specFromSearchParams(params: URLSearchParams): VisualizationSpec {
  const rawKind = params.get("kind");
  const kind: VisualizationKind = isKind(rawKind) ? rawKind : "function-2d";
  try {
    if (kind === "geometry") {
      return specWithUserExpressions(
        kind,
        { shape: (params.get("shape") as GeometryShape) || "circle" },
        parametersFromUrl(params),
      );
    }
    if (kind === "parametric-curve" || kind === "vector-field") {
      const fallback = defaultSpecForKind(kind);
      if (fallback.kind !== "parametric-curve" && fallback.kind !== "vector-field") {
        return fallback;
      }
      return specWithUserExpressions(
        kind,
        {
          expressionX: params.get("exprX") ?? fallback.expressionX,
          expressionY: params.get("exprY") ?? fallback.expressionY,
        },
        parametersFromUrl(params),
      );
    }
    const fallback = defaultSpecForKind(kind);
    if (!("expression" in fallback)) {
      return fallback;
    }
    return specWithUserExpressions(
      kind,
      { expression: params.get("expr") ?? fallback.expression },
      parametersFromUrl(params),
    );
  } catch {
    return defaultSpecForKind(kind);
  }
}

export function specToSearchParams(spec: VisualizationSpec): URLSearchParams {
  const params = new URLSearchParams();
  params.set(URL_SCHEMA_PARAM, URL_SCHEMA_VERSION);
  params.set("kind", spec.kind);
  if (spec.kind === "geometry") {
    params.set("shape", spec.shape);
  } else if (spec.kind === "parametric-curve" || spec.kind === "vector-field") {
    params.set("exprX", spec.expressionX);
    params.set("exprY", spec.expressionY);
  } else {
    params.set("expr", spec.expression);
  }
  for (const [key, value] of Object.entries(spec.parameters)) {
    params.set(key, String(value));
  }
  return params;
}

export function sceneFromSearchParams(params: URLSearchParams): SceneUrlState {
  const versionNotice = unsupportedVersionNotice(params.get(URL_SCHEMA_PARAM));
  if (versionNotice) {
    return recoveredScene(versionNotice);
  }
  const raw = params.get("layers");
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      const scene = parseSceneDocument({ version: 1, layers: parsed });
      const selected = Number(params.get("sel") ?? 0);
      const index = Number.isInteger(selected) ? Math.min(scene.layers.length - 1, Math.max(0, selected)) : 0;
      return { layers: scene.layers, selected: index, notice: null };
    } catch {
      return recoveredScene("That share link was damaged. Showing a default graph instead.");
    }
  }
  return { layers: [specFromSearchParams(params)], selected: 0, notice: null };
}

export function sceneToSearchParams(layers: VisualizationSpec[], selected: number): URLSearchParams {
  if (layers.length <= 1) {
    return specToSearchParams(layers[0] ?? defaultSpecForKind("function-2d"));
  }
  const params = new URLSearchParams();
  params.set(URL_SCHEMA_PARAM, URL_SCHEMA_VERSION);
  params.set("layers", JSON.stringify(layers));
  params.set("sel", String(selected));
  return params;
}

export function sceneHref(pathname: string, layers: VisualizationSpec[], selected: number): string {
  const query = sceneToSearchParams(layers, selected).toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function applySceneSearch(href: string, layers: VisualizationSpec[], selected: number): string {
  const url = new URL(href, "https://adarshrajds.github.io");
  url.search = sceneToSearchParams(layers, selected).toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

export function replaceSceneUrl(layers: VisualizationSpec[], selected: number): void {
  const href = applySceneSearch(window.location.href, layers, selected);
  window.history.replaceState(window.history.state, "", href);
}
