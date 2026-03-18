import { useState } from "react";
import { controlApi } from "../lib/api";

type ContinuityIssue = {
  category: string;
  severity: string;
  score: number;
  detail: string;
};

interface ContinuityHeatmapPanelProps {
  onStatus: (value: string) => void;
}

export function ContinuityHeatmapPanel({ onStatus }: ContinuityHeatmapPanelProps) {
  const [actorLockId, setActorLockId] = useState("");
  const [frameA, setFrameA] = useState("");
  const [frameB, setFrameB] = useState("");
  const [tags, setTags] = useState("pose-drift,prop-drift,spatial-axis");
  const [overall, setOverall] = useState<number | null>(null);
  const [issues, setIssues] = useState<ContinuityIssue[]>([]);
  const [retakePlan, setRetakePlan] = useState("");

  const runScan = async () => {
    if (!actorLockId) {
      onStatus("Continuity scan needs actor lock id");
      return;
    }
    const response = await controlApi.continuityScan({
      actorLockId,
      frameA,
      frameB,
      context: {
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        framing_a: "medium-shot-left",
        framing_b: "close-up-right",
        motion_vector: tags.includes("spatial-axis") ? "flip" : "pan"
      }
    });
    setOverall(response.overallScore ?? null);
    setIssues(response.issues ?? []);
    onStatus(`Continuity scan complete: ${response.overallScore}`);
  };

  const requestRetake = async () => {
    const response = await controlApi.retakePlan({
      continuityIssues: issues.map((issue) => issue.category),
      sceneIntent: "Stabilize continuity before final accept"
    });
    setRetakePlan(response.plan);
    onStatus("Retake plan generated from continuity issues");
  };

  const heatPercent = overall === null ? 0 : Math.max(0, Math.min(100, Math.round(overall * 100)));

  return (
    <section className="panel-block continuity-panel">
      <h2>Continuity Heatmap</h2>
      <p className="muted">Scan identity, pose, prop, and axis continuity before final acceptance.</p>
      <label>
        Actor Lock ID
        <input value={actorLockId} onChange={(event) => setActorLockId(event.target.value)} />
      </label>
      <div className="grid-two">
        <label>
          Frame A URL
          <input value={frameA} onChange={(event) => setFrameA(event.target.value)} />
        </label>
        <label>
          Frame B URL
          <input value={frameB} onChange={(event) => setFrameB(event.target.value)} />
        </label>
      </div>
      <label>
        Scan Tags (CSV)
        <input value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>

      <div className="row-buttons" style={{ marginBottom: "20px" }}>
        <button type="button" onClick={runScan}>Run Motion Scan</button>
        <button type="button" className="ghost-button" onClick={requestRetake}>Re-Chart Vectors</button>
      </div>

      {/* Modern MAPPA level motion vector flow visually */}
      <div style={{ background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "12px", marginBottom: "20px", position: "relative", boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" }}>
         <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#888", marginBottom: "12px", letterSpacing: "1px" }}>
            <span>MOMENTUM FLOW ANALYSIS</span>
            <span style={{ color: "#4cff91", animation: "pulse 2s infinite" }}>● SENSOR ACTIVE</span>
         </div>
         <div style={{ position: "relative", height: "120px", background: "#1a1e28", borderRadius: "4px", overflow: "hidden" }}>
            {/* Grid */}
            <div style={{ position: "absolute", inset: 0, backgroundSize: "20px 20px", backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)" }} />
            
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                <defs>
                   <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                     <polygon points="0 0, 10 3.5, 0 7" fill="#4cff91" />
                   </marker>
                   <marker id="arrowhead-fail" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                     <polygon points="0 0, 10 3.5, 0 7" fill="#ff4c4c" />
                   </marker>
                </defs>
                {/* Visual vectors representing cuts */}
                <path d="M 20,90 L 140,40" fill="none" stroke="#4cff91" strokeWidth="4" markerEnd="url(#arrowhead)" strokeLinecap="round" />
                <path d="M 170,30 L 280,80" fill="none" stroke="#ff4c4c" strokeWidth="4" markerEnd="url(#arrowhead-fail)" strokeDasharray="6 6" strokeLinecap="round" />
                
                <circle cx="20" cy="90" r="4" fill="#4cff91" />
                <circle cx="170" cy="30" r="4" fill="#ff4c4c" />

                <text x="100" y="30" fill="#fff" fontSize="10" opacity="0.8">Cut A (Pan Right)</text>
                <text x="180" y="100" fill="#ff4c4c" fontSize="10" fontWeight="bold">⚠️ Cut B (180° Axis Broken)</text>
            </svg>
         </div>
         <div style={{ marginTop: "10px", fontSize: "11px", color: "#aaa" }}>
           Axis Continuity Break detected between Shot 14 and 15. Momentum transfer fails resulting in visual whiplash.
         </div>
      </div>

      <p className="muted" style={{ borderTop: "1px solid #333", paddingTop: "15px" }}><strong>Heatmap Aggregate:</strong> {overall === null ? "Not scanned" : `${heatPercent}% Stability`}</p>

      <div className="issue-list">
        {issues.map((issue) => (
          <article key={`${issue.category}-${issue.detail}`} className="issue-item">
            <div className="issue-item-head">
              <strong>{issue.category}</strong>
              <span className="pill">{issue.severity}</span>
            </div>
            <p className="muted">{issue.detail}</p>
            <p className="muted"><strong>Score:</strong> {Math.round(issue.score * 100)}%</p>
          </article>
        ))}
        {!issues.length ? <p className="muted">No continuity issues yet.</p> : null}
      </div>

      {retakePlan ? <p className="muted"><strong>Retake Plan:</strong> {retakePlan}</p> : null}
    </section>
  );
}
