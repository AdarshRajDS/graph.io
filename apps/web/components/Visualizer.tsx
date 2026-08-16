"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  KIND_LABELS,
  MAX_LAYERS,
  defaultSpecForKind,
  examplesForKind,
  layerColor,
  visualizationKinds,
  type VisualizationKind,
  type VisualizationSpec,
} from "@math-vis/visualization-schema";

import { ClipDownload } from "@/components/ClipDownload";
import { Equation } from "@/components/Equation";
import { ExportPanel } from "@/components/ExportPanel";
import {
  ExpressionEditor,
  draftFromSpec,
  trySpecFromDraft,
  type Draft,
} from "@/components/ExpressionEditor";
import { ParameterField } from "@/components/ParameterField";
import { sceneFromSearchParams, sceneToSearchParams } from "@/lib/url-state";

const PlotCanvas = dynamic(() => import("@/components/PlotCanvas").then((mod) => mod.PlotCanvas), {
  ssr: false,
});

export function Visualizer({ apiBaseUrl }: { apiBaseUrl: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const scene = useMemo(() => sceneFromSearchParams(params), [params]);
  const { layers, selected } = scene;
  const spec = layers[selected] ?? layers[0];
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState(0);
  const [viewKey, setViewKey] = useState(0);
  const [draft, setDraft] = useState(() => draftFromSpec(spec));
  const [exprError, setExprError] = useState<string | null>(null);
  const examples = examplesForKind(spec.kind);

  useEffect(() => {
    setDraft(draftFromSpec(spec));
    setExprError(null);
  }, [spec]);

  useEffect(() => {
    if (!playing) {
      return;
    }
    let frame = 0;
    const id = window.requestAnimationFrame(function tick(time) {
      setPhase((time / 400) % (Math.PI * 2));
      frame = window.requestAnimationFrame(tick);
    });
    return () => window.cancelAnimationFrame(frame || id);
  }, [playing]);

  function writeLayers(nextLayers: VisualizationSpec[], nextSelected = selected) {
    const index = Math.min(nextSelected, nextLayers.length - 1);
    router.replace(`${pathname}?${sceneToSearchParams(nextLayers, index).toString()}`, { scroll: false });
  }

  function updateLayer(next: VisualizationSpec) {
    writeLayers(
      layers.map((layer, index) => (index === selected ? next : layer)),
      selected,
    );
  }

  function updateParam(name: string, value: number) {
    updateLayer({
      ...spec,
      parameters: { ...spec.parameters, [name]: value },
    });
  }

  function addKind(kind: VisualizationKind) {
    if (layers.length >= MAX_LAYERS) {
      return;
    }
    const next = defaultSpecForKind(kind);
    writeLayers([...layers, next], layers.length);
    setViewKey((value) => value + 1);
  }

  function selectLayer(index: number) {
    writeLayers(layers, index);
  }

  function removeLayer(index: number) {
    if (layers.length === 1) {
      return;
    }
    const next = layers.filter((_, item) => item !== index);
    writeLayers(next, index === 0 ? 0 : index - 1);
    setViewKey((value) => value + 1);
  }

  function onDraft(nextDraft: Draft) {
    setDraft(nextDraft);
    const result = trySpecFromDraft(spec.kind, nextDraft, spec.parameters);
    if (result.spec) {
      setExprError(null);
      updateLayer(result.spec);
      return;
    }
    setExprError(result.error);
  }

  function loadExample(next: VisualizationSpec) {
    setDraft(draftFromSpec(next));
    setExprError(null);
    updateLayer(next);
    setViewKey((value) => value + 1);
  }

  return (
    <div className="shell">
      <header className="masthead">
        <h1 className="wordmark">
          graph<span className="wordmark-tld">.io</span>
        </h1>
      </header>
      <div className="workbench">
        <nav className="kind-nav" aria-label="Diagram type">
          <p className="stick-label">Add to canvas</p>
          {visualizationKinds.map((kind) => (
            <button key={kind} type="button" className="kind" onClick={() => addKind(kind)}>
              {KIND_LABELS[kind]}
            </button>
          ))}
          <p className="stick-label">Layers</p>
          {layers.map((layer, index) => (
            <div className="layer-row" key={`${layer.kind}-${index}`}>
              <button
                type="button"
                className="kind"
                aria-current={index === selected ? "true" : undefined}
                onClick={() => selectLayer(index)}
              >
                <span className="layer-swatch" style={{ background: layerColor(index) }} />
                {KIND_LABELS[layer.kind]}
              </button>
              {layers.length > 1 ? (
                <button type="button" className="layer-remove" aria-label={`Remove ${KIND_LABELS[layer.kind]} layer`} onClick={() => removeLayer(index)}>
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </nav>
        <div className="canvas-column">
          <PlotCanvas layers={layers} phase={playing ? phase : 0} viewKey={viewKey} />
          <div className="canvas-equations">
            <Equation layers={layers} />
          </div>
        </div>
        <aside className="stick">
          <p className="stick-label">Formula</p>
          <ExpressionEditor spec={spec} draft={draft} error={exprError} onDraft={onDraft} />
          {Object.entries(spec.parameters).map(([name, value]) => (
            <ParameterField key={name} name={name} value={value} onChange={(next) => updateParam(name, next)} />
          ))}
          <div className="examples">
            <p className="stick-label">Examples</p>
            <div className="example-list">
              {examples.map((item) => (
                <button key={item.id} type="button" className="example" onClick={() => loadExample(item.spec)}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <button className="btn" type="button" onClick={() => setPlaying((value) => !value)}>
              {playing ? "Pause" : "Play"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setPlaying(false);
                setPhase(0);
                writeLayers([defaultSpecForKind("function-2d")], 0);
                setViewKey((value) => value + 1);
              }}
            >
              Reset
            </button>
          </div>
          <section className="export">
            <p className="stick-label">Film</p>
            <ClipDownload onRecord={setPlaying} />
            {apiBaseUrl ? <ExportPanel spec={spec} apiBaseUrl={apiBaseUrl} /> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
