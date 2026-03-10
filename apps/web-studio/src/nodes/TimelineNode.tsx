import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getAnimeSectionLabel } from "@genga/contracts";
import type { TimelineNodeData } from "../types";

export function TimelineNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as TimelineNodeData;
  return (
    <div className="studio-node">
      <Handle type="target" position={Position.Left} />
      <h3>{nodeData.title}</h3>
      <div className="grid-two">
        <label htmlFor={`${id}-start`}>{getAnimeSectionLabel("timeline")} Start</label>
        <input id={`${id}-start`} type="number" defaultValue={nodeData.startFrame} />
      </div>
      <div className="grid-two">
        <label htmlFor={`${id}-end`}>{getAnimeSectionLabel("timeline")} End</label>
        <input id={`${id}-end`} type="number" defaultValue={nodeData.endFrame} />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
