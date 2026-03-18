import { Handle, Position, type NodeProps } from "@xyflow/react";

export function MultiplaneNode({ id, data }: NodeProps) {
  const nodeData = data as any;
  const layers = nodeData.layers;

  return (
    <div className="studio-node multiplane-node" style={{ minWidth: "350px", background: "#1a2228", border: "2px solid #00d2ff", borderRadius: "12px", padding: 0, overflow: "hidden", boxShadow: "0 0 20px rgba(0, 210, 255, 0.15)" }}>
      <Handle type="target" position={Position.Left} id="render-in" />
      <div style={{ background: "#00d2ff", padding: "8px 15px", color: "#000", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
         <span>{nodeData.title || "Multiplane Depth Engine"}</span>
         <span style={{ fontSize: "10px", background: "#000", color: "#00d2ff", padding: "2px 6px", borderRadius: "4px" }}>PARALLAX ACTIVE</span>
      </div>
      <div style={{ padding: "15px" }}>
         <p style={{ fontSize: "11px", color: "#888", marginBottom: "15px" }}>Auto-separates output into Foreground, Midground, and Background via Depth Estimation.</p>
         
         <div style={{ position: "relative", height: "180px", background: "#0e1114", border: "1px solid #222", borderRadius: "8px", perspective: "1000px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {/* 3D Isometric View Mockup */}
            <div style={{ transformStyle: "preserve-3d", transform: "rotateX(20deg) rotateY(-30deg)", width: "120px", height: "80px", position: "relative" }}>
               {/* Background Layer */}
               <div style={{ position: "absolute", width: "100%", height: "100%", background: "rgba(0, 210, 255, 0.1)", border: "1px solid rgba(0, 210, 255, 0.5)", transform: "translateZ(-60px)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                 {layers?.bg ? <img src={layers.bg} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} /> : <span style={{ fontSize: "8px", color: "#00d2ff" }}>BACKGROUND</span>}
               </div>
               
               {/* Midground Layer */}
               <div style={{ position: "absolute", width: "100%", height: "100%", background: "rgba(255, 76, 76, 0.1)", border: "1px solid rgba(255, 76, 76, 0.5)", transform: "translateZ(0px)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                 {layers?.mg ? <img src={layers.mg} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: "8px", color: "#ff4c4c" }}>MIDGROUND</span>}
               </div>

               {/* Foreground Layer */}
               <div style={{ position: "absolute", width: "100%", height: "100%", background: "rgba(76, 255, 145, 0.1)", border: "1px solid rgba(76, 255, 145, 0.5)", transform: "translateZ(60px)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                 {layers?.fg ? <img src={layers.fg} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "8px", color: "#4cff91" }}>FOREGROUND</span>}
               </div>
               
               {/* Connective vectors */}
               <div style={{ position: "absolute", top: "50%", left: "50%", width: "1px", height: "120px", background: "dashed 1px #888", transform: "rotateX(90deg) translateZ(-60px)", transformOrigin: "top" }} />
            </div>
         </div>
         
         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "5px", marginTop: "15px" }}>
            {[
              { id: "bg", label: "BG Pass", color: "#00d2ff" },
              { id: "mg", label: "MD Pass", color: "#ff4c4c" },
              { id: "fg", label: "FG Pass", color: "#4cff91" }
            ].map(l => (
               <div key={l.id} style={{ background: "#111", padding: "6px", borderRadius: "4px", fontSize: "9px", color: "#ccc", display: "flex", justifyContent: "space-between", borderLeft: layers ? `2px solid ${l.color}` : "2px solid #333" }}>
                  <span>{l.label}</span>
                  <span style={{ color: layers ? l.color : "#555" }}>{layers ? "✓ Rendered" : "Waiting"}</span>
               </div>
            ))}
         </div>
         <button disabled={!layers} style={{ width: "100%", marginTop: "15px", background: layers ? "rgba(0, 210, 255, 0.2)" : "transparent", border: layers ? "1px solid #00d2ff" : "1px dashed #555", color: layers ? "#00d2ff" : "#555", padding: "8px", borderRadius: "4px", cursor: layers ? "pointer" : "default", fontSize: "11px", letterSpacing: "1px" }}>
           {layers ? "EXPORT COMP LAYER PACK" : "AWAITING RENDER GRAPH..."}
         </button>
      </div>
      <Handle type="source" position={Position.Right} id="multiplane-out" />
    </div>
  );
}
