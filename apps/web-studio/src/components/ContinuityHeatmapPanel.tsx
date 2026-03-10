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
  const [tags, setTags] = useState("pose-drift,prop-drift");
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
          .filter(Boolean)
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

      <div className="row-buttons">
        <button type="button" onClick={runScan}>Run Scan</button>
        <button type="button" className="ghost-button" onClick={requestRetake}>Generate Retake</button>
      </div>

      <div className="heatmap-track" aria-label="Continuity score heatmap">
        <div className="heatmap-fill" style={{ width: `${heatPercent}%` }} />
      </div>
      <p className="muted"><strong>Overall:</strong> {overall === null ? "Not scanned" : `${heatPercent}%`}</p>

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
