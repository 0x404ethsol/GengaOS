import type { ExtensionManifest, FxLayer, SakugaTimeline } from "@genga/contracts";

export interface ScriptNodeData {
  title: string;
  script: string;
}

export interface TimelineNodeData {
  title: string;
  startFrame: number;
  endFrame: number;
}

export interface CastingNodeData {
  title: string;
  prompt: string;
  referencesCsv: string;
  actorId?: string;
}

export interface ActorNodeData {
  title: string;
  actorId: string;
  actorLockId?: string;
}

export interface VirtualSetNodeData {
  title: string;
  cameraPreset: string;
  posePreset: string;
  interpolationConstraint?: {
    startPoseId: string;
    endPoseId: string;
    easing: "linear" | "ease-in" | "ease-out" | "ease-in-out";
  };
}

export interface SakugaNodeData {
  title: string;
  actorLockId: string;
  styleDnaId?: string;
  frameA: string;
  frameB: string;
  sketchHint: string;
  timeline?: SakugaTimeline;
  fxStack?: FxLayer[];
  jobId?: string;
  status?: string;
}

export interface ExtensionNodeData {
  title: string;
  extensionId: string;
  capabilityId: string;
  agentRuntime?: string;
  requestedScopes?: string[];
  fields: Record<string, string | number | boolean>;
}

export interface ExtensionState {
  installed: ExtensionManifest[];
}

export interface FxComposerNodeData {
  title: string;
  fxStack: FxLayer[];
}
