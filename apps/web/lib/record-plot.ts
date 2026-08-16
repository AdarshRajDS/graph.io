export const CLIP_DURATION_MS = 5000;
export const CLIP_FPS = 30;
export const CLIP_MAX_EDGE = 1920;

const MIME_CANDIDATES: Array<{ mimeType: string; extension: "webm" | "mp4" }> = [
  { mimeType: "video/webm;codecs=vp9", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
  { mimeType: "video/mp4", extension: "mp4" },
];

export function pickRecorderMime(
  isTypeSupported: (mimeType: string) => boolean = (mimeType) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType),
): { mimeType: string; extension: "webm" | "mp4" } {
  const match = MIME_CANDIDATES.find((candidate) => isTypeSupported(candidate.mimeType));
  if (!match) {
    throw new Error("This browser cannot record a video clip");
  }
  return match;
}

export function clipSize(
  width: number,
  height: number,
  maxEdge = CLIP_MAX_EDGE,
  pixelRatio = 1,
): { width: number; height: number } {
  const pixelW = width * Math.min(2, Math.max(1, pixelRatio));
  const pixelH = height * Math.min(2, Math.max(1, pixelRatio));
  const scale = Math.min(1, maxEdge / Math.max(pixelW, pixelH, 1));
  return {
    width: Math.max(2, Math.round(pixelW * scale)),
    height: Math.max(2, Math.round(pixelH * scale)),
  };
}

export function writePresentation(
  tagName: string,
  style: {
    fill: string;
    stroke: string;
    strokeWidth: string;
    strokeOpacity: string;
    fillOpacity: string;
    opacity: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
  },
  target: { setAttribute: (name: string, value: string) => void },
): void {
  const tag = tagName.toLowerCase();
  if (tag === "text" || tag === "tspan") {
    const fill = usablePaint(style.fill) ?? usablePaint(style.color);
    if (fill) {
      target.setAttribute("fill", fill);
    }
    if (style.fontFamily) {
      target.setAttribute("font-family", style.fontFamily);
    }
    if (style.fontSize) {
      const size = Number.parseFloat(style.fontSize);
      target.setAttribute("font-size", Number.isFinite(size) ? `${Math.max(size, 13)}px` : style.fontSize);
    }
    if (style.fontWeight) {
      target.setAttribute("font-weight", style.fontWeight);
    }
    return;
  }
  const stroke = usablePaint(style.stroke);
  if (stroke) {
    target.setAttribute("stroke", stroke);
  }
  if (style.strokeWidth && style.strokeWidth !== "0px") {
    target.setAttribute("stroke-width", style.strokeWidth);
  }
  if (style.strokeOpacity && style.strokeOpacity !== "1") {
    target.setAttribute("stroke-opacity", style.strokeOpacity);
  }
  const fill = usablePaint(style.fill);
  if (fill && tag !== "g" && tag !== "svg") {
    target.setAttribute("fill", fill);
  }
  if (style.fillOpacity && style.fillOpacity !== "1") {
    target.setAttribute("fill-opacity", style.fillOpacity);
  }
  if (style.opacity && style.opacity !== "1") {
    target.setAttribute("opacity", style.opacity);
  }
}

function usablePaint(value: string): string | null {
  if (!value || value === "none" || value === "transparent") {
    return null;
  }
  if (value.includes("currentColor") || value.startsWith("var(")) {
    return null;
  }
  return value;
}

export function bakeSvgComputedStyles(source: SVGSVGElement, clone: SVGSVGElement): void {
  const from = [source, ...Array.from(source.querySelectorAll("*"))];
  const to = [clone, ...Array.from(clone.querySelectorAll("*"))];
  const count = Math.min(from.length, to.length);
  for (let index = 0; index < count; index += 1) {
    writePresentation(from[index].tagName, snapshotStyle(getComputedStyle(from[index])), to[index]);
  }
}

function snapshotStyle(style: CSSStyleDeclaration): {
  fill: string;
  stroke: string;
  strokeWidth: string;
  strokeOpacity: string;
  fillOpacity: string;
  opacity: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  color: string;
} {
  return {
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeOpacity: style.strokeOpacity,
    fillOpacity: style.fillOpacity,
    opacity: style.opacity,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    color: style.color,
  };
}

export function saveBlob(blob: Blob, filename: string, doc: Document = document): void {
  const url = URL.createObjectURL(blob);
  const link = doc.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  doc.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function paintStage(stage: HTMLElement, ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> {
  ctx.fillStyle = "#fcf9f3";
  ctx.fillRect(0, 0, width, height);
  const gl = stage.querySelector("canvas");
  if (gl instanceof HTMLCanvasElement && gl.width > 0 && gl.height > 0) {
    ctx.drawImage(gl, 0, 0, width, height);
    return;
  }
  const svg = stage.querySelector("svg");
  if (!(svg instanceof SVGSVGElement)) {
    throw new Error("The plot is not ready to record");
  }
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("viewBox") && svg.viewBox.baseVal) {
    const box = svg.viewBox.baseVal;
    clone.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
  }
  bakeSvgComputedStyles(svg, clone);
  const serialized = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    ctx.drawImage(image, 0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function recordPlotClip(
  stage: HTMLElement,
  durationMs = CLIP_DURATION_MS,
): Promise<{ blob: Blob; extension: "webm" | "mp4" }> {
  const mime = pickRecorderMime();
  const box = stage.getBoundingClientRect();
  const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const { width, height } = clipSize(box.width, box.height, CLIP_MAX_EDGE, ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not open a drawing surface");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const stream = canvas.captureStream(CLIP_FPS);
  const recorder = new MediaRecorder(stream, { mimeType: mime.mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Recording failed"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime.mimeType }));
  });
  recorder.start();
  const started = performance.now();
  const frameGap = 1000 / CLIP_FPS;
  while (performance.now() - started < durationMs) {
    const frameStart = performance.now();
    await paintStage(stage, ctx, width, height);
    const wait = frameGap - (performance.now() - frameStart);
    if (wait > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, wait));
    }
  }
  if (recorder.state !== "inactive") {
    recorder.stop();
  }
  stream.getTracks().forEach((track) => track.stop());
  return { blob: await finished, extension: mime.extension };
}
