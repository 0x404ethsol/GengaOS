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
  const fxLayerCount = nodeData.fxStack?.length ?? 0;

  const setAndPersistTimeline = (next: typeof timeline) => {
    setTimeline(next);
    nodeData.timeline = next;
  };

  const onKeyframe = async () => {
    const result = await controlApi.generateKeyframes({
      actorLockId: nodeData.actorLockId,
      styleDnaId: nodeData.styleDnaId,
      frameA: nodeData.frameA,
      frameB: nodeData.frameB,
      sketchHint: nodeData.sketchHint,
      sakugaTimeline: timeline,
      fxStack: nodeData.fxStack ?? []
    });

    nodeData.jobId = result.jobId;
    nodeData.status = result.status;
  };

  const onInterpolate = async () => {
    const result = await controlApi.interpolate({
      actorLockId: nodeData.actorLockId,
      styleDnaId: nodeData.styleDnaId,
      frameA: nodeData.frameA,
      frameB: nodeData.frameB,
      sketchHint: nodeData.sketchHint,
      sakugaTimeline: timeline,
      fxStack: nodeData.fxStack ?? []
    });

    nodeData.jobId = result.jobId;
    nodeData.status = result.status;
  };

  const addHold = () => {
    const frame = Number(prompt("Hold frame", "24") ?? "24");
    const durationFrames = Number(prompt("Hold duration", "2") ?? "2");
    const next = {
      ...timeline,
      holds: [...timeline.holds, { frame, durationFrames }]
    };
    setAndPersistTimeline(next);
  };

  const addSmear = () => {
    const frame = Number(prompt("Smear frame", "38") ?? "38");
    const intensity = Number(prompt("Smear intensity (0-1)", "0.7") ?? "0.7");
    const direction = prompt("Smear direction", "left-to-right") ?? "left-to-right";
    const next = {
      ...timeline,
      smears: [...timeline.smears, { frame, intensity, direction }]
    };
    setAndPersistTimeline(next);
  };

  const addImpact = () => {
    const frame = Number(prompt("Impact frame", "42") ?? "42");
    const magnitude = Number(prompt("Impact magnitude (0-1)", "0.8") ?? "0.8");
    const note = prompt("Impact note", "sword contact") ?? "impact";
    const next = {
      ...timeline,
      impacts: [...timeline.impacts, { frame, magnitude, note }]
    };
    setAndPersistTimeline(next);
  };

  const addShake = () => {
    const frame = Number(prompt("Shake frame", "42") ?? "42");
    const amplitude = Number(prompt("Shake amplitude", "0.35") ?? "0.35");
    const frequencyHz = Number(prompt("Shake frequency (Hz)", "6.5") ?? "6.5");
    const next = {
      ...timeline,
      shake: [...timeline.shake, { frame, amplitude, frequencyHz }]
    };
    setAndPersistTimeline(next);
  };

  return (
    <div className="studio-node">
      <Handle type="target" position={Position.Left} />
      <h3>{nodeData.title}</h3>
      <label htmlFor={`${id}-lock`}>Actor Lock ID</label>
      <input id={`${id}-lock`} type="text" defaultValue={nodeData.actorLockId} />
      <label htmlFor={`${id}-style`}>Style DNA Lock ID</label>
      <input id={`${id}-style`} type="text" defaultValue={nodeData.styleDnaId ?? ""} />
      <label htmlFor={`${id}-frameA`}>Frame A URL</label>
      <input id={`${id}-frameA`} type="text" defaultValue={nodeData.frameA} />
      <label htmlFor={`${id}-frameB`}>Frame B URL</label>
      <input id={`${id}-frameB`} type="text" defaultValue={nodeData.frameB} />
      <label htmlFor={`${id}-sketch`}>Sparse Sketch Hint</label>
      <textarea id={`${id}-sketch`} defaultValue={nodeData.sketchHint} rows={3} />

      <div className="row-buttons">
        <button type="button" className="ghost-button" onClick={addHold}>Add Hold</button>
        <button type="button" className="ghost-button" onClick={addSmear}>Add Smear</button>
        <button type="button" className="ghost-button" onClick={addImpact}>Add Impact</button>
        <button type="button" className="ghost-button" onClick={addShake}>Add Shake</button>
      </div>

      <div className="row-buttons">
        <button onClick={onKeyframe} type="button">{getAnimeActionLabel("keyframeShot")}</button>
        <button onClick={onInterpolate} type="button">{getAnimeActionLabel("buildInbetweens")}</button>
      </div>

      <p className="pill">Timeline: holds {timeline.holds.length} / smears {timeline.smears.length} / impacts {timeline.impacts.length} / shake {timeline.shake.length}</p>
      <p className="pill">FX Stack Layers: {fxLayerCount}</p>
      <p className="pill">Job: {nodeData.jobId ?? "none"} | {nodeData.status ?? "idle"}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
