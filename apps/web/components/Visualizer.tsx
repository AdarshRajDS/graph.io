"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EXAMPLES,
  KIND_BLURBS,
  KIND_GROUPS,
  KIND_LABELS,
  LAYER_COLORS,
  MAX_LAYERS,
  cloneVisualizationSpec,
  defaultSpecForKind,
  examplesForKind,
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
import {
  applyAnimatedSpecs,
  defaultParamMeta,
  defaultStudioDocument,
  documentFromSpecs,
  graphSummary,
  layerFromSpec,
  saveLocalDocument,
  selectedLayer,
  type StudioDocument,
  type StudioLayer,
} from "@/lib/studio-document";
import { publicAsset } from "@/lib/site";
import { replaceSceneUrl, sceneFromSearchParams } from "@/lib/url-state";

const PlotCanvas = dynamic(() => import("@/components/PlotCanvas").then((mod) => mod.PlotCanvas), {
  ssr: false,
});

type MobileTab = "layers" | "formula" | "parameters" | "animate";

export function Visualizer({ apiBaseUrl }: { apiBaseUrl: string }) {
  const params = useSearchParams();
  const initial = sceneFromSearchParams(params);
  const [document, setDocument] = useState<StudioDocument>(() => documentFromSpecs(initial.layers, initial.selected));
  const [notice, setNotice] = useState(initial.notice);
  const [past, setPast] = useState<StudioDocument[]>([]);
  const [future, setFuture] = useState<StudioDocument[]>([]);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [viewKey, setViewKey] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [formKey, setFormKey] = useState(0);
  const [invalidParams, setInvalidParams] = useState<Record<string, boolean>>({});
  const [shareStatus, setShareStatus] = useState("Saved locally");
  const [paletteQuery, setPaletteQuery] = useState("");
  const [exampleQuery, setExampleQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("formula");
  const [confirmClear, setConfirmClear] = useState(false);
  const layer = selectedLayer(document);
  const spec = layer.spec;
  const [draft, setDraft] = useState(() => draftFromSpec(spec));
  const [exprError, setExprError] = useState<string | null>(null);
  const examples = examplesForKind(spec.kind);
  const documentInvalid = exprError !== null || Object.values(invalidParams).some(Boolean);
  const plotLayers = applyAnimatedSpecs(document, playing ? phase : 0);
  const duration = 8 / document.speed;

  const resetInspector = useCallback((next: VisualizationSpec) => {
    setDraft(draftFromSpec(next));
    setExprError(null);
    setInvalidParams({});
    setFormKey((value) => value + 1);
  }, []);

  function commit(next: StudioDocument, recordHistory = true) {
    if (recordHistory) {
      setPast((history) => [...history, document].slice(-40));
      setFuture([]);
    }
    setDocument(next);
    replaceSceneUrl(
      next.layers.map((item) => item.spec),
      next.selected,
    );
    setShareStatus("Saved locally");
  }

  useEffect(() => {
    function onPopState() {
      const next = sceneFromSearchParams(new URLSearchParams(window.location.search));
      const studio = documentFromSpecs(next.layers, next.selected);
      setNotice(next.notice);
      setDocument(studio);
      resetInspector(studio.layers[studio.selected]?.spec ?? studio.layers[0].spec);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [resetInspector]);

  useEffect(() => {
    saveLocalDocument(document);
  }, [document]);

  useEffect(() => {
    if (!playing) {
      return;
    }
    let frame = 0;
    const started = performance.now();
    const id = window.requestAnimationFrame(function tick(time) {
      const seconds = ((time - started) / 1000) * document.speed;
      setElapsed(document.loop ? seconds % duration : Math.min(duration, seconds));
      setPhase((time / (400 / document.speed)) % (Math.PI * 2));
      frame = window.requestAnimationFrame(tick);
    });
    return () => window.cancelAnimationFrame(frame || id);
  }, [playing, document.speed, document.loop, duration]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) {
      return;
    }
    setPast(past.slice(0, -1));
    setFuture([document, ...future]);
    setDocument(previous);
    resetInspector(previous.layers[previous.selected]?.spec ?? previous.layers[0].spec);
    replaceSceneUrl(
      previous.layers.map((item) => item.spec),
      previous.selected,
    );
  }

  function redo() {
    const next = future[0];
    if (!next) {
      return;
    }
    setFuture(future.slice(1));
    setPast([...past, document]);
    setDocument(next);
    resetInspector(next.layers[next.selected]?.spec ?? next.layers[0].spec);
    replaceSceneUrl(
      next.layers.map((item) => item.spec),
      next.selected,
    );
  }

  function updateLayer(nextSpec: VisualizationSpec) {
    commit({
      ...document,
      layers: document.layers.map((item, index) => (index === document.selected ? { ...item, spec: nextSpec } : item)),
    });
  }

  function updateParam(name: string, value: number) {
    updateLayer({ ...spec, parameters: { ...spec.parameters, [name]: value } });
  }

  function addKind(kind: VisualizationKind) {
    if (document.layers.length >= MAX_LAYERS) {
      return;
    }
    const nextSpec = defaultSpecForKind(kind);
    const nextLayer = layerFromSpec(nextSpec, document.layers.length);
    resetInspector(nextSpec);
    commit({ ...document, layers: [...document.layers, nextLayer], selected: document.layers.length });
    setMobileTab("formula");
  }

  function selectLayer(index: number) {
    const next = document.layers[index];
    if (!next) {
      return;
    }
    resetInspector(next.spec);
    commit({ ...document, selected: index }, false);
  }

  function removeLayer(index: number) {
    if (document.layers.length === 1) {
      return;
    }
    const layers = document.layers.filter((_, item) => item !== index);
    const selected = Math.min(index === 0 ? 0 : index - 1, layers.length - 1);
    resetInspector(layers[selected].spec);
    commit({ ...document, layers, selected });
  }

  function duplicateLayer(index: number) {
    if (document.layers.length >= MAX_LAYERS) {
      return;
    }
    const source = document.layers[index];
    const copy: StudioLayer = {
      ...source,
      id: `${source.id}-copy`,
      name: `${source.name} copy`,
      spec: cloneVisualizationSpec(source.spec),
    };
    const layers = [...document.layers.slice(0, index + 1), copy, ...document.layers.slice(index + 1)];
    commit({ ...document, layers, selected: index + 1 });
  }

  function moveLayer(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= document.layers.length) {
      return;
    }
    const layers = [...document.layers];
    const [item] = layers.splice(index, 1);
    layers.splice(target, 0, item);
    commit({ ...document, layers, selected: target });
  }

  function onDraft(nextDraft: Draft) {
    if (layer.locked) {
      return;
    }
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
    const specCopy = cloneVisualizationSpec(next);
    if (next.kind !== spec.kind) {
      if (document.layers.length >= MAX_LAYERS) {
        return;
      }
      const nextLayer = layerFromSpec(specCopy, document.layers.length);
      resetInspector(specCopy);
      commit({ ...document, layers: [...document.layers, nextLayer], selected: document.layers.length });
      return;
    }
    resetInspector(specCopy);
    updateLayer(specCopy);
  }

  function restartAnimation() {
    setPlaying(false);
    setPhase(0);
    setElapsed(0);
  }

  function newCanvas() {
    const next = defaultStudioDocument();
    resetInspector(next.layers[0].spec);
    setPlaying(false);
    setPhase(0);
    commit(next);
    setViewKey((value) => value + 1);
    setConfirmClear(false);
  }

  async function copyShareUrl() {
    replaceSceneUrl(
      document.layers.map((item) => item.spec),
      document.selected,
    );
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("Share link copied.");
    } catch {
      setShareStatus("Copy the URL from the address bar.");
    }
  }

  const filteredKinds = visualizationKinds.filter((kind) => {
    const haystack = `${KIND_LABELS[kind]} ${KIND_BLURBS[kind]}`.toLowerCase();
    return haystack.includes(paletteQuery.toLowerCase());
  });
  const filteredExamples = useMemo(
    () =>
      (exampleQuery ? EXAMPLES : examples).filter((item) =>
        `${item.name} ${KIND_LABELS[item.kind]}`.toLowerCase().includes(exampleQuery.toLowerCase()),
      ),
    [exampleQuery, examples],
  );

  return (
    <div className="shell">
      <a className="skip-link" href="#workspace">
        Skip to graph
      </a>
      <header className="masthead">
        <div>
          <h1 className="wordmark">
            {/* eslint-disable-next-line @next/next/no-img-element -- static Pages needs an explicit /graph.io prefix */}
            <img className="brand-mark" src={publicAsset("/brand/logo.png")} width={36} height={36} alt="" />
            <span className="wordmark-text">
              graph<span className="wordmark-tld">.io</span>
            </span>
          </h1>
          <p className="tagline">Plot formulas, add layers, animate parameters, and export</p>
        </div>
        <div className="masthead-actions">
          <button className="btn" type="button" onClick={() => setConfirmClear(true)}>
            New
          </button>
          <button className="btn" type="button" disabled={past.length === 0} onClick={undo}>
            Undo
          </button>
          <button className="btn" type="button" disabled={future.length === 0} onClick={redo}>
            Redo
          </button>
          <span className="save-status" role="status">
            {shareStatus}
          </span>
          <button className="btn" type="button" onClick={() => void copyShareUrl()}>
            Share
          </button>
          <button className="btn danger" type="button" onClick={() => setConfirmClear(true)}>
            Clear canvas
          </button>
        </div>
      </header>
      {confirmClear ? (
        <div className="banner" role="alertdialog" aria-labelledby="clear-title">
          <p id="clear-title">Clear the canvas? This removes every layer. Undo can restore it.</p>
          <button className="btn danger" type="button" onClick={newCanvas}>
            Clear
          </button>
          <button className="btn" type="button" onClick={() => setConfirmClear(false)}>
            Cancel
          </button>
        </div>
      ) : null}
      <div className="workbench">
        <nav className={`kind-nav ${mobileTab === "layers" ? "is-open" : ""}`} aria-label="Add layer">
          <h2 className="stick-label">Add layer</h2>
          <label className="control">
            <span className="visually-hidden">Search layer types</span>
            <input
              type="search"
              value={paletteQuery}
              placeholder="Search types"
              aria-label="Search layer types"
              onChange={(event) => setPaletteQuery(event.target.value)}
            />
          </label>
          {KIND_GROUPS.map((group) => (
            <div key={group.name}>
              <h3 className="group-label">{group.name}</h3>
              {group.kinds
                .filter((kind) => filteredKinds.includes(kind))
                .map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className="kind"
                    aria-label={KIND_LABELS[kind]}
                    onClick={() => addKind(kind)}
                  >
                    <strong>{KIND_LABELS[kind]}</strong>
                    <small>{KIND_BLURBS[kind]}</small>
                  </button>
                ))}
            </div>
          ))}
          <h2 className="stick-label">Layers</h2>
          {document.layers.map((item, index) => (
            <div className="layer-row" key={item.id}>
              <button
                type="button"
                className="kind"
                aria-current={index === document.selected ? "true" : undefined}
                aria-pressed={index === document.selected}
                onClick={() => selectLayer(index)}
              >
                <span className="layer-swatch" style={{ background: LAYER_COLORS[index % LAYER_COLORS.length] }} />
                {KIND_LABELS[item.spec.kind]}
              </button>
              <input
                className="layer-name"
                aria-label={`${item.name} name`}
                value={item.name}
                onChange={(event) => {
                  const name = event.target.value.slice(0, 32);
                  commit({
                    ...document,
                    layers: document.layers.map((layerItem, layerIndex) =>
                      layerIndex === index ? { ...layerItem, name } : layerItem,
                    ),
                  });
                }}
              />
              <button
                type="button"
                className="icon-btn"
                aria-pressed={!item.visible}
                aria-label={`${item.visible ? "Hide" : "Show"} ${item.name}`}
                onClick={() =>
                  commit({
                    ...document,
                    layers: document.layers.map((layerItem, layerIndex) =>
                      layerIndex === index ? { ...layerItem, visible: !layerItem.visible } : layerItem,
                    ),
                  })
                }
              >
                {item.visible ? "●" : "○"}
              </button>
              <button type="button" className="icon-btn" aria-label={`Duplicate ${item.name}`} onClick={() => duplicateLayer(index)}>
                +
              </button>
              <button type="button" className="icon-btn" aria-label={`Move ${item.name} up`} onClick={() => moveLayer(index, -1)}>
                ↑
              </button>
              <button type="button" className="icon-btn" aria-label={`Move ${item.name} down`} onClick={() => moveLayer(index, 1)}>
                ↓
              </button>
              {document.layers.length > 1 ? (
                <button type="button" className="layer-remove" aria-label={`Remove ${KIND_LABELS[item.spec.kind]} layer`} onClick={() => removeLayer(index)}>
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </nav>
        <main id="workspace" className="canvas-column">
          <p className="visually-hidden" id="graph-help">
            Drag to pan, scroll to zoom; arrow keys pan, plus and minus zoom.
          </p>
          <p className="visually-hidden" id="graph-summary">
            {graphSummary(document)}
          </p>
          <section className="graph-region" aria-labelledby="graph-heading" aria-describedby="graph-help graph-summary">
            <h2 id="graph-heading" className="visually-hidden">
              Graph canvas
            </h2>
            <PlotCanvas layers={plotLayers} phase={playing ? phase : 0} viewKey={viewKey} zoom={zoom} grid={document.grid} />
            <div className="canvas-equations">
              <Equation layers={plotLayers} />
            </div>
            <div className="canvas-toolbar">
              <button className="btn" type="button" onClick={() => setZoom((value) => Math.min(4, value * 1.2))}>
                Zoom in
              </button>
              <button className="btn" type="button" onClick={() => setZoom((value) => Math.max(0.4, value / 1.2))}>
                Zoom out
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setZoom(1);
                  setViewKey((value) => value + 1);
                }}
              >
                Reset view
              </button>
              <button
                className="btn"
                type="button"
                aria-pressed={document.grid}
                onClick={() => commit({ ...document, grid: !document.grid }, false)}
              >
                {document.grid ? "Hide grid" : "Show grid"}
              </button>
            </div>
          </section>
        </main>
        <aside className={`stick ${mobileTab !== "layers" ? "is-open" : ""}`}>
          {notice ? (
            <p className="status error" role="status">
              {notice}
            </p>
          ) : null}
          <div className={`panel ${mobileTab === "formula" ? "is-open" : ""}`}>
            <h2 className="stick-label">Expression</h2>
            <ExpressionEditor spec={spec} draft={draft} error={exprError} locked={layer.locked} onDraft={onDraft} />
          </div>
          <div className={`panel param-list ${mobileTab === "parameters" ? "is-open" : ""}`} key={`${formKey}-${document.selected}`}>
            <h2 className="stick-label">Parameters</h2>
            {Object.entries(spec.parameters).map(([name, value]) => (
              <ParameterField
                key={`${formKey}-${document.selected}-${name}`}
                name={name}
                value={playing ? (plotLayers[document.selected]?.parameters[name] ?? value) : value}
                meta={document.paramMeta[name] ?? defaultParamMeta(value)}
                onChange={(next) => updateParam(name, next)}
                onMetaChange={(meta) => commit({ ...document, paramMeta: { ...document.paramMeta, [name]: meta } }, false)}
                onValidityChange={(valid) => {
                  setInvalidParams((current) => {
                    if (valid) {
                      if (!(name in current)) {
                        return current;
                      }
                      const next = { ...current };
                      delete next[name];
                      return next;
                    }
                    if (current[name]) {
                      return current;
                    }
                    return { ...current, [name]: true };
                  });
                }}
              />
            ))}
          </div>
          <div className={`panel examples ${mobileTab === "formula" ? "is-open" : ""}`}>
            <h2 className="stick-label">Examples</h2>
            <label className="control">
              <span className="visually-hidden">Search examples</span>
              <input
                type="search"
                value={exampleQuery}
                placeholder="Search examples"
                aria-label="Search examples"
                onChange={(event) => setExampleQuery(event.target.value)}
              />
            </label>
            <div className="example-list">
              {filteredExamples.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="example"
                  aria-pressed={false}
                  onClick={() => loadExample(item.spec)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div className={`panel ${mobileTab === "animate" ? "is-open" : ""}`}>
            <h2 className="stick-label">Animate</h2>
            <p className="hint">
              {elapsed.toFixed(1)}s / {duration.toFixed(1)}s · speed {document.speed}×
            </p>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              aria-label="Animation scrubber"
              value={elapsed}
              onChange={(event) => {
                const next = Number(event.target.value);
                setElapsed(next);
                setPhase((next / duration) * Math.PI * 2);
              }}
            />
            <div className="row">
              <button className="btn" type="button" disabled={documentInvalid} onClick={() => setPlaying((value) => !value)}>
                {playing ? "Pause" : "Play"}
              </button>
              <button className="btn" type="button" onClick={restartAnimation}>
                Restart animation
              </button>
              <label className="inline">
                <input
                  type="checkbox"
                  checked={document.loop}
                  onChange={(event) => commit({ ...document, loop: event.target.checked }, false)}
                />
                Loop
              </label>
              <label className="inline">
                Speed
                <select
                  aria-label="Animation speed"
                  value={document.speed}
                  onChange={(event) => commit({ ...document, speed: Number(event.target.value) }, false)}
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                </select>
              </label>
            </div>
            <p className="hint">
              Animating:{" "}
              {Object.entries(document.paramMeta)
                .filter(([, meta]) => meta.animate)
                .map(([name]) => name)
                .join(", ") || "none"}
            </p>
          </div>
          <section className="export">
            <h2 className="stick-label">Export</h2>
            <ClipDownload layers={plotLayers} disabled={documentInvalid} onRecord={setPlaying} />
            {apiBaseUrl ? <ExportPanel spec={spec} disabled={documentInvalid} apiBaseUrl={apiBaseUrl} /> : null}
          </section>
        </aside>
        <div className="mobile-tabs" role="tablist" aria-label="Editor panels">
          {(["layers", "formula", "parameters", "animate"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mobileTab === tab}
              className={mobileTab === tab ? "btn primary" : "btn"}
              onClick={() => setMobileTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
