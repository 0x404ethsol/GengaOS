import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getAnimeSectionLabel } from "@genga/contracts";
import type { ScriptNodeData } from "../types";

export function ScriptNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as ScriptNodeData;
  return (
    <div className="studio-node">
      <Handle type="target" position={Position.Left} />
      <h3>{nodeData.title}</h3>
      <label htmlFor={`${id}-script`}>{getAnimeSectionLabel("scriptDesk")} Beat</label>
      <textarea id={`${id}-script`} defaultValue={nodeData.script} rows={6} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
