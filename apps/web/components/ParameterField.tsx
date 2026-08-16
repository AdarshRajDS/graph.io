"use client";

import { useEffect, useState } from "react";

import { PARAM_MAX, PARAM_MIN } from "@math-vis/visualization-schema";

export function ParameterField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <label className="control">
      <span>{name}</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        aria-label={`${name} value`}
        placeholder="1"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (next.trim() === "") {
            return;
          }
          const parsed = Number(next);
          if (!Number.isFinite(parsed)) {
            return;
          }
          onChange(Math.min(PARAM_MAX, Math.max(PARAM_MIN, parsed)));
        }}
      />
    </label>
  );
}
