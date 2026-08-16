"use client";

import { useEffect, useId, useState } from "react";

import { PARAM_MAX, PARAM_MIN } from "@math-vis/visualization-schema";

import type { ParamMeta } from "@/lib/studio-document";

export type ParameterParseResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

export function parseParameterDraft(text: string): ParameterParseResult {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { ok: false, message: "Enter a finite number." };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: "Enter a finite number." };
  }
  if (parsed < PARAM_MIN || parsed > PARAM_MAX) {
    return { ok: false, message: `Use a number between ${PARAM_MIN} and ${PARAM_MAX}.` };
  }
  return { ok: true, value: parsed };
}

export function ParameterField({
  name,
  value,
  meta,
  onChange,
  onMetaChange,
  onValidityChange,
}: {
  name: string;
  value: number;
  meta: ParamMeta;
  onChange: (value: number) => void;
  onMetaChange: (meta: ParamMeta) => void;
  onValidityChange?: (valid: boolean) => void;
}) {
  const [text, setText] = useState(String(value));
  const [advanced, setAdvanced] = useState(false);
  const errorId = useId();
  const parsed = parseParameterDraft(text);
  const invalid = !parsed.ok;

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(next: string) {
    setText(next);
    const result = parseParameterDraft(next);
    onValidityChange?.(result.ok);
    if (result.ok) {
      onChange(result.value);
    }
  }

  return (
    <fieldset className="param-card">
      <legend>{name}</legend>
      <label className="control">
        <span className="visually-hidden">{name} value</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-label={`${name} value`}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          placeholder="1"
          value={text}
          onChange={(event) => commit(event.target.value)}
        />
      </label>
      <input
        type="range"
        min={meta.min}
        max={meta.max}
        step={meta.step}
        aria-label={`${name} slider`}
        value={Math.min(meta.max, Math.max(meta.min, value))}
        onChange={(event) => {
          const next = Number(event.target.value);
          setText(String(next));
          onValidityChange?.(true);
          onChange(next);
        }}
      />
      {invalid ? (
        <p className="status error" id={errorId}>
          {parsed.message}
        </p>
      ) : null}
      <div className="row">
        <label className="inline">
          <input
            type="checkbox"
            checked={meta.animate}
            onChange={(event) => onMetaChange({ ...meta, animate: event.target.checked })}
          />
          Animate
        </label>
        <button type="button" className="text-link" onClick={() => onChange(1)}>
          Reset value
        </button>
        <button type="button" className="text-link" onClick={() => setAdvanced((value) => !value)}>
          Range
        </button>
      </div>
      {advanced ? (
        <div className="row">
          <label className="control tight">
            <span>min</span>
            <input
              type="number"
              aria-label={`${name} minimum`}
              value={meta.min}
              min={PARAM_MIN}
              max={PARAM_MAX}
              onChange={(event) => onMetaChange({ ...meta, min: Number(event.target.value) })}
            />
          </label>
          <label className="control tight">
            <span>max</span>
            <input
              type="number"
              aria-label={`${name} maximum`}
              value={meta.max}
              min={PARAM_MIN}
              max={PARAM_MAX}
              onChange={(event) => onMetaChange({ ...meta, max: Number(event.target.value) })}
            />
          </label>
          <label className="control tight">
            <span>step</span>
            <input
              type="number"
              aria-label={`${name} step`}
              value={meta.step}
              min={0.01}
              step={0.01}
              onChange={(event) => onMetaChange({ ...meta, step: Number(event.target.value) })}
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
