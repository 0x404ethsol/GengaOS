import { useEffect, useState } from "react";
import { getAnimeSectionLabel } from "@genga/contracts";
import { controlApi } from "../lib/api";

type Redline = {
  redlineId: string;
  startFrame: number;
  endFrame: number;
  drawPathRef: string;
  severity: string;
  note: string;
};

interface RedlineApprovalPanelProps {
  projectId: string;
  shotId: string;
  onStatus: (value: string) => void;
  onApprovalStatusChange: (value: string) => void;
}

export function RedlineApprovalPanel({
  projectId,
  shotId,
  onStatus,
  onApprovalStatusChange
}: RedlineApprovalPanelProps) {
  const [startFrame, setStartFrame] = useState(1);
  const [endFrame, setEndFrame] = useState(8);
  const [drawPathRef, setDrawPathRef] = useState("overlay://redline/path-01");
  const [severity, setSeverity] = useState("warning");
  const [note, setNote] = useState("Adjust silhouette readability on contact frame.");
  const [reviewer, setReviewer] = useState("director");
  const [annotations, setAnnotations] = useState<Redline[]>([]);
  const [approvalStatus, setApprovalStatus] = useState("draft");

  const refresh = async () => {
    const [redlines, gate] = await Promise.all([
      controlApi.listRedlines(projectId, shotId),
      controlApi.getApprovalGate(projectId, shotId)
    ]);
    setAnnotations((redlines.annotations ?? []) as Redline[]);
    setApprovalStatus(gate.status ?? "draft");
    onApprovalStatusChange(gate.status ?? "draft");
  };

  useEffect(() => {
    refresh();
  }, [projectId, shotId]);

  const addRedline = async () => {
    await controlApi.createRedline({
      projectId,
      shotId,
      startFrame,
      endFrame,
      drawPathRef,
      severity,
      note
    });
    await refresh();
    onStatus("Redline annotation added");
  };

  const applyDecision = async (action: "submit" | "approve" | "request-changes" | "reject") => {
    const gate = await controlApi.applyApprovalAction(projectId, shotId, action, reviewer, note);
    setApprovalStatus(gate.status ?? "draft");
    onApprovalStatusChange(gate.status ?? "draft");
    onStatus(`Approval action '${action}' applied`);
  };

  return (
    <section className="panel-block redline-panel">
      <div className="panel-head" style={{ marginBottom: "15px" }}>
        <h2 style={{ margin: 0 }}>{getAnimeSectionLabel("cut")} Redline + Approval</h2>
        <span className="pill" style={{ background: approvalStatus === "approved" ? "#4cff91" : "#ff4c4c", color: "#000" }}>{approvalStatus}</span>
      </div>
      <p className="muted" style={{ marginBottom: "15px" }}>The Lightbox Retake Engine. Draw Over AI directly into a ControlNet fixing loop.</p>

      {/* The Lightbox Onion-skin Interface */}
      <div className="lightbox-surface" style={{ background: "#000", border: "1px solid #333", height: "180px", borderRadius: "8px", position: "relative", marginBottom: "20px", overflow: "hidden" }}>
         <img src="https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=400&auto=format&fit=crop" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
         
         <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
            <path d="M50,50 Q100,100 150,60 T250,80" fill="none" stroke="#ff4c4c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="250" cy="80" r="5" fill="#ff4c4c" />
            <text x="150" y="45" fill="#ff4c4c" fontSize="12" fontWeight="bold">Fix Silhouette Angle</text>
         </svg>
         
         <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", gap: "8px", background: "rgba(0,0,0,0.8)", padding: "4px", borderRadius: "12px" }}>
            <button style={{ background: "#ff4c4c", width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #fff", cursor: "pointer" }} />
            <button style={{ background: "#4cff91", width: "18px", height: "18px", borderRadius: "50%", border: "none", cursor: "pointer" }} />
            <button style={{ background: "#fff", width: "18px", height: "18px", borderRadius: "50%", border: "none", cursor: "pointer" }} />
         </div>
         <div style={{ position: "absolute", bottom: "10px", left: "10px", background: "rgba(0,0,0,0.8)", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", color: "#fff", letterSpacing: "1px" }}>
            🖌️ ONION SKIN ACTIVE
         </div>
      </div>

      <div className="grid-two">
        <label>
          Start Frame
          <input type="number" value={startFrame} onChange={(event) => setStartFrame(Number(event.target.value))} />
        </label>
        <label>
          End Frame
          <input type="number" value={endFrame} onChange={(event) => setEndFrame(Number(event.target.value))} />
        </label>
      </div>

      <label>
        Draw Path Ref
        <input value={drawPathRef} onChange={(event) => setDrawPathRef(event.target.value)} />
      </label>

      <div className="grid-two">
        <label>
          Severity
          <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="critical">critical</option>
          </select>
        </label>
        <label>
          Reviewer
          <input value={reviewer} onChange={(event) => setReviewer(event.target.value)} />
        </label>
      </div>

      <label>
        Note
        <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>

      <div className="row-buttons">
        <button type="button" onClick={addRedline}>Add Redline</button>
        <button type="button" className="ghost-button" onClick={() => applyDecision("submit")}>Submit</button>
        <button type="button" className="ghost-button" onClick={() => applyDecision("approve")}>Approve</button>
        <button type="button" className="ghost-button" onClick={() => applyDecision("request-changes")}>Request Changes</button>
        <button type="button" className="danger-button" onClick={() => applyDecision("reject")}>Reject</button>
      </div>

      <div className="issue-list">
        {annotations.map((annotation) => (
          <article key={annotation.redlineId} className="issue-item">
            <div className="issue-item-head">
              <strong>{annotation.startFrame}-{annotation.endFrame}</strong>
              <span className="pill">{annotation.severity}</span>
            </div>
            <p className="muted">{annotation.note}</p>
            <p className="muted">{annotation.drawPathRef}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
