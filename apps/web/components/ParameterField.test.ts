import { describe, expect, it } from "vitest";

import { parseParameterDraft } from "./ParameterField";

describe("parseParameterDraft", () => {
  it("accepts finite numbers in range", () => {
    expect(parseParameterDraft("3")).toEqual({ ok: true, value: 3 });
    expect(parseParameterDraft(" 0.6 ")).toEqual({ ok: true, value: 0.6 });
  });

  it("rejects non-numeric and out-of-range drafts", () => {
    expect(parseParameterDraft("abc").ok).toBe(false);
    expect(parseParameterDraft("").ok).toBe(false);
    expect(parseParameterDraft("999").ok).toBe(false);
  });
});
