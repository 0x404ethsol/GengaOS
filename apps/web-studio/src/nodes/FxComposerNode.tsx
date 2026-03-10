import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FxLayer } from "@genga/contracts";
import type { FxComposerNodeData } from "../types";

const fxTypeOptions = ["speed-lines", "impact-flash", "debris", "aura", "chromatic-hit"];

function normalizeStack(layers: FxLayer[]) {
  return layers.map((layer) => ({
    ...layer,
    intensity: Math.max(0, Math.min(1, layer.intensity))
  }));
}

export function FxComposerNode({ data }: NodeProps) {
  const nodeData = data as unknown as FxComposerNodeData;
  const [layers, setLayers] = useState<FxLayer[]>(nodeData.fxStack ?? []);

  const setAndPersist = (next: FxLayer[]) => {
    const normalized = normalizeStack(next);
    setLayers(normalized);
    nodeData.fxStack = normalized;
  };

  const addLayer = () => {
    setAndPersist([
      ...layers,
      {
        layerId: crypto.randomUUID(),
        type: "speed-lines",
        intensity: 0.65,
        blendMode: "screen",
        enabled: true
      }
    ]);
  };

  const removeLayer = (layerId: string) => {
    setAndPersist(layers.filter((layer) => layer.layerId !== layerId));
  };

  const moveLayer = (layerId: string, direction: -1 | 1) => {
    const index = layers.findIndex((layer) => layer.layerId === layerId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= layers.length) return;
    const next = [...layers];
    const [layer] = next.splice(index, 1);
    next.splice(target, 0, layer);
    setAndPersist(next);
  };

  const updateLayer = <K extends keyof FxLayer>(layerId: string, key: K, value: FxLayer[K]) => {
    setAndPersist(
      layers.map((layer) => (layer.layerId === layerId ? { ...layer, [key]: value } : layer))
    );
  };

  return (
    <div className="studio-node">
      <Handle type="target" position={Position.Left} />
      <h3>{nodeData.title}</h3>
      <p className="muted">Layer stack output feeds Sakuga node render settings.</p>
      <button type="button" className="ghost-button" onClick={addLayer}>Add FX Layer</button>
      <div className="fx-layer-list">
        {layers.map((layer, index) => (
          <article key={layer.layerId} className="fx-layer-item">
            <div className="fx-layer-head">
              <strong>Layer {index + 1}</strong>
              <div className="row-buttons">
                <button type="button" className="ghost-button" onClick={() => moveLayer(layer.layerId, -1)}>Up</button>
                <button type="button" className="ghost-button" onClick={() => moveLayer(layer.layerId, 1)}>Down</button>
                <button type="button" className="danger-button" onClick={() => removeLayer(layer.layerId)}>Remove</button>
              </div>
            </div>
            <div className="grid-two">
              <label>
                FX Type
                <select value={layer.type} onChange={(event) => updateLayer(layer.layerId, "type", event.target.value)}>
                  {fxTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                Blend
                <input
                  value={layer.blendMode}
                  onChange={(event) => updateLayer(layer.layerId, "blendMode", event.target.value)}
                />
              </label>
            </div>
            <div className="grid-two">
              <label>
                Intensity
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={layer.intensity}
                  onChange={(event) => updateLayer(layer.layerId, "intensity", Number(event.target.value))}
                />
              </label>
              <label>
                Enabled
                <select
                  value={layer.enabled ? "yes" : "no"}
                  onChange={(event) => updateLayer(layer.layerId, "enabled", event.target.value === "yes")}
                >
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
      <p className="pill">FX Layers: {layers.length}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
