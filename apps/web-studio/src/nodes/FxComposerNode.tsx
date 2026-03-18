import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { FxComposerNodeData } from "../types";

export function FxComposerNode({ data }: NodeProps) {
  const nodeData = data as unknown as FxComposerNodeData;
  const [layers, setLayers] = useState<any[]>(nodeData.fxStack ?? [
     { id: "1", type: "Film-Grain (35mm)", active: true, opacity: 0.15 },
     { id: "2", type: "Chromatic Aberration", active: true, opacity: 0.30 },
     { id: "3", type: "Anamorphic Lens Flare", active: true, opacity: 0.75 }
  ]);

  return (
    <div className="studio-node fx-composer" style={{ minWidth: "350px", background: "#1a1e24", border: "2px solid #b34cff", borderRadius: "12px", padding: 0, overflow: "hidden", boxShadow: "0 0 20px rgba(179, 76, 255, 0.15)" }}>
      <Handle type="target" position={Position.Left} />
      
      <div style={{ background: "#b34cff", padding: "8px 15px", color: "#fff", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
         <span>{nodeData.title || "VFX Compositor Rack"}</span>
         <span style={{ fontSize: "10px", background: "#000", color: "#b34cff", padding: "2px 6px", borderRadius: "4px" }}>NUKE PROTOCOL</span>
      </div>

      <div style={{ padding: "15px" }}>
        <p style={{ fontSize: "11px", color: "#888", marginBottom: "15px" }}>Applies post-processing shaders over generated frames (Bloom, Flare, Grain).</p>
        
        <div style={{ background: "#111", borderRadius: "6px", border: "1px solid #333", overflow: "hidden" }}>
           <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 60px", background: "#222", padding: "6px 10px", fontSize: "10px", color: "#888", borderBottom: "1px solid #333" }}>
              <span>ON</span>
              <span>SHADER TYPE</span>
              <span>OPACITY</span>
           </div>
           
           <div style={{ display: "flex", flexDirection: "column" }}>
              {layers.map((layer, index) => (
                 <div key={layer.id} style={{ display: "grid", gridTemplateColumns: "30px 1fr 60px", padding: "8px 10px", fontSize: "12px", color: "#ccc", borderBottom: index < layers.length-1 ? "1px solid #222" : "none", background: layer.active ? "#151515" : "#0d0d0d" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input type="checkbox" defaultChecked={layer.active} style={{ accentColor: "#b34cff" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", color: layer.active ? "#fff" : "#555" }}>
                      {layer.type}
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <input type="number" defaultValue={layer.opacity} step="0.05" min="0" max="1" style={{ width: "45px", background: "#000", border: "1px solid #333", color: "#fff", fontSize: "10px", borderRadius: "3px", padding: "2px 4px" }} />
                    </div>
                 </div>
              ))}
           </div>
        </div>

        <button type="button" style={{ width: "100%", marginTop: "15px", background: "rgba(179, 76, 255, 0.1)", border: "1px dashed #b34cff", color: "#b34cff", padding: "8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>
          + Add Compositing Shader
        </button>
      </div>
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
