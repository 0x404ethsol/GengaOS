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
      <div className="panel-head">
        <h2>{getAnimeSectionLabel("cut")} Redline + Approval</h2>
        <span className="pill">Status: {approvalStatus}</span>
      </div>
      <p className="muted">Frame-level redlines and approval gate controls block delivery until director sign-off.</p>

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
