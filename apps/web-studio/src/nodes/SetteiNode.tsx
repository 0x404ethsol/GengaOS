import { Handle, Position, type NodeProps } from "@xyflow/react";

export function SetteiNode({ id, data }: NodeProps) {
  const nodeData = data as any;
  return (
    <div className="studio-node settei-node" style={{ minWidth: "450px", background: "#1a1a24", border: "2px solid #ffaa00", borderRadius: "12px", padding: 0, overflow: "hidden", boxShadow: "0 0 20px rgba(255, 170, 0, 0.15)" }}>
      <Handle type="source" position={Position.Right} id="identity-out" />
      <div style={{ background: "#ffaa00", padding: "8px 15px", color: "#000", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
         <span>{nodeData.title || "Absolute Settei (Model Sheet)"}</span>
         <span style={{ fontSize: "10px", background: "#000", color: "#ffaa00", padding: "2px 6px", borderRadius: "4px" }}>IP-ADAPTER LOCKED</span>
      </div>
      <div style={{ padding: "15px" }}>
         <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            {[
              { label: "FRONT", img: "https://images.unsplash.com/photo-1544502062-f82887f03d1c?q=80&w=100&auto=format&fit=crop" },
              { label: "3/4 LEFT", img: "https://images.unsplash.com/photo-1517404215738-15263e9f9178?q=80&w=100&auto=format&fit=crop" },
              { label: "PROFILE", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" },
              { label: "BACK", img: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?q=80&w=100&auto=format&fit=crop" },
              { label: "ACTION", img: "https://images.unsplash.com/photo-1616712134411-6b6ae89bc3ba?q=80&w=100&auto=format&fit=crop" }
            ].map(angle => (
               <div key={angle.label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ background: "#000", height: "80px", border: "1px solid #333", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                     <img src={angle.img} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} />
                  </div>
                  <span style={{ fontSize: "9px", color: "#888", textAlign: "center", letterSpacing: "1px" }}>{angle.label}</span>
               </div>
            ))}
         </div>
         <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "10px", color: "#aaa" }}>Character LoRA / Checkpoint Target</label>
            <input type="text" defaultValue="lora:kyoshiro_v3:0.85" style={{ background: "#111", border: "1px solid #333", padding: "6px", color: "#ffaa00", borderRadius: "4px", fontFamily: "monospace", fontSize: "11px" }} />
         </div>
      </div>
    </div>
  );
}
