import { describe, expect, it } from "vitest";

import { trySpecFromDraft } from "./ExpressionEditor";

describe("trySpecFromDraft", () => {
  it("accepts a custom function expression", () => {
    const result = trySpecFromDraft(
      "function-2d",
      { expression: "a * cos(x)", expressionX: "", expressionY: "", shape: "circle" },
      { a: 2 },
    );
    expect(result.error).toBeNull();
    expect(result.spec?.kind).toBe("function-2d");
  });

  it("rejects disallowed expressions", () => {
    const result = trySpecFromDraft(
      "function-2d",
      { expression: "eval(x)", expressionX: "", expressionY: "", shape: "circle" },
      {},
    );
    expect(result.spec).toBeNull();
    expect(result.error).toMatch(/not allowed|Unexpected/i);
  });
});
