"use client";

import { useEffect, useRef, useState } from "react";

import type { VisualizationSpec } from "@math-vis/visualization-schema";

import { recordManimStyleClip } from "@/lib/manim-clip";
import { CLIP_DURATION_MS, CLIP_FPS, saveBlob, snapshotStagePng, snapshotStageSvg } from "@/lib/record-plot";

type Props = {
  layers: VisualizationSpec[];
  disabled?: boolean;
  onRecord: (active: boolean) => void;
};

export function ClipDownload({ layers, disabled = false, onRecord }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(CLIP_DURATION_MS / 1000);
  const [preview, setPreview] = useState<{ url: string; filename: string } | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  async function createVideo() {
    setError(null);
    setBusy(true);
    setProgress(0);
    onRecord(true);
    try {
      const clip = await recordManimStyleClip(layers, duration * 1000, setProgress);
      const url = URL.createObjectURL(clip.blob);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = url;
      setPreview({ url, filename: `graph-io.${clip.extension}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recording failed");
    } finally {
      onRecord(false);
      setBusy(false);
    }
  }

  async function downloadPng() {
    const stage = document.querySelector(".canvas-stage");
    if (!(stage instanceof HTMLElement)) {
      setError("The plot is not ready to export");
      return;
    }
    const blob = await snapshotStagePng(stage);
    saveBlob(blob, "graph-io.png");
  }

  async function downloadSvg() {
    const stage = document.querySelector(".canvas-stage");
    if (!(stage instanceof HTMLElement)) {
      setError("The plot is not ready to export");
      return;
    }
    const markup = await snapshotStageSvg(stage);
    saveBlob(new Blob([markup], { type: "image/svg+xml" }), "graph-io.svg");
  }

  return (
    <div>
      <div className="row">
        <button
          className="btn primary"
          type="button"
          data-state={busy ? "loading" : error ? "error" : undefined}
          disabled={busy || disabled}
          onClick={() => setOpen(true)}
        >
          Create video
        </button>
        <button className="btn" type="button" disabled={disabled} onClick={() => void downloadPng()}>
          PNG
        </button>
        <button className="btn" type="button" disabled={disabled} onClick={() => void downloadSvg()}>
          SVG
        </button>
      </div>
      {open ? (
        <div className="sheet" role="dialog" aria-labelledby="export-title">
          <div className="sheet-head">
            <h2 id="export-title">Create video</h2>
            <button className="text-link" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <p className="hint">WebM · {CLIP_FPS} fps · 1920×1080 · Manim-styled black scene</p>
          <label className="control">
            <span>Duration (seconds)</span>
            <input
              type="number"
              min={2}
              max={12}
              value={duration}
              aria-label="Video duration"
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </label>
          {busy ? (
            <p className="status" role="status">
              Rendering… {Math.round(progress * 100)}%
            </p>
          ) : null}
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          {error ? <p className="status error">{error}</p> : null}
          {preview ? (
            <div className="film">
              <video controls playsInline src={preview.url} aria-label="Film preview" />
            </div>
          ) : null}
          <div className="export-actions">
            {preview ? (
              <a className="btn primary" download={preview.filename} href={preview.url} rel="noopener">
                Download WebM
              </a>
            ) : null}
            <button className="btn" type="button" disabled={busy || disabled} onClick={() => void createVideo()}>
              {busy ? "Rendering" : preview ? "Regenerate" : "Render preview"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
