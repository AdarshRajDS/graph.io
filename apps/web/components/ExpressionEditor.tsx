"use client";

import katex from "katex";
import { useMemo, useState } from "react";

import {
  ALLOWED_FUNCTIONS,
  astToLatex,
  geometryShapes,
  parseExpression,
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

const INSERTS = [
  { label: "sin", text: "sin(" },
  { label: "cos", text: "cos(" },
  { label: "π", text: "pi" },
  { label: "x²", text: "^2" },
  { label: "√", text: "sqrt(" },
  { label: "|x|", text: "abs(" },
  { label: "÷", text: "/" },
];

function Field({
  label,
  ariaLabel,
  value,
  error,
  names,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  error: string | null;
  names: string[];
  onChange: (value: string) => void;
}) {
  const preview = useMemo(() => latexPreview(value, names), [value, names]);
  return (
    <label className="control">
      <span>{label}</span>
      <input
        type="text"
        spellCheck={false}
        autoComplete="off"
        list="formula-fns"
        aria-label={ariaLabel}
        aria-invalid={error !== null}
        aria-describedby={error ? "formula-error" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {preview ? <div className="katex-preview" aria-hidden="true" dangerouslySetInnerHTML={{ __html: preview }} /> : null}
    </label>
  );
}

function FormulaError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }
  return (
    <p className="status error" id="formula-error" role="alert">
      {error}
    </p>
  );
}

function latexPreview(source: string, names: string[]): string | null {
  try {
    const html = katex.renderToString(astToLatex(parseExpression(source, names)), {
      throwOnError: false,
      displayMode: false,
    });
    return html;
  } catch {
    return null;
  }
}

export function ExpressionEditor({
  spec,
  draft,
  error,
  locked,
  onDraft,
}: {
  spec: VisualizationSpec;
  draft: Draft;
  error: string | null;
  locked?: boolean;
  onDraft: (draft: Draft) => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const names = ["x", "y", "t", ...Object.keys(spec.parameters)];

  function insert(text: string) {
    if (spec.kind === "parametric-curve" || spec.kind === "vector-field") {
      onDraft({ ...draft, expressionX: `${draft.expressionX}${text}` });
      return;
    }
    onDraft({ ...draft, expression: `${draft.expression}${text}` });
  }

  if (spec.kind === "geometry") {
    return (
      <label className="control">
        <span>Shape</span>
        <select
          aria-label="Geometry shape"
          value={draft.shape}
          disabled={locked}
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

  const fields =
    spec.kind === "parametric-curve" || spec.kind === "vector-field" ? (
      <>
        <Field
          label={spec.kind === "parametric-curve" ? "x(t)" : "P(x, y)"}
          ariaLabel="X expression"
          value={draft.expressionX}
          error={error}
          names={names}
          onChange={(expressionX) => onDraft({ ...draft, expressionX })}
        />
        <Field
          label={spec.kind === "parametric-curve" ? "y(t)" : "Q(x, y)"}
          ariaLabel="Y expression"
          value={draft.expressionY}
          error={error}
          names={names}
          onChange={(expressionY) => onDraft({ ...draft, expressionY })}
        />
      </>
    ) : (
      <Field
        label={
          spec.kind === "polar-curve"
            ? "r(θ)  (use t for θ)"
            : spec.kind === "implicit-curve"
              ? "F(x, y) = 0"
              : spec.kind === "surface"
                ? "z(x, y)"
                : "y(x)"
        }
        ariaLabel={
          spec.kind === "polar-curve"
            ? "Polar expression"
            : spec.kind === "implicit-curve"
              ? "Implicit expression"
              : spec.kind === "surface"
                ? "Surface expression"
                : "Function expression"
        }
        value={draft.expression}
        error={error}
        names={names}
        onChange={(expression) => onDraft({ ...draft, expression })}
      />
    );

  return (
    <div className="expr-stack">
      <datalist id="formula-fns">
        {ALLOWED_FUNCTIONS.map((name) => (
          <option key={name} value={`${name}(`} />
        ))}
      </datalist>
      <fieldset className="insert-palette" disabled={locked}>
        <legend className="visually-hidden">Insert math</legend>
        {INSERTS.map((item) => (
          <button key={item.label} type="button" className="chip" onClick={() => insert(item.text)}>
            {item.label}
          </button>
        ))}
      </fieldset>
      {fields}
      <FormulaError error={error} />
      {spec.kind === "surface" ? <p className="hint">Live view is a 2D contour preview until a 3D viewport is selected.</p> : null}
      <button className="text-link" type="button" onClick={() => setHelpOpen((value) => !value)}>
        {helpOpen ? "Hide expression grammar" : "Expression grammar"}
      </button>
      {helpOpen ? (
        <p className="hint">
          Allowed: {ALLOWED_FUNCTIONS.join(", ")}, pi, e, + - * / ^ **. Implicit multiplication is allowed, for example 2x
          or 3(x+1).
        </p>
      ) : null}
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
