import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { TimelineNodeData } from "../types";

export function TimelineNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as TimelineNodeData;
  return (
    <div className="studio-node timeline-dope-sheet" style={{ minWidth: "400px", background: "#1a1e28", border: "1px solid #3a3f58", borderRadius: "8px", padding: 0, overflow: "hidden" }}>
      <Handle type="target" position={Position.Left} />
      
      <div style={{ padding: "10px 15px", background: "#2a2f42", borderBottom: "1px solid #3a3f58" }}>
         <h3 style={{ margin: 0, color: "#fff", display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span>{nodeData.title} | X-Sheet</span>
            <span style={{ fontSize: "10px", backgroundColor: "#ff4c4c", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", letterSpacing: "1px" }}>24 FPS SYNC</span>
         </h3>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", padding: "15px" }}>
          {/* Audio Waveform Track */}
          <div style={{ height: "45px", background: "#111", borderRadius: "6px", marginBottom: "15px", position: "relative", overflow: "hidden", border: "1px solid #222" }}>
             <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#3a3f58" }} />
             <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0,50 Q5,30 10,50 T20,50 T30,20 T40,50 T50,80 T60,50 T70,10 T80,50 T90,70 T100,50" fill="none" stroke="#4cff91" strokeWidth="2" />
             </svg>
             <span style={{ position: "absolute", bottom: "4px", left: "6px", fontSize: "9px", color: "#4cff91", letterSpacing: "1px" }}>AUDIO SYNC ACTIVE // wav2lip bounds</span>
          </div>

          {/* Dope Sheet Tracks */}
          <div style={{ display: "flex", gap: "8px" }}>
             {/* Frame Numbers */}
             <div style={{ flex: 0.8, background: "#111", padding: "8px", borderRadius: "6px", border: "1px solid #222" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "8px", borderBottom: "1px solid #333", paddingBottom: "4px" }}>FRM</div>
                {[1,2,3,4,5].map(f => <div key={f} style={{ fontSize: "11px", color: "#666", height: "22px", borderBottom: "1px solid #222", display: "flex", alignItems: "center" }}>{String(f).padStart(3, '0')}</div>)}
             </div>
             
             {/* Action / Cell A */}
             <div style={{ flex: 3, background: "#1b1b1b", padding: "8px", borderRadius: "6px", border: "1px solid #222" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "8px", borderBottom: "1px solid #333", paddingBottom: "4px" }}>CELL A (BODY ACTION)</div>
                <div style={{ fontSize: "11px", color: "#ff4c4c", height: "22px", background: "rgba(255, 76, 76, 0.1)", borderLeft: "2px solid #ff4c4c", paddingLeft: "6px", display: "flex", alignItems: "center" }}>◉ KEYFRAME (Impact)</div>
                <div style={{ fontSize: "11px", color: "#aaa", height: "22px", paddingLeft: "6px", display: "flex", alignItems: "center" }}>| In-between</div>
                <div style={{ fontSize: "11px", color: "#aaa", height: "22px", paddingLeft: "6px", display: "flex", alignItems: "center" }}>| In-between</div>
                <div style={{ fontSize: "11px", color: "#ff4c4c", height: "22px", background: "rgba(255, 76, 76, 0.1)", borderLeft: "2px solid #ff4c4c", paddingLeft: "6px", display: "flex", alignItems: "center" }}>◉ KEYFRAME (Settle)</div>
                <div style={{ fontSize: "11px", color: "#aaa", height: "22px", paddingLeft: "6px", display: "flex", alignItems: "center" }}>| In-between</div>
             </div>
             
             {/* Dialogue / Visemes */}
             <div style={{ flex: 2, background: "#16181d", padding: "8px", borderRadius: "6px", border: "1px solid #222" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "8px", borderBottom: "1px solid #333", paddingBottom: "4px" }}>LIP SYNC</div>
                <div style={{ fontSize: "11px", color: "#4cff91", height: "22px", display: "flex", alignItems: "center" }}>A (Open)</div>
                <div style={{ fontSize: "11px", color: "#4cff91", height: "44px", borderLeft: "2px solid #4cff91", paddingLeft: "6px", background: "rgba(76, 255, 145, 0.05)", display: "flex", alignItems: "center" }}>Hold Viseme</div>
                <div style={{ fontSize: "11px", color: "#4cff91", height: "22px", display: "flex", alignItems: "center" }}>M (Closed)</div>
             </div>
          </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
