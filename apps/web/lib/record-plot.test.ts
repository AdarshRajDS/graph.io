import { describe, expect, it, vi } from "vitest";

import { CLIP_DURATION_MS, CLIP_FPS, clipSize, pickRecorderMime, saveBlob, writePresentation } from "./record-plot";

describe("clip quality", () => {
  it("records at least five seconds at 30 fps", () => {
    expect(CLIP_DURATION_MS).toBeGreaterThanOrEqual(5000);
    expect(CLIP_FPS).toBeGreaterThanOrEqual(30);
  });
});

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

describe("writePresentation", () => {
  it("bakes axis number fill and font onto text", () => {
    const attrs: Record<string, string> = {};
    writePresentation(
      "text",
      {
        fill: "rgb(34, 28, 22)",
        stroke: "none",
        strokeWidth: "0px",
        strokeOpacity: "1",
        fillOpacity: "1",
        opacity: "1",
        fontFamily: "IBM Plex Mono",
        fontSize: "11px",
        fontWeight: "400",
        color: "rgb(34, 28, 22)",
      },
      { setAttribute: (name, value) => {
        attrs[name] = value;
      } },
    );
    expect(attrs.fill).toBe("rgb(34, 28, 22)");
    expect(attrs["font-size"]).toBe("13px");
  });

  it("bakes axis stroke onto lines", () => {
    const attrs: Record<string, string> = {};
    writePresentation(
      "line",
      {
        fill: "none",
        stroke: "rgb(50, 40, 30)",
        strokeWidth: "1.75px",
        strokeOpacity: "1",
        fillOpacity: "1",
        opacity: "1",
        fontFamily: "",
        fontSize: "",
        fontWeight: "",
        color: "rgb(50, 40, 30)",
      },
      { setAttribute: (name, value) => {
        attrs[name] = value;
      } },
    );
    expect(attrs.stroke).toBe("rgb(50, 40, 30)");
    expect(attrs["stroke-width"]).toBe("1.75px");
  });
});

describe("clipSize", () => {
  it("caps the long edge without stretching", () => {
    expect(clipSize(2560, 1280, 1920)).toEqual({ width: 1920, height: 960 });
  });

  it("uses device pixels for a sharper clip", () => {
    expect(clipSize(800, 400, 1920, 2)).toEqual({ width: 1600, height: 800 });
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
