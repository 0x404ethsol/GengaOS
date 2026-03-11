import { useEffect, useMemo, useState } from "react";
import type { ColorContinuityAnalysis, ColorScriptScene } from "@genga/contracts";
import { controlApi } from "../lib/api";

interface ColorScriptLanePanelProps {
  projectId: string;
  onStatus: (value: string) => void;
}

export function ColorScriptLanePanel({ projectId, onStatus }: ColorScriptLanePanelProps) {
  const [scenes, setScenes] = useState<ColorScriptScene[]>([]);
  const [analysis, setAnalysis] = useState<ColorContinuityAnalysis | null>(null);

  useEffect(() => {
    controlApi.getColorScriptLane(projectId).then((response) => {
      setScenes((response.scenes ?? []) as ColorScriptScene[]);
    });
  }, [projectId]);

  const laneSwatches = useMemo(
    () =>
      scenes.map((scene) => ({
        sceneId: scene.sceneId,
        label: scene.label,
        primary: scene.palette?.[0] ?? "#1b243b",
        secondary: scene.palette?.[1] ?? "#304b78"
      })),
    [scenes]
  );

  const updateScene = <K extends keyof ColorScriptScene>(sceneId: string, key: K, value: ColorScriptScene[K]) => {
    setScenes((current) =>
      current.map((scene) => (scene.sceneId === sceneId ? { ...scene, [key]: value } : scene))
    );
  };

  const updateScenePalette = (sceneId: string, index: number, value: string) => {
    setScenes((current) =>
      current.map((scene) => {
        if (scene.sceneId !== sceneId) return scene;
        const palette = [...(scene.palette ?? [])];
        palette[index] = value;
        return { ...scene, palette };
      })
    );
  };

  const addScene = () => {
    const index = scenes.length + 1;
    setScenes((current) => [
      ...current,
      {
        sceneId: `scn-${String(index).padStart(3, "0")}`,
        label: `Scene ${index}`,
        mood: "neutral",
        palette: ["#1c2742", "#6ca6ff", "#f4dca1"],
        notes: ""
      }
    ]);
  };

  const saveLane = async () => {
    await controlApi.updateColorScriptLane(projectId, scenes);
    onStatus(`Color script lane saved (${scenes.length} scenes)`);
  };

  const runAnalysis = async () => {
    const result = await controlApi.analyzeColorScriptLane(projectId);
    setAnalysis(result as ColorContinuityAnalysis);
    onStatus(`Color continuity analyzed (delta ${result.averageDelta})`);
  };

  return (
    <section className="panel-block color-script-panel">
      <h2>Color Script Lane</h2>
      <p className="muted">Design palette progression by scene and detect visual drift before final review.</p>
      <div className="color-lane-track">
        {laneSwatches.map((swatch) => (
          <div
            key={swatch.sceneId}
            className="color-lane-block"
            style={{ background: `linear-gradient(130deg, ${swatch.primary}, ${swatch.secondary})` }}
            title={swatch.label}
          >
            <span>{swatch.label}</span>
          </div>
        ))}
      </div>

      <div className="row-buttons">
        <button type="button" className="ghost-button" onClick={addScene}>Add Scene</button>
        <button type="button" onClick={saveLane}>Save Lane</button>
        <button type="button" className="ghost-button" onClick={runAnalysis}>Analyze Drift</button>
      </div>

      <div className="color-scene-list">
        {scenes.map((scene) => (
          <article key={scene.sceneId} className="color-scene-item">
            <label>
              Scene Label
              <input value={scene.label} onChange={(event) => updateScene(scene.sceneId, "label", event.target.value)} />
            </label>
            <div className="grid-two">
              <label>
                Mood
                <input value={scene.mood} onChange={(event) => updateScene(scene.sceneId, "mood", event.target.value)} />
              </label>
              <label>
                Notes
                <input value={scene.notes ?? ""} onChange={(event) => updateScene(scene.sceneId, "notes", event.target.value)} />
              </label>
            </div>
            <div className="color-palette-inputs">
              {(scene.palette ?? []).map((color, index) => (
                <label key={`${scene.sceneId}-${index}`}>
                  Palette {index + 1}
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => updateScenePalette(scene.sceneId, index, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="color-review-panel">
        <p className="muted"><strong>Average Delta:</strong> {analysis ? analysis.averageDelta : "Not analyzed"}</p>
        {(analysis?.warnings ?? []).length ? (
          <div>
            <p className="muted"><strong>Drift Warnings:</strong></p>
            {(analysis?.warnings ?? []).map((warning) => (
              <p key={warning} className="muted">- {warning}</p>
            ))}
          </div>
        ) : (
          <p className="muted">No drift warnings.</p>
        )}
        {(analysis?.suggestions ?? []).map((suggestion) => (
          <p key={suggestion} className="muted">Tip: {suggestion}</p>
        ))}
      </div>
    </section>
  );
}
