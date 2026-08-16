import { describe, expect, it, vi } from "vitest";

import { clipSize, pickRecorderMime, saveBlob } from "./record-plot";

describe("pickRecorderMime", () => {
  it("picks the first supported WebM type", () => {
    expect(pickRecorderMime((type) => type === "video/webm")).toEqual({
      mimeType: "video/webm",
      extension: "webm",
    });
  });

  it("rejects when the browser cannot record", () => {
    expect(() => pickRecorderMime(() => false)).toThrow(/cannot record/);
  });
});

describe("clipSize", () => {
  it("caps the long edge without stretching", () => {
    expect(clipSize(2560, 1280, 1280)).toEqual({ width: 1280, height: 640 });
  });
});

describe("saveBlob", () => {
  it("clicks a download link for the blob", () => {
    const clicks: string[] = [];
    const doc = {
      body: { appendChild: vi.fn(), },
      createElement: (tag: string) => {
        if (tag !== "a") {
          throw new Error(tag);
        }
        const link = {
          href: "",
          download: "",
          rel: "",
          click: () => clicks.push(link.download),
          remove: vi.fn(),
        };
        return link;
      },
    } as unknown as Document;
    const createObjectURL = vi.fn(() => "blob:clip");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("setTimeout", (fn: () => void) => {
      fn();
      return 0;
    });
    saveBlob(new Blob(["x"], { type: "video/webm" }), "graph-io.webm", doc);
    expect(clicks).toEqual(["graph-io.webm"]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:clip");
    vi.unstubAllGlobals();
  });
});
