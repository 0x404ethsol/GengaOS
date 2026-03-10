import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getAnimeSectionLabel } from "@genga/contracts";
import { controlApi } from "../lib/api";
import type { ExtensionNodeData } from "../types";

export function ExtensionNode({ id, data }: NodeProps) {
  const nodeData = data as unknown as ExtensionNodeData;

  const onExecute = async () => {
    const result = await controlApi.executeExtension(
      nodeData.extensionId,
      nodeData.capabilityId,
      nodeData.fields,
      nodeData.agentRuntime,
      nodeData.requestedScopes ?? []
    );
    alert(JSON.stringify(result.result, null, 2));
  };

  return (
    <div className="studio-node">
      <Handle type="target" position={Position.Left} />
      <h3>{nodeData.title}</h3>
      <p className="muted">{getAnimeSectionLabel("extensions")}: {nodeData.extensionId}</p>
      <p className="muted">Capability: {nodeData.capabilityId}</p>
      <p className="muted">Runtime: {nodeData.agentRuntime ?? "local-mcp"}</p>
      <p className="muted">Scopes: {(nodeData.requestedScopes ?? []).join(", ") || "none"}</p>
      {Object.entries(nodeData.fields).map(([key, value]) => (
        <div className="grid-two" key={`${id}-${key}`}>
          <label>{key}</label>
          <input type="text" defaultValue={String(value)} />
        </div>
      ))}
      <button type="button" onClick={onExecute}>Execute MCP Capability</button>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
