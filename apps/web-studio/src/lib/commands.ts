export type StudioCommandScope = "global" | "canvas" | "review" | "render";

export interface StudioCommand {
  id: string;
  label: string;
  description: string;
  scope: StudioCommandScope;
  keywords: string[];
  preview?: string;
  undo?: () => void;
  handler: () => void;
}

interface CommandHandlers {
  onGenerateImpactCut: () => void;
  onLockActorStyle: () => void;
  onRetakeContinuity: () => void;
}

export function createStudioCommands(handlers: CommandHandlers): StudioCommand[] {
  return [
    {
      id: "generate-impact-cut",
      label: "Generate Impact Cut",
      description: "Apply a sakuga-heavy impact cut template to the current scene.",
      scope: "render",
      keywords: ["impact", "sakuga", "template", "shot"],
      handler: handlers.onGenerateImpactCut
    },
    {
      id: "lock-actor-style",
      label: "Lock Actor Style",
      description: "Issue style lock for active actor and enforce identity-safe rendering.",
      scope: "canvas",
      keywords: ["style", "lock", "actor", "identity"],
      handler: handlers.onLockActorStyle
    },
    {
      id: "retake-continuity",
      label: "Retake Continuity",
      description: "Generate continuity retake plan using latest scene analysis.",
      scope: "review",
      keywords: ["retake", "continuity", "fix", "drift"],
      handler: handlers.onRetakeContinuity
    }
  ];
}
