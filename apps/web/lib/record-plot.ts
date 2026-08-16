export const CLIP_DURATION_MS = 3000;
export const CLIP_FPS = 20;
export const CLIP_MAX_EDGE = 1280;

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

export function clipSize(width: number, height: number, maxEdge = CLIP_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height, 1));
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
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
  const { width, height } = clipSize(box.width, box.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not open a drawing surface");
  }
  const stream = canvas.captureStream(CLIP_FPS);
  const recorder = new MediaRecorder(stream, { mimeType: mime.mimeType, videoBitsPerSecond: 2_500_000 });
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
