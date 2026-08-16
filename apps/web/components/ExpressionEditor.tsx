"use client";

import {
  ALLOWED_FUNCTIONS,
  geometryShapes,
  specWithUserExpressions,
  type GeometryShape,
  type VisualizationKind,
  type VisualizationSpec,
} from "@math-vis/visualization-schema";

export type Draft = {
  expression: string;
  expressionX: string;
  expressionY: string;
  shape: GeometryShape;
};

export function draftFromSpec(spec: VisualizationSpec): Draft {
  if (spec.kind === "geometry") {
    return { expression: "", expressionX: "", expressionY: "", shape: spec.shape };
  }
  if (spec.kind === "parametric-curve" || spec.kind === "vector-field") {
    return { expression: "", expressionX: spec.expressionX, expressionY: spec.expressionY, shape: "circle" };
  }
  return { expression: spec.expression, expressionX: "", expressionY: "", shape: "circle" };
}

function Field({
  label,
  ariaLabel,
  value,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="control">
      <span>{label}</span>
      <input
        type="text"
        spellCheck={false}
        autoComplete="off"
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function ExpressionEditor({
  spec,
  draft,
  error,
  onDraft,
}: {
  spec: VisualizationSpec;
  draft: Draft;
  error: string | null;
  onDraft: (draft: Draft) => void;
}) {
  if (spec.kind === "geometry") {
    return (
      <label className="control">
        <span>Shape</span>
        <select
          aria-label="Geometry shape"
          value={draft.shape}
          onChange={(event) => onDraft({ ...draft, shape: event.target.value as GeometryShape })}
        >
          {geometryShapes.map((shape) => (
            <option key={shape} value={shape}>
              {shape}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const hint = `Type a formula. Allowed: ${ALLOWED_FUNCTIONS.join(", ")}, pi, e, + - * / ^ **`;

  if (spec.kind === "function-2d" || spec.kind === "annotation") {
    return (
      <div className="expr-stack">
        <Field
          label="y(x)"
          ariaLabel="Function expression"
          value={draft.expression}
          onChange={(expression) => onDraft({ ...draft, expression })}
        />
        {error ? <p className="status error">{error}</p> : null}
        <p className="hint">{hint}</p>
      </div>
    );
  }

  if (spec.kind === "polar-curve") {
    return (
      <div className="expr-stack">
        <Field
          label="r(θ)  (use t for θ)"
          ariaLabel="Polar expression"
          value={draft.expression}
          onChange={(expression) => onDraft({ ...draft, expression })}
        />
        {error ? <p className="status error">{error}</p> : null}
        <p className="hint">{hint}</p>
      </div>
    );
  }

  if (spec.kind === "implicit-curve") {
    return (
      <div className="expr-stack">
        <Field
          label="F(x, y) = 0"
          ariaLabel="Implicit expression"
          value={draft.expression}
          onChange={(expression) => onDraft({ ...draft, expression })}
        />
        {error ? <p className="status error">{error}</p> : null}
        <p className="hint">{hint}</p>
      </div>
    );
  }

  if (spec.kind === "surface") {
    return (
      <div className="expr-stack">
        <Field
          label="z(x, y)"
          ariaLabel="Surface expression"
          value={draft.expression}
          onChange={(expression) => onDraft({ ...draft, expression })}
        />
        {error ? <p className="status error">{error}</p> : null}
        <p className="hint">Live view shows contour lines. {hint}</p>
      </div>
    );
  }

  const xLabel = spec.kind === "parametric-curve" ? "x(t)" : "P(x, y)";
  const yLabel = spec.kind === "parametric-curve" ? "y(t)" : "Q(x, y)";
  return (
    <div className="expr-stack">
      <Field
        label={xLabel}
        ariaLabel="X expression"
        value={draft.expressionX}
        onChange={(expressionX) => onDraft({ ...draft, expressionX })}
      />
      <Field
        label={yLabel}
        ariaLabel="Y expression"
        value={draft.expressionY}
        onChange={(expressionY) => onDraft({ ...draft, expressionY })}
      />
      {error ? <p className="status error">{error}</p> : null}
      <p className="hint">{hint}</p>
    </div>
  );
}

export function trySpecFromDraft(
  kind: VisualizationKind,
  draft: Draft,
  parameters: Record<string, number>,
): { spec: VisualizationSpec; error: null } | { spec: null; error: string } {
  try {
    return {
      spec: specWithUserExpressions(
        kind,
        {
          expression: draft.expression,
          expressionX: draft.expressionX,
          expressionY: draft.expressionY,
          shape: draft.shape,
        },
        parameters,
      ),
      error: null,
    };
  } catch (caught) {
    return {
      spec: null,
      error: caught instanceof Error ? caught.message : "That formula is not allowed",
    };
  }
}
