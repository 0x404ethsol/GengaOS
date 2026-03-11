import { useEffect, useMemo, useRef, useState } from "react";
import { getAnimeActionLabel, getAnimeSectionLabel } from "@genga/contracts";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { controlApi } from "../lib/api";
import { RoomSyncClient } from "../lib/sync";
import { ActorNode } from "../nodes/ActorNode";
import { CastingNode } from "../nodes/CastingNode";
import { ExtensionNode } from "../nodes/ExtensionNode";
import { FxComposerNode } from "../nodes/FxComposerNode";
import { SakugaNode } from "../nodes/SakugaNode";
import { ScriptNode } from "../nodes/ScriptNode";
import { TimelineNode } from "../nodes/TimelineNode";
import { VirtualSetNode } from "../nodes/VirtualSetNode";

const nodeTypes: NodeTypes = {
  scriptNode: ScriptNode,
  timelineNode: TimelineNode,
  castingNode: CastingNode,
  actorNode: ActorNode,
  virtualSetNode: VirtualSetNode,
  fxComposerNode: FxComposerNode,
  sakugaNode: SakugaNode,
  extensionNode: ExtensionNode
};

const initialNodes: Node[] = [
  {
    id: "script-1",
    type: "scriptNode",
    position: { x: 50, y: 80 },
    data: { title: getAnimeSectionLabel("scriptDesk"), script: "INT. SHRINE - NIGHT\nHero enters and scans the altar." }
  },
  {
    id: "timeline-1",
    type: "timelineNode",
    position: { x: 420, y: 80 },
    data: { title: getAnimeSectionLabel("timeline"), startFrame: 1, endFrame: 72 }
  },
  {
    id: "casting-1",
    type: "castingNode",
    position: { x: 50, y: 360 },
    data: { title: `${getAnimeSectionLabel("cast")} Forge`, prompt: "Stoic swordswoman, anime style", referencesCsv: "" }
  },
  {
    id: "actor-1",
    type: "actorNode",
    position: { x: 420, y: 360 },
    data: { title: `${getAnimeSectionLabel("cast")} Lock`, actorId: "", actorLockId: "" }
  },
  {
    id: "virtual-set-1",
    type: "virtualSetNode",
    position: { x: 760, y: 40 },
    data: {
      title: `${getAnimeSectionLabel("block")} Stage`,
      cameraPreset: "35mm medium",
      posePreset: "ready stance",
      interpolationConstraint: {
        startPoseId: "pose-ready-stance",
        endPoseId: "pose-impact-followthrough",
        easing: "ease-in-out"
      }
    }
  },
  {
    id: "fx-1",
    type: "fxComposerNode",
    position: { x: 1120, y: 420 },
    data: {
      title: "FX Composer",
      fxStack: [
        { layerId: "fx-layer-1", type: "speed-lines", intensity: 0.7, blendMode: "screen", enabled: true },
        { layerId: "fx-layer-2", type: "impact-flash", intensity: 0.85, blendMode: "add", enabled: true }
      ]
    }
  },
  {
    id: "sakuga-1",
    type: "sakugaNode",
    position: { x: 760, y: 420 },
    data: {
      title: `${getAnimeSectionLabel("sakuga")} Engine`,
      actorLockId: "",
      styleDnaId: "",
      frameA: "",
      frameB: "",
      sketchHint: "arc motion up-left, settle on contact",
      fxStack: [],
      timeline: {
        holds: [{ frame: 24, durationFrames: 2 }],
        smears: [{ frame: 38, intensity: 0.72, direction: "left-to-right" }],
        impacts: [{ frame: 42, magnitude: 0.84, note: "sword contact" }],
        shake: [{ frame: 42, amplitude: 0.35, frequencyHz: 6.5 }]
      }
    }
  }
];

const initialEdges: Edge[] = [
  { id: "e-script-timeline", source: "script-1", target: "timeline-1" },
  { id: "e-casting-actor", source: "casting-1", target: "actor-1" },
  { id: "e-actor-sakuga", source: "actor-1", target: "sakuga-1" },
  { id: "e-virtual-sakuga", source: "virtual-set-1", target: "sakuga-1" },
  { id: "e-fx-sakuga", source: "fx-1", target: "sakuga-1" }
];

interface StudioCanvasProps {
  projectId: string;
  onSnapshotChange: (summary: string) => void;
  onGraphOutputsChange?: (outputs: Array<{ nodeId: string; title: string; jobId?: string; status?: string }>) => void;
  activeStyleDnaId?: string;
  remixPrefill?: Record<string, unknown> | null;
  hydrateRequest?: {
    key: string;
    extensionId: string;
    capabilityId: string;
    agentRuntime: string;
    requestedScopes: string[];
    title: string;
    fields: Record<string, string | number | boolean>;
  } | null;
}

export function StudioCanvas({
  projectId,
  onSnapshotChange,
  onGraphOutputsChange,
  activeStyleDnaId,
  remixPrefill,
  hydrateRequest
}: StudioCanvasProps) {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [revision, setRevision] = useState(0);
  const syncRef = useRef<RoomSyncClient | null>(null);

  useEffect(() => {
    controlApi
      .getGraph(projectId)
      .then((graph) => {
        setNodes(graph.nodes.length ? graph.nodes : initialNodes);
        setEdges(graph.edges.length ? graph.edges : initialEdges);
        setRevision(graph.revision ?? 0);
      })
      .catch(() => {
      });

    syncRef.current = new RoomSyncClient();
    syncRef.current.connect(projectId, (incomingNodes, incomingEdges) => {
      setNodes(incomingNodes);
      setEdges(incomingEdges);
    });

    return () => {
      syncRef.current?.disconnect();
      syncRef.current = null;
    };
  }, [projectId]);

  useEffect(() => {
    onSnapshotChange(`${nodes.length} nodes, ${edges.length} edges, revision ${revision}`);
  }, [edges.length, nodes.length, onSnapshotChange, revision]);

  useEffect(() => {
    if (!onGraphOutputsChange) return;
    const outputs = nodes
      .filter((node) => node.type === "sakugaNode")
      .map((node) => {
        const data = node.data as { title?: string; jobId?: string; status?: string };
        return {
          nodeId: node.id,
          title: data.title ?? node.id,
          jobId: data.jobId,
          status: data.status
        };
      });
    onGraphOutputsChange(outputs);
  }, [nodes, onGraphOutputsChange]);

  useEffect(() => {
    const links = edges.filter((edge) => edge.target === "sakuga-1");
    const fxSources = new Set(
      links
        .map((edge) => edge.source)
        .filter((source) => {
          const node = nodes.find((item) => item.id === source);
          return node?.type === "fxComposerNode";
        })
    );
    if (!fxSources.size) return;

    setNodes((current) => {
      const fxStacks = current
        .filter((node) => fxSources.has(node.id))
        .flatMap((node) => ((node.data as { fxStack?: unknown[] }).fxStack ?? []));
      let changed = false;
      const next = current.map((node) => {
        if (node.id !== "sakuga-1") return node;
        const data = node.data as { fxStack?: unknown[] };
        if (JSON.stringify(data.fxStack ?? []) === JSON.stringify(fxStacks)) {
          return node;
        }
        changed = true;
        return {
          ...node,
          data: {
            ...data,
            fxStack: fxStacks
          }
        };
      });
      return changed ? next : current;
    });
  }, [edges, nodes]);

  useEffect(() => {
    if (!activeStyleDnaId) {
      return;
    }
    setNodes((current) =>
      current.map((node) => {
        if (node.type !== "sakugaNode") {
          return node;
        }
        const data = node.data as { styleDnaId?: string };
        if (data.styleDnaId === activeStyleDnaId) {
          return node;
        }
        return {
          ...node,
          data: {
            ...data,
            styleDnaId: activeStyleDnaId
          }
        };
      })
    );
  }, [activeStyleDnaId]);

  useEffect(() => {
    if (!remixPrefill) {
      return;
    }

    const scriptPrefill = (remixPrefill.scriptNode as { script?: string } | undefined) ?? {};
    const castingPrefill = (remixPrefill.castingNode as { prompt?: string } | undefined) ?? {};
    const virtualSetPrefill =
      (remixPrefill.virtualSetNode as { cameraPreset?: string; posePreset?: string } | undefined) ?? {};
    const sakugaPrefill = (remixPrefill.sakugaNode as { sketchHint?: string } | undefined) ?? {};

    setNodes((current) =>
      current.map((node) => {
        if (node.type === "scriptNode" && scriptPrefill.script) {
          return { ...node, data: { ...(node.data as Record<string, unknown>), script: scriptPrefill.script } };
        }
        if (node.type === "castingNode" && castingPrefill.prompt) {
          return { ...node, data: { ...(node.data as Record<string, unknown>), prompt: castingPrefill.prompt } };
        }
        if (node.type === "virtualSetNode") {
          return {
            ...node,
            data: {
              ...(node.data as Record<string, unknown>),
              ...(virtualSetPrefill.cameraPreset ? { cameraPreset: virtualSetPrefill.cameraPreset } : {}),
              ...(virtualSetPrefill.posePreset ? { posePreset: virtualSetPrefill.posePreset } : {})
            }
          };
        }
        if (node.type === "sakugaNode" && sakugaPrefill.sketchHint) {
          return { ...node, data: { ...(node.data as Record<string, unknown>), sketchHint: sakugaPrefill.sketchHint } };
        }
        return node;
      })
    );
  }, [remixPrefill]);

  useEffect(() => {
    if (!hydrateRequest) {
      return;
    }

    setNodes((current) => [
      ...current,
      {
        id: `extension-${hydrateRequest.key}`,
        type: "extensionNode",
        position: { x: 1120, y: 120 + current.length * 18 },
        data: {
          title: hydrateRequest.title,
          extensionId: hydrateRequest.extensionId,
          capabilityId: hydrateRequest.capabilityId,
          agentRuntime: hydrateRequest.agentRuntime,
          requestedScopes: hydrateRequest.requestedScopes,
          fields: hydrateRequest.fields
        }
      }
    ]);
  }, [hydrateRequest]);

  const saveGraph = async () => {
    const payload = {
      projectId,
      revision,
      nodes,
      edges,
      camera: { x: 0, y: 0, zoom: 1 }
    };

    const result = await controlApi.saveGraph(projectId, payload);
    setRevision(result.revision);
  };

  const onNodesChange = (changes: NodeChange[]) => {
    setNodes((current) => {
      const next = applyNodeChanges(changes, current);
      syncRef.current?.broadcast(next, edges);
      return next;
    });
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    setEdges((current) => {
      const next = applyEdgeChanges(changes, current);
      syncRef.current?.broadcast(nodes, next);
      return next;
    });
  };

  const onConnect = (connection: Connection) => {
    setEdges((current) => addEdge(connection, current));
  };

  const flow = useMemo(
    () => (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background color="#23283a" />
      </ReactFlow>
    ),
    [edges, nodes]
  );

  return (
    <div className="canvas-shell">
      <div className="canvas-toolbar">
        <button type="button" onClick={saveGraph}>{getAnimeActionLabel("saveGraphRevision")}</button>
        <span>Revision: {revision}</span>
      </div>
      <div className="canvas-area">{flow}</div>
    </div>
  );
}
