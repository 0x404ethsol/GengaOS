import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  animeTerminology,
  cinematicMotionTokens,
  getAnimeSectionLabel,
  type ExtensionManifest,
  type SceneIdea
} from "@genga/contracts";
import { AutopilotPanel } from "./components/AutopilotPanel";
import { ColorScriptLanePanel } from "./components/ColorScriptLanePanel";
import { CommandPalette } from "./components/CommandPalette";
import { ContinuityHeatmapPanel } from "./components/ContinuityHeatmapPanel";
import { DirectorNotesPanel, type ParsedDirectorAction } from "./components/DirectorNotesPanel";
import { EpisodeBoardPanel } from "./components/EpisodeBoardPanel";
import { ExpressionTimelinePanel } from "./components/ExpressionTimelinePanel";
import { ExtensionRegistry } from "./components/ExtensionRegistry";
import { RedlineApprovalPanel } from "./components/RedlineApprovalPanel";
import { RightsReviewPanel } from "./components/RightsReviewPanel";
import { SceneIdeaCloud } from "./components/SceneIdeaCloud";
import { StartupGuide } from "./components/StartupGuide";
import { StudioCanvas } from "./components/StudioCanvas";
import { StyleDnaPanel } from "./components/StyleDnaPanel";
import { VideoEditorPanel } from "./components/VideoEditorPanel";
import { createStudioCommands } from "./lib/commands";
import { playCinematicCue } from "./lib/cues";

function App() {
  const [projectId] = useState("demo-project");
  const [status, setStatus] = useState("Anime studio ready");
  const [activeIdea, setActiveIdea] = useState<SceneIdea | null>(null);
  const [activeStyleDnaId, setActiveStyleDnaId] = useState<string>("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [graphOutputs, setGraphOutputs] = useState<Array<{ nodeId: string; title: string; jobId?: string; status?: string }>>([]);
  const [hydrationQueue, setHydrationQueue] = useState<string[]>([]);
  const [remixPrefill, setRemixPrefill] = useState<Record<string, unknown> | null>(null);
  const [parsedNoteActions, setParsedNoteActions] = useState<ParsedDirectorAction[]>([]);
  const [undoStack, setUndoStack] = useState<Array<{ label: string; undo: () => void }>>([]);
  const [approvalStatus, setApprovalStatus] = useState("draft");
  const [hydrateRequest, setHydrateRequest] = useState<{
    key: string;
    extensionId: string;
    capabilityId: string;
    agentRuntime: string;
    requestedScopes: string[];
    title: string;
    fields: Record<string, string | number | boolean>;
  } | null>(null);

  const onTemplate = useCallback((templateId: string) => {
    setStatus(`Applied template: ${templateId}`);
    playCinematicCue("render-accepted");
  }, []);

  const onStartup = useCallback((templateId: string) => {
    setStatus(`Startup flow launched with ${templateId}`);
    playCinematicCue("render-accepted");
  }, []);

  const onUseIdea = useCallback((idea: SceneIdea) => {
    setActiveIdea(idea);
    setStatus(`Idea locked: ${idea.title}`);
    playCinematicCue("render-accepted");
  }, []);

  const onRemixIdea = useCallback((payload: Record<string, unknown>) => {
    setRemixPrefill(payload);
    setStatus("Remix payload applied to graph staging nodes");
    playCinematicCue("render-accepted");
  }, []);

  const onHydrateNode = useCallback((
    manifest: ExtensionManifest,
    capabilityId: string,
    runtime: string,
    grantedScopes: string[]
  ) => {
    const capability = manifest.capabilities.find((cap) => cap.id === capabilityId);
    const summary = `${manifest.name}:${capability?.name ?? capabilityId}`;
    setHydrationQueue((prev) => [...prev, summary]);
    setHydrateRequest({
      key: crypto.randomUUID(),
      extensionId: manifest.id,
      capabilityId,
      agentRuntime: runtime,
      requestedScopes: grantedScopes,
      title: `MCP - ${capability?.name ?? capabilityId}`,
      fields: Object.fromEntries(
        (capability?.fields ?? []).map((field) => [field.key, field.type === "boolean" ? false : ""])
      )
    });
    setStatus(`Hydrated MCP Node: ${summary}`);
    playCinematicCue("lock-issued");
  }, []);

  const hydrationSummary = useMemo(
    () => (hydrationQueue.length ? hydrationQueue.join(" | ") : "No dynamic MCP nodes hydrated yet"),
    [hydrationQueue]
  );

  const activeShotId = useMemo(() => graphOutputs[0]?.nodeId ?? "sakuga-1", [graphOutputs]);
  const graphContext = useMemo(() => graphOutputs.map((output) => output.title), [graphOutputs]);

  const commands = useMemo(
    () => {
      const baseCommands = createStudioCommands({
        onGenerateImpactCut: () => {
          setStatus("Command executed: impact cut template applied");
          playCinematicCue("render-accepted");
        },
        onLockActorStyle: () => {
          setStatus("Command executed: actor style lock issued");
          playCinematicCue("lock-issued");
        },
        onRetakeContinuity: () => {
          setStatus("Command executed: continuity retake generated");
          playCinematicCue("retake-required");
        }
      });

      const noteCommands = parsedNoteActions.map((action) => ({
        id: `note-${action.actionId}`,
        label: `Note: ${action.label}`,
        description: `Parsed director note command (${action.command})`,
        scope: "review" as const,
        keywords: [action.command, "director", "notes", ...action.warnings],
        preview: [
          `Command: ${action.command}`,
          `Payload: ${JSON.stringify(action.payload)}`,
          action.warnings.length ? `Warnings: ${action.warnings.join(" | ")}` : "Warnings: none"
        ].join("\n"),
        undo: () => setStatus(`Reverted note action: ${action.label}`),
        handler: () => {
          setStatus(`Applied note action: ${action.label}`);
          playCinematicCue("render-accepted");
          setUndoStack((current) => [
            ...current,
            {
              label: action.label,
              undo: () => setStatus(`Reverted note action: ${action.label}`)
            }
          ]);
        }
      }));

      return [...baseCommands, ...noteCommands];
    },
    [parsedNoteActions]
  );

  const undoLastCommand = useCallback(() => {
    setUndoStack((current) => {
      if (!current.length) {
        return current;
      }
      const next = [...current];
      const latest = next.pop();
      latest?.undo();
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div
        className="motion-token-sentinel"
        style={
          {
            ["--motion-fast" as string]: `${cinematicMotionTokens.fast}ms`,
            ["--motion-medium" as string]: `${cinematicMotionTokens.medium}ms`,
            ["--motion-slow" as string]: `${cinematicMotionTokens.slow}ms`
          } as CSSProperties
        }
      />
      <header className="app-header">
        <div>
          <h1>GengaOS Anime IDE</h1>
          <p className="muted">{animeTerminology.mantra} Specialized anime direction from script to final cut.</p>
        </div>
        <div className="header-pills">
          <span className="pill">Web Studio v1</span>
          <span className="pill">{getAnimeSectionLabel("cast")} Ready</span>
          <span className="pill">{getAnimeSectionLabel("block")} to {getAnimeSectionLabel("deliver")}</span>
          <button type="button" className="ghost-button" onClick={() => setPaletteOpen(true)}>
            Command Palette (Ctrl/Cmd+K)
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="sidebar left-rail">
          <StartupGuide onStart={onStartup} />
          <AutopilotPanel projectId={projectId} activeStyleDnaId={activeStyleDnaId} onTemplate={onTemplate} />
          <StyleDnaPanel projectId={projectId} onStyleLockChange={setActiveStyleDnaId} onStatus={setStatus} />
          <ContinuityHeatmapPanel onStatus={setStatus} />
          <DirectorNotesPanel projectId={projectId} onActionsReady={setParsedNoteActions} onStatus={setStatus} />
          <ExtensionRegistry onHydrateNode={onHydrateNode} />
          <section className="panel-block">
            <h2>{getAnimeSectionLabel("session")}</h2>
            <p className="muted"><strong>Project:</strong> {projectId}</p>
            <p className="muted"><strong>Status:</strong> {status}</p>
            <p className="muted"><strong>MCP:</strong> {hydrationSummary}</p>
            {activeIdea ? (
              <p className="muted"><strong>Active Idea:</strong> {activeIdea.title}</p>
            ) : (
              <p className="muted"><strong>Active Idea:</strong> None selected</p>
            )}
          </section>
        </aside>

        <section className="stage-column">
          <SceneIdeaCloud
            projectId={projectId}
            querySeed={activeIdea?.theme ?? "anime"}
            graphContext={graphContext}
            onUseIdea={onUseIdea}
            onRemix={onRemixIdea}
          />
          <main className="main-stage">
            <StudioCanvas
              projectId={projectId}
              onSnapshotChange={setStatus}
              onGraphOutputsChange={setGraphOutputs}
              activeStyleDnaId={activeStyleDnaId}
              remixPrefill={remixPrefill}
              hydrateRequest={hydrateRequest}
            />
          </main>
        </section>

        <aside className="sidebar right-rail">
          <VideoEditorPanel
            projectId={projectId}
            graphOutputs={graphOutputs}
            approvalStatus={approvalStatus}
            onStatus={setStatus}
          />
          <RedlineApprovalPanel
            projectId={projectId}
            shotId={activeShotId}
            onStatus={setStatus}
            onApprovalStatusChange={setApprovalStatus}
          />
          <EpisodeBoardPanel projectId={projectId} onStatus={setStatus} />
          <RightsReviewPanel projectId={projectId} onStatus={setStatus} />
          <ExpressionTimelinePanel projectId={projectId} onStatus={setStatus} />
          <ColorScriptLanePanel projectId={projectId} onStatus={setStatus} />
        </aside>
      </div>
      <CommandPalette
        open={paletteOpen}
        commands={commands}
        canUndo={undoStack.length > 0}
        onUndoLast={undoLastCommand}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}

export default App;
