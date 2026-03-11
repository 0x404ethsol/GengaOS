import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getAnimeActionLabel, getAnimeSectionLabel } from "@genga/contracts";
import { controlApi } from "../lib/api";
import type { CastingNodeData } from "../types";

export function CastingNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as CastingNodeData;

  const onGenerateActor = async () => {
    const references = nodeData.referencesCsv
      .split(",")
      .map((value: string) => value.trim())
      .filter(Boolean);

    const actor = await controlApi.createActor(nodeData.prompt, references);
    nodeData.actorId = actor.actorId;
    alert(`Actor created: ${actor.actorId}`);
  };

  return (
    <div className="studio-node">
      <Handle type="target" position={Position.Left} />
      <h3>{nodeData.title}</h3>
      <label htmlFor={`${id}-prompt`}>Character Prompt</label>
      <textarea id={`${id}-prompt`} defaultValue={nodeData.prompt} rows={5} />
      <label htmlFor={`${id}-refs`}>Reference URLs (CSV)</label>
      <input id={`${id}-refs`} type="text" defaultValue={nodeData.referencesCsv} />
      <button type="button" onClick={onGenerateActor}>{getAnimeActionLabel("generateCharacterSheet")}</button>
      {nodeData.actorId ? <p className="pill">{getAnimeSectionLabel("cast")}: {nodeData.actorId}</p> : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
