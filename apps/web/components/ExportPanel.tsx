"use client";

import { useEffect, useRef, useState } from "react";

import { createRender, getRender, type RenderResponse } from "@math-vis/api-client";
import type { VisualizationSpec } from "@math-vis/visualization-schema";

type Props = {
  spec: VisualizationSpec;
  apiBaseUrl: string;
};

export function ExportPanel({ spec, apiBaseUrl }: Props) {
  const [render, setRender] = useState<RenderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  async function startExport() {
    setError(null);
    setBusy(true);
    try {
      const created = await createRender(apiBaseUrl, spec);
      setRender(created);
      listen(created.renderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  function listen(renderId: string) {
    sourceRef.current?.close();
    const url = `${apiBaseUrl.replace(/\/$/, "")}/v1/renders/${renderId}/events`;
    try {
      const source = new EventSource(url);
      sourceRef.current = source;
      source.onmessage = (event) => {
        const payload = JSON.parse(event.data) as RenderResponse;
        setRender(payload);
        if (["completed", "failed", "cancelled"].includes(payload.status)) {
          source.close();
        }
      };
      source.onerror = () => {
        source.close();
        poll(renderId);
      };
    } catch {
      poll(renderId);
    }
  }

  function poll(renderId: string) {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }
    pollRef.current = window.setInterval(async () => {
      try {
        const current = await getRender(apiBaseUrl, renderId);
        setRender(current);
        if (["completed", "failed", "cancelled"].includes(current.status)) {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Status polling failed");
      }
    }, 1000);
  }

  async function cancel() {
    if (!render) {
      return;
    }
    await fetch(`${apiBaseUrl.replace(/\/$/, "")}/v1/renders/${render.renderId}`, { method: "DELETE" });
  }

  const inFlight = render && !["completed", "failed", "cancelled"].includes(render.status);

  return (
    <section className="export">
      <p className="stick-label">Film</p>
      <div className="row">
        <button
          className="btn primary"
          type="button"
          data-state={busy ? "loading" : error ? "error" : undefined}
          disabled={busy}
          onClick={() => void startExport()}
        >
          {busy ? "Queuing" : "Export"}
        </button>
        {inFlight ? (
          <button className="btn danger" type="button" onClick={() => void cancel()}>
            Cancel
          </button>
        ) : null}
      </div>
      {error ? <p className="status error">{error}</p> : null}
      {render ? (
        <div>
          <p className={render.status === "failed" ? "status error" : "status"}>
            {render.status}
            {render.cached ? " · cached" : ""} · {render.progress}%
          </p>
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${render.progress}%` }} />
          </div>
          {render.error ? <p className="status error">{render.error}</p> : null}
          {render.status === "completed" && render.videoMp4Url ? (
            <div className="film">
              <video controls src={render.videoMp4Url} poster={render.thumbnailUrl ?? undefined} />
              <div className="row">
                <a href={render.videoMp4Url}>Download MP4</a>
                {render.videoWebmUrl ? <a href={render.videoWebmUrl}>Download WebM</a> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
