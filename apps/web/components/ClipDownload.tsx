"use client";

import { useState } from "react";

import { recordPlotClip, saveBlob } from "@/lib/record-plot";

type Props = {
  onRecord: (active: boolean) => void;
};

export function ClipDownload({ onRecord }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const stage = document.querySelector(".canvas-stage");
    if (!(stage instanceof HTMLElement)) {
      setError("The plot is not ready to record");
      return;
    }
    setError(null);
    setBusy(true);
    onRecord(true);
    try {
      const clip = await recordPlotClip(stage);
      saveBlob(clip.blob, `graph-io.${clip.extension}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recording failed");
    } finally {
      onRecord(false);
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <button
        className="btn primary"
        type="button"
        data-state={busy ? "loading" : error ? "error" : undefined}
        disabled={busy}
        onClick={() => void download()}
      >
        {busy ? "Recording" : "Download video"}
      </button>
      {error ? <p className="status error">{error}</p> : null}
    </div>
  );
}
