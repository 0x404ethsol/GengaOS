import { useMemo, useState } from "react";
import { getAnimeSectionLabel } from "@genga/contracts";
import { controlApi } from "../lib/api";

type Clip = {
  id: string;
  name: string;
  inFrame: number;
  outFrame: number;
  note: string;
};

const initialClips: Clip[] = [
  { id: "clip-1", name: "Opening Shrine Push-In", inFrame: 1, outFrame: 42, note: "Slow reveal, high tension." },
  { id: "clip-2", name: "Impact Reaction Close-Up", inFrame: 43, outFrame: 88, note: "Hold 2 frames after impact." }
];

function clampFrame(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

interface VideoEditorPanelProps {
  projectId: string;
  graphOutputs: Array<{ nodeId: string; title: string; jobId?: string; status?: string }>;
  approvalStatus?: string;
  onStatus: (value: string) => void;
}

export function VideoEditorPanel({ projectId, graphOutputs, approvalStatus = "draft", onStatus }: VideoEditorPanelProps) {
  const [clips, setClips] = useState<Clip[]>(initialClips);
  const [status, setStatus] = useState("Rough cut ready");

  const totalFrames = useMemo(
    () => clips.reduce((sum, clip) => sum + Math.max(0, clip.outFrame - clip.inFrame + 1), 0),
    [clips]
  );
  const totalSeconds = useMemo(() => (totalFrames / 24).toFixed(2), [totalFrames]);

  const addClip = () => {
    const index = clips.length + 1;
    const start = totalFrames + 1;
    setClips((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: `New Scene Clip ${index}`,
        inFrame: start,
        outFrame: start + 24,
        note: "Describe action beat."
      }
    ]);
    setStatus("Clip inserted");
  };

  const removeClip = (clipId: string) => {
    setClips((current) => current.filter((clip) => clip.id !== clipId));
    setStatus("Clip removed");
  };

  const moveClip = (clipId: string, direction: -1 | 1) => {
    setClips((current) => {
      const index = current.findIndex((clip) => clip.id === clipId);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [entry] = next.splice(index, 1);
      next.splice(nextIndex, 0, entry);
      return next;
    });
    setStatus(direction < 0 ? "Moved clip up" : "Moved clip down");
  };

  const updateClip = <K extends keyof Clip>(clipId: string, key: K, value: Clip[K]) => {
    setClips((current) =>
      current.map((clip) =>
        clip.id === clipId
          ? {
              ...clip,
              [key]:
                key === "inFrame" || key === "outFrame"
                  ? clampFrame(Number(value))
                  : value
            }
          : clip
      )
    );
  };

  const syncFromGraph = () => {
    if (!graphOutputs.length) {
      setStatus("No graph outputs available to sync");
      onStatus("Video editor sync skipped: no graph outputs");
      return;
    }

    const synced = graphOutputs.map((output, index) => {
      const start = index * 48 + 1;
      return {
        id: output.nodeId,
        name: `${output.title} (${output.status ?? "pending"})`,
        inFrame: start,
        outFrame: start + 47,
        note: output.jobId ? `Render job: ${output.jobId}` : "Awaiting render output"
      };
    });

    setClips(synced);
    setStatus(`Synced ${synced.length} clips from graph`);
    onStatus(`Video editor synced from ${synced.length} graph outputs`);
  };

  const buildAnimaticQueue = async () => {
    const response = await controlApi.buildAnimaticQueue({
      projectId,
      audioTracks: [{ trackId: "trk-main", name: "Main Theme", durationSeconds: Number(totalSeconds), bpm: 120 }],
      beatMarkers: clips.map((clip) => ({ frame: clip.inFrame, intensity: 0.7, note: clip.name })),
      clipCuts: clips.map((clip) => ({
        clipId: clip.id,
        sceneNodeId: clip.id,
        startFrame: clip.inFrame,
        endFrame: clip.outFrame,
        transition: "cut"
      }))
    });
    setStatus(`Animatic queue built (${response.queue?.length ?? 0} items)`);
    onStatus(`Animatic queue generated`);
  };

  const exportDeliverable = async (deliverableType: string, label: string) => {
    if (approvalStatus !== "approved") {
      setStatus(`Export blocked: approval status is '${approvalStatus}'`);
      onStatus(`Deliverable blocked until approval gate is approved`);
      return;
    }
    const response = await controlApi.exportDeliverable(
      projectId,
      deliverableType,
      clips.map((clip) => clip.id)
    );
    setStatus(`${label} queued: ${response.artifactId}`);
    onStatus(`${label} export queued`);
  };

  const resumeLastGoodFrame = async () => {
    const candidate = graphOutputs.find((output) => output.jobId);
    if (!candidate?.jobId) {
      setStatus("No render job found to resume");
      return;
    }
    const resumed = await controlApi.resumeRenderJob(candidate.jobId, 24);
    setStatus(`Resumed render: ${resumed.jobId}`);
    onStatus(`Resume from last good frame started`);
  };

  return (
    <section className="panel-block video-editor-panel">
      <div className="panel-head">
        <h2>{getAnimeSectionLabel("cut")} Scene Cut Editor</h2>
        <button type="button" className="ghost-button" onClick={addClip}>
          Add Clip
        </button>
      </div>
      <p className="muted">
        Build rough cuts directly in the IDE before final delivery.
      </p>
      <div className="video-stats">
        <span className="pill">Clips: {clips.length}</span>
        <span className="pill">Frames: {totalFrames}</span>
        <span className="pill">Duration: {totalSeconds}s</span>
        <span className="pill">Approval: {approvalStatus}</span>
      </div>

      <div className="row-buttons">
        <button type="button" className="ghost-button" onClick={syncFromGraph}>Sync From Graph</button>
        <button type="button" className="ghost-button" onClick={buildAnimaticQueue}>Build Queue</button>
        <button type="button" className="ghost-button" onClick={resumeLastGoodFrame}>Resume Last Good Frame</button>
      </div>

      <div className="clip-list">
        {clips.map((clip, index) => (
          <article key={clip.id} className="clip-item">
            <div className="clip-item-head">
              <strong>{index + 1}. {clip.name}</strong>
              <div className="row-buttons">
                <button type="button" className="ghost-button" onClick={() => moveClip(clip.id, -1)}>
                  Up
                </button>
                <button type="button" className="ghost-button" onClick={() => moveClip(clip.id, 1)}>
                  Down
                </button>
                <button type="button" className="danger-button" onClick={() => removeClip(clip.id)}>
                  Remove
                </button>
              </div>
            </div>

            <div className="grid-two">
              <label>
                In
                <input
                  type="number"
                  value={clip.inFrame}
                  onChange={(event) => updateClip(clip.id, "inFrame", Number(event.target.value))}
                />
              </label>
              <label>
                Out
                <input
                  type="number"
                  value={clip.outFrame}
                  onChange={(event) => updateClip(clip.id, "outFrame", Number(event.target.value))}
                />
              </label>
            </div>

            <label>
              Note
              <input
                value={clip.note}
                onChange={(event) => updateClip(clip.id, "note", event.target.value)}
              />
            </label>
          </article>
        ))}
      </div>

      <div className="row-buttons">
        <button type="button" onClick={() => exportDeliverable("animatic", "Animatic")}>Export Animatic</button>
        <button type="button" onClick={() => exportDeliverable("frame_sheets", "Frame Sheets")}>Export Frame Sheets</button>
        <button type="button" onClick={() => exportDeliverable("social_clips", "Social Cuts")}>Export Social Cuts</button>
        <button type="button" onClick={() => exportDeliverable("review_link", "Review Link")}>Generate Review Link</button>
      </div>
      <p className="muted"><strong>Status:</strong> {status}</p>
    </section>
  );
}
