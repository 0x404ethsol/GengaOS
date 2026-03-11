import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getAnimeActionLabel } from "@genga/contracts";
import { controlApi } from "../lib/api";
import type { ActorNodeData } from "../types";

export function ActorNode({ data }: NodeProps) {
  const nodeData = data as unknown as ActorNodeData;

  const onLockIdentity = async () => {
    if (!nodeData.actorId) {
      alert("Set actor id first.");
      return;
    }

    const response = await controlApi.lockActor(nodeData.actorId);
    nodeData.actorLockId = response.actorLockId;
    alert(`Identity locked: ${response.actorLockId}`);
  };

  return (
    <div className="studio-node">
      <Handle type="target" position={Position.Left} />
      <h3>{nodeData.title}</h3>
      <label>Actor ID</label>
      <input type="text" defaultValue={nodeData.actorId} />
      <button type="button" onClick={onLockIdentity}>{getAnimeActionLabel("issueActorLock")}</button>
      <p className="pill">Lock: {nodeData.actorLockId ?? "not locked"}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
