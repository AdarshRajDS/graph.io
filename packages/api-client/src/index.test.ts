import { describe, expect, it, vi } from "vitest";

import { getHealth } from "./index";

describe("getHealth", () => {
  it("returns JSON from the health endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });
    await expect(getHealth("http://localhost:8000", fetchImpl as unknown as typeof fetch)).resolves.toEqual({
      status: "ok",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8000/health",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("throws when the response is not ok", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(getHealth("http://localhost:8000/", fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      /503/,
    );
  });
});
