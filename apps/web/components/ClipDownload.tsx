"use client";

import { useEffect, useRef, useState } from "react";

import type { VisualizationSpec } from "@math-vis/visualization-schema";

import { recordManimStyleClip } from "@/lib/manim-clip";

type Props = {
  layers: VisualizationSpec[];
  onRecord: (active: boolean) => void;
};

export function ClipDownload({ layers, onRecord }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; filename: string } | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  async function download() {
    setError(null);
    setBusy(true);
    onRecord(true);
    try {
      const clip = await recordManimStyleClip(layers);
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

  return (
    <div>
      <div className="row">
        <button
          className="btn primary"
          type="button"
          data-state={busy ? "loading" : error ? "error" : undefined}
          disabled={busy}
          onClick={() => void download()}
        >
          {busy ? "Rendering" : "Download video"}
        </button>
      </div>
      {error ? <p className="status error">{error}</p> : null}
      {preview ? (
        <div className="film">
          <video controls playsInline src={preview.url} aria-label="Film preview" />
          <div className="row">
            <a download={preview.filename} href={preview.url} rel="noopener">
              Save file
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
