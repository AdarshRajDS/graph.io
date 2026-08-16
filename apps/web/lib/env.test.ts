import { describe, expect, it } from "vitest";

import { loadEnv } from "./env";
import { healthPayload } from "./health";

describe("healthPayload", () => {
  it("returns ok", () => {
    expect(healthPayload()).toEqual({ status: "ok" });
  });
});

describe("loadEnv", () => {
  it("accepts a valid API URL", () => {
    expect(loadEnv({ NEXT_PUBLIC_API_URL: "http://localhost:8000" }).NEXT_PUBLIC_API_URL).toBe(
      "http://localhost:8000",
    );
  });

  it("allows a missing API URL for a static studio host", () => {
    expect(loadEnv({}).NEXT_PUBLIC_API_URL).toBeUndefined();
  });

  it("treats an empty API URL as unset", () => {
    expect(loadEnv({ NEXT_PUBLIC_API_URL: "" }).NEXT_PUBLIC_API_URL).toBeUndefined();
  });
});
