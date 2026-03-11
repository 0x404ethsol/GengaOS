import { useEffect, useState } from "react";
import { getAnimeActionLabel, getAnimeSectionLabel } from "@genga/contracts";
import { controlApi } from "../lib/api";

interface AutopilotPanelProps {
  projectId: string;
  activeStyleDnaId?: string;
  onTemplate: (templateId: string) => void;
}

type ShotTemplate = {
  id: string;
  name: string;
  description: string;
  estimatedCredits: number;
};

export function AutopilotPanel({ projectId, activeStyleDnaId, onTemplate }: AutopilotPanelProps) {
  const [scriptBeat, setScriptBeat] = useState("Character enters the shrine and detects danger.");
  const [suggestion, setSuggestion] = useState<string>("No suggestion yet");
  const [retake, setRetake] = useState<string>("No retake advice yet");
  const [cost, setCost] = useState<string>("Unknown");
  const [templates, setTemplates] = useState<ShotTemplate[]>([]);
  const [styleMode, setStyleMode] = useState("anime-tv");
  const [exploreState, setExploreState] = useState("No model exploration yet");

  useEffect(() => {
    controlApi.getAnimeShotTemplates().then((response) => {
      setTemplates(response.templates ?? []);
    });

    controlApi.getStyleBible(projectId).then((response) => {
      setStyleMode(response.artDirection ?? "anime-tv");
    });
  }, [projectId]);

  const suggestShot = async () => {
    const response = await controlApi.suggestShot(scriptBeat);
    const first = response.suggestions?.[0];
    if (first) {
      setSuggestion(`${first.title} - ${first.rationale}`);
    }
  };

  const requestRetake = async () => {
    const response = await controlApi.retakePlan({
      continuityIssues: ["Pose drift", "Missing prop continuity"],
      sceneIntent: scriptBeat
    });

    setRetake(response.plan);
  };

  const estimate = async () => {
    const response = await controlApi.estimateCost("interpolate", 48);
    setCost(`${response.estimatedCredits} credits / ${response.estimatedSeconds}s`);
  };

  const explore = async () => {
    const actor = await controlApi.createActor("anime lead", []);
    const lock = await controlApi.lockActor(actor.actorId);
    const styleDnaId = activeStyleDnaId || (await controlApi.createStyleDnaProfile(projectId)).styleDnaId;
    const response = await controlApi.parallelExplore({
      actorLockId: lock.actorLockId,
      styleDnaId,
      prompt: scriptBeat,
      variants: 3
    });
    setExploreState(`${response.candidates?.length ?? 0} parallel variants generated`);
  };

  return (
    <section className="panel-block">
      <h2>{getAnimeSectionLabel("shoot")} Autopilot Pack</h2>
      <p className="muted"><strong>Style Bible:</strong> {styleMode}</p>
      <p className="muted"><strong>Style DNA Lock:</strong> {activeStyleDnaId ?? "Auto-create on explore"}</p>
      <label htmlFor="beat">Script Beat</label>
      <textarea id="beat" rows={3} value={scriptBeat} onChange={(e) => setScriptBeat(e.target.value)} />
      <div className="row-buttons">
        {templates.slice(0, 3).map((template) => (
          <button key={template.id} type="button" onClick={() => onTemplate(template.id)}>
            {template.name}
          </button>
        ))}
      </div>
      <div className="row-buttons">
        <button type="button" onClick={suggestShot}>{getAnimeActionLabel("continuityCheck")}</button>
        <button type="button" onClick={requestRetake}>{getAnimeActionLabel("requestRetake")}</button>
        <button type="button" onClick={estimate}>{getAnimeActionLabel("estimateCost")}</button>
        <button type="button" onClick={explore}>{getAnimeActionLabel("parallelExplore")}</button>
      </div>
      <p className="muted"><strong>Suggestion:</strong> {suggestion}</p>
      <p className="muted"><strong>Retake:</strong> {retake}</p>
      <p className="muted"><strong>Cost:</strong> {cost}</p>
      <p className="muted"><strong>Explore:</strong> {exploreState}</p>
    </section>
  );
}
