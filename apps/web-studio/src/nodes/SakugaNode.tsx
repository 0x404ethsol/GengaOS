import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getAnimeActionLabel, type SakugaTimeline } from "@genga/contracts";
import { controlApi } from "../lib/api";
import type { SakugaNodeData } from "../types";

const defaultTimeline: SakugaTimeline = {
  holds: [],
  smears: [],
  impacts: [],
  shake: []
};

export function SakugaNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as SakugaNodeData;
  const [timeline, setTimeline] = useState<SakugaTimeline>(nodeData.timeline ?? defaultTimeline);
  const [videoRef, setVideoRef] = useState("https://example.com/donnie_yen_kick.mp4");
  const [extractionMode, setExtractionMode] = useState("dwpose");

  const setAndPersistTimeline = (next: typeof timeline) => {
    setTimeline(next);
    nodeData.timeline = next;
  };

  const onKeyframe = async () => {
    const result = await controlApi.generateKeyframes({ ...nodeData as any });
    nodeData.jobId = result.jobId;
    nodeData.status = result.status;
  };

  const onInterpolate = async () => {
    const result = await controlApi.interpolate({ ...nodeData as any });
    nodeData.jobId = result.jobId;
    nodeData.status = result.status;
  };

  return (
    <div className="studio-node sakuga-node" style={{ minWidth: "400px", background: "#1a1e24", border: "2px solid #ff4c4c", borderRadius: "12px", padding: 0, overflow: "hidden", boxShadow: "0 0 20px rgba(255, 76, 76, 0.15)" }}>
      <Handle type="target" position={Position.Left} id="in-actor" />
      
      <div style={{ background: "#ff4c4c", padding: "8px 15px", color: "#fff", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
         <span>{nodeData.title || "Sakuga AI Engine (V2V)"}</span>
         <span style={{ fontSize: "10px", background: "#000", color: "#ff4c4c", padding: "2px 6px", borderRadius: "4px" }}>ANIMATEDIFF + CONTROLNET</span>
      </div>

      <div style={{ padding: "15px" }}>
        {(nodeData as any).generatedUrl && (
          <div style={{ margin: "0 0 15px 0", borderRadius: "8px", overflow: "hidden", border: "2px solid #4cff91", boxShadow: "0 0 15px rgba(76, 255, 145, 0.3)" }}>
             <img src={(nodeData as any).generatedUrl} alt="Final Render" style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }} />
             <div style={{ background: "#111", padding: "4px", fontSize: "10px", textAlign: "center", color: "#4cff91", letterSpacing: "1px", textTransform: "uppercase", fontWeight: "bold" }}>
               FINAL RENDER COMPLETED
             </div>
          </div>
        )}

        <div style={{ background: "#111", border: "1px dashed #555", borderRadius: "6px", padding: "10px", marginBottom: "15px" }}>
           <div style={{ fontSize: "10px", color: "#aaa", marginBottom: "8px", fontWeight: "bold", letterSpacing: "1px" }}>KINEMATICS VIDEO SOURCE (.MP4)</div>
           <input type="text" value={videoRef} onChange={e => setVideoRef(e.target.value)} style={{ width: "100%", background: "#000", border: "1px solid #333", color: "#fff", padding: "6px", borderRadius: "4px", fontSize: "11px", marginBottom: "8px" }} />
           
           <div style={{ display: "flex", gap: "10px" }}>
             <select value={extractionMode} onChange={e => setExtractionMode(e.target.value)} style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#ccc", padding: "4px", borderRadius: "4px", fontSize: "10px" }}>
                <option value="dwpose">Extract: DWPose Skeleton</option>
                <option value="depth">Extract: Depth Map</option>
                <option value="canny">Extract: Canny Edges</option>
             </select>
             <button style={{ background: "#ff4c4c", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 8px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>PROCESS</button>
           </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
           <div style={{ background: "#16181d", padding: "8px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ fontSize: "9px", color: "#aaa", marginBottom: "4px" }}>TEMPORAL SMOOTHING</div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#ff4c4c" }} />
                <span style={{ fontSize: "10px", color: "#ccc" }}>Cross-Frame Attention</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#ff4c4c" }} />
                <span style={{ fontSize: "10px", color: "#ccc" }}>AnimateDiff Latents</span>
              </div>
           </div>
           
           <div style={{ background: "#16181d", padding: "8px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ fontSize: "9px", color: "#aaa", marginBottom: "4px" }}>CAMERA OVERRIDE</div>
              <select style={{ width: "100%", background: "#000", border: "1px solid #333", color: "#ccc", padding: "4px", borderRadius: "4px", fontSize: "10px" }}>
                <option>Locked to Video</option>
                <option>Custom Deforum Path</option>
                <option>Slow Zoom In</option>
              </select>
           </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onKeyframe} style={{ flex: 1, background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px", padding: "8px", fontSize: "11px", cursor: "pointer" }}>RENDER KEYFRAMES</button>
          <button onClick={onInterpolate} style={{ flex: 1, background: "#ff4c4c", color: "#fff", border: "none", borderRadius: "4px", padding: "8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 0 10px rgba(255, 76, 76, 0.4)" }}>GENERATE VIDEO</button>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="out-video" />
    </div>
  );
}
