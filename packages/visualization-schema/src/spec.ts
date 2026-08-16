import { z } from "zod";

import {
  ALLOWED_CONSTANTS,
  ExpressionSyntaxError,
  MAX_EXPRESSION_LENGTH,
  PARAM_MAX,
  PARAM_MIN,
  collectNames,
  parseExpression,
} from "./parser";

export const visualizationKinds = [
  "function-2d",
  "parametric-curve",
  "polar-curve",
  "implicit-curve",
  "vector-field",
  "surface",
  "geometry",
  "annotation",
] as const;
export type VisualizationKind = (typeof visualizationKinds)[number];

export const geometryShapes = [
  "circle",
  "ellipse",
  "square",
  "rectangle",
  "triangle",
  "polygon",
  "line",
  "arc",
  "annulus",
  "dot",
] as const;
export type GeometryShape = (typeof geometryShapes)[number];

const parameterValue = z.number().min(PARAM_MIN).max(PARAM_MAX).finite();
const parametersSchema = z
  .record(z.string().regex(/^[a-z]$/), parameterValue)
  .refine((value) => Object.keys(value).length <= 8, "Too many parameters");

const domainSchema = z.tuple([z.number().finite(), z.number().finite()]).refine(
  ([start, end]) => start < end && end - start <= 40,
  "Domain must be an increasing interval of length <= 40",
);

const baseSpec = {
  version: z.literal(1),
  parameters: parametersSchema,
  theme: z.enum(["dark", "light"]).default("dark"),
};

export const function2dSpecSchema = z.object({
  ...baseSpec,
  kind: z.literal("function-2d"),
  expression: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
  domain: domainSchema.default([-10, 10]),
});

export const parametricCurveSpecSchema = z.object({
  ...baseSpec,
  kind: z.literal("parametric-curve"),
  expressionX: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
  expressionY: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
  domain: domainSchema.default([0, 6.283185307179586]),
});

export const polarCurveSpecSchema = z.object({
  ...baseSpec,
  kind: z.literal("polar-curve"),
  expression: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
  domain: domainSchema.default([0, 6.283185307179586]),
});

export const implicitCurveSpecSchema = z.object({
  ...baseSpec,
  kind: z.literal("implicit-curve"),
  expression: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
  domain: domainSchema.default([-4, 4]),
});

export const vectorFieldSpecSchema = z.object({
  ...baseSpec,
  kind: z.literal("vector-field"),
  expressionX: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
  expressionY: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
  domain: domainSchema.default([-4, 4]),
});

export const surfaceSpecSchema = z.object({
  ...baseSpec,
  kind: z.literal("surface"),
  expression: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
  domain: domainSchema.default([-3, 3]),
});

export const geometrySpecSchema = z.object({
  ...baseSpec,
  kind: z.literal("geometry"),
  shape: z.enum(geometryShapes),
  domain: domainSchema.default([-5, 5]),
});

export const annotationSpecSchema = z.object({
  ...baseSpec,
  kind: z.literal("annotation"),
  expression: z.string().min(1).max(MAX_EXPRESSION_LENGTH),
  domain: domainSchema.default([-10, 10]),
});

export const visualizationSpecSchema = z.discriminatedUnion("kind", [
  function2dSpecSchema,
  parametricCurveSpecSchema,
  polarCurveSpecSchema,
  implicitCurveSpecSchema,
  vectorFieldSpecSchema,
  surfaceSpecSchema,
  geometrySpecSchema,
  annotationSpecSchema,
]);

export type Function2dSpec = z.infer<typeof function2dSpecSchema>;
export type ParametricCurveSpec = z.infer<typeof parametricCurveSpecSchema>;
export type PolarCurveSpec = z.infer<typeof polarCurveSpecSchema>;
export type ImplicitCurveSpec = z.infer<typeof implicitCurveSpecSchema>;
export type VectorFieldSpec = z.infer<typeof vectorFieldSpecSchema>;
export type SurfaceSpec = z.infer<typeof surfaceSpecSchema>;
export type GeometrySpec = z.infer<typeof geometrySpecSchema>;
export type AnnotationSpec = z.infer<typeof annotationSpecSchema>;
export type VisualizationSpec = z.infer<typeof visualizationSpecSchema>;

function assertExpressions(spec: VisualizationSpec): VisualizationSpec {
  if (spec.kind === "geometry") {
    return spec;
  }
  if (spec.kind === "function-2d" || spec.kind === "annotation") {
    parseExpression(spec.expression, ["x", ...Object.keys(spec.parameters)]);
    return spec;
  }
  if (spec.kind === "polar-curve") {
    parseExpression(spec.expression, ["t", ...Object.keys(spec.parameters)]);
    return spec;
  }
  if (spec.kind === "implicit-curve" || spec.kind === "surface") {
    parseExpression(spec.expression, ["x", "y", ...Object.keys(spec.parameters)]);
    return spec;
  }
  const allowed =
    spec.kind === "parametric-curve" ? ["t", ...Object.keys(spec.parameters)] : ["x", "y", ...Object.keys(spec.parameters)];
  parseExpression(spec.expressionX, allowed);
  parseExpression(spec.expressionY, allowed);
  return spec;
}

export const defaultFunction2dSpec: Function2dSpec = {
  version: 1,
  kind: "function-2d",
  expression: "a * sin(b * x)",
  domain: [-10, 10],
  parameters: { a: 1, b: 2 },
  theme: "dark",
};

export const defaultParametricSpec: ParametricCurveSpec = {
  version: 1,
  kind: "parametric-curve",
  expressionX: "a * cos(t)",
  expressionY: "a * sin(t)",
  domain: [0, 6.283185307179586],
  parameters: { a: 2 },
  theme: "dark",
};

export const defaultPolarSpec: PolarCurveSpec = {
  version: 1,
  kind: "polar-curve",
  expression: "a * (1 - cos(t))",
  domain: [0, 6.283185307179586],
  parameters: { a: 2 },
  theme: "dark",
};

export const defaultImplicitSpec: ImplicitCurveSpec = {
  version: 1,
  kind: "implicit-curve",
  expression: "x^2 + y^2 - r^2",
  domain: [-4, 4],
  parameters: { r: 2 },
  theme: "dark",
};

export const defaultVectorFieldSpec: VectorFieldSpec = {
  version: 1,
  kind: "vector-field",
  expressionX: "-b * y",
  expressionY: "b * x",
  domain: [-4, 4],
  parameters: { b: 1 },
  theme: "dark",
};

export const defaultSurfaceSpec: SurfaceSpec = {
  version: 1,
  kind: "surface",
  expression: "x^2 + y^2",
  domain: [-3, 3],
  parameters: {},
  theme: "dark",
};

export const defaultGeometrySpec: GeometrySpec = {
  version: 1,
  kind: "geometry",
  shape: "circle",
  domain: [-5, 5],
  parameters: { r: 2 },
  theme: "dark",
};

export const defaultAnnotationSpec: AnnotationSpec = {
  version: 1,
  kind: "annotation",
  expression: "sin(x)",
  domain: [-10, 10],
  parameters: {},
  theme: "dark",
};

export const independentNames: Record<VisualizationKind, readonly string[]> = {
  "function-2d": ["x"],
  "parametric-curve": ["t"],
  "polar-curve": ["t"],
  "implicit-curve": ["x", "y"],
  "vector-field": ["x", "y"],
  surface: ["x", "y"],
  geometry: [],
  annotation: ["x"],
};

export function defaultSpecForKind(kind: VisualizationKind): VisualizationSpec {
  switch (kind) {
    case "parametric-curve":
      return defaultParametricSpec;
    case "polar-curve":
      return defaultPolarSpec;
    case "implicit-curve":
      return defaultImplicitSpec;
    case "vector-field":
      return defaultVectorFieldSpec;
    case "surface":
      return defaultSurfaceSpec;
    case "geometry":
      return defaultGeometrySpec;
    case "annotation":
      return defaultAnnotationSpec;
    default:
      return defaultFunction2dSpec;
  }
}

const LETTER_NAMES = "abcdefghijklmnopqrstuvwxyz".split("");
const CONSTANT_NAMES = new Set<string>(ALLOWED_CONSTANTS);

export type UserExpressionFields = {
  expression?: string;
  expressionX?: string;
  expressionY?: string;
  shape?: GeometryShape;
};

function clampParameter(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 1;
  }
  return Math.min(PARAM_MAX, Math.max(PARAM_MIN, value));
}

function parametersFromSources(
  kind: VisualizationKind,
  sources: string[],
  previous: Record<string, number>,
): Record<string, number> {
  const independent = new Set(independentNames[kind]);
  const allowed = [...independent, ...LETTER_NAMES];
  const used = new Set<string>();
  for (const source of sources) {
    const ast = parseExpression(source, allowed);
    for (const name of collectNames(ast)) {
      if (!independent.has(name) && !CONSTANT_NAMES.has(name)) {
        used.add(name);
      }
    }
  }
  if (used.size > 8) {
    throw new ExpressionSyntaxError("Too many parameters");
  }
  const parameters: Record<string, number> = {};
  for (const name of [...used].sort()) {
    parameters[name] = clampParameter(previous[name]);
  }
  return parameters;
}

export function specWithUserExpressions(
  kind: VisualizationKind,
  fields: UserExpressionFields,
  previousParameters: Record<string, number> = {},
): VisualizationSpec {
  if (kind === "geometry") {
    return parseVisualizationSpec({
      ...defaultGeometrySpec,
      shape: fields.shape ?? defaultGeometrySpec.shape,
      parameters: previousParameters,
    });
  }
  if (kind === "function-2d" || kind === "polar-curve" || kind === "implicit-curve" || kind === "surface" || kind === "annotation") {
    const expression = fields.expression ?? "";
    const parameters = parametersFromSources(kind, [expression], previousParameters);
    return parseVisualizationSpec({
      ...defaultSpecForKind(kind),
      expression,
      parameters,
    });
  }
  const expressionX = fields.expressionX ?? "";
  const expressionY = fields.expressionY ?? "";
  const parameters = parametersFromSources(kind, [expressionX, expressionY], previousParameters);
  return parseVisualizationSpec({
    ...defaultSpecForKind(kind),
    expressionX,
    expressionY,
    parameters,
  });
}

export function parseVisualizationSpec(value: unknown): VisualizationSpec {
  return assertExpressions(visualizationSpecSchema.parse(value));
}

export function safeParseVisualizationSpec(value: unknown) {
  const result = visualizationSpecSchema.safeParse(value);
  if (!result.success) {
    return result;
  }
  try {
    assertExpressions(result.data);
    return result;
  } catch (error) {
    return {
      success: false as const,
      error: {
        issues: [{ message: error instanceof Error ? error.message : "Invalid expression" }],
      },
    };
  }
}
