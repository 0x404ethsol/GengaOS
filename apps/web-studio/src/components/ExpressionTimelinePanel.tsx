import { useMemo, useState } from "react";
import type { ExpressionPhonemeKey, ExpressionProfile, ExpressionTake } from "@genga/contracts";
import { controlApi } from "../lib/api";

interface ExpressionTimelinePanelProps {
  projectId: string;
  onStatus: (value: string) => void;
}

const phonemeOptions = ["Closed", "A", "I", "U", "E", "O", "M", "N", "Smile"];

function resolvePreviewKey(keys: ExpressionPhonemeKey[], frame: number): ExpressionPhonemeKey | null {
  const sorted = [...keys].sort((a, b) => a.frame - b.frame);
  let active: ExpressionPhonemeKey | null = null;
  for (const key of sorted) {
    if (key.frame <= frame) {
      active = key;
    } else {
      break;
    }
  }
  return active;
}

export function ExpressionTimelinePanel({ projectId, onStatus }: ExpressionTimelinePanelProps) {
  const [profile, setProfile] = useState<ExpressionProfile | null>(null);
  const [profileName, setProfileName] = useState("Lead Performance Profile");
  const [selectedTakeId, setSelectedTakeId] = useState("");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [phoneme, setPhoneme] = useState("A");
  const [expression, setExpression] = useState("neutral");
  const [intensity, setIntensity] = useState(0.6);

  const selectedTake = useMemo(
    () => profile?.takes.find((take) => take.takeId === selectedTakeId) ?? profile?.takes[0] ?? null,
    [profile, selectedTakeId]
  );

  const preview = useMemo(
    () => (selectedTake ? resolvePreviewKey(selectedTake.keys ?? [], currentFrame) : null),
    [selectedTake, currentFrame]
  );

  const createProfile = async () => {
    const created = await controlApi.createExpressionProfile(projectId, profileName);
    setProfile(created as ExpressionProfile);
    setSelectedTakeId((created as ExpressionProfile).takes?.[0]?.takeId ?? "");
    onStatus(`Expression profile ready: ${(created as ExpressionProfile).name}`);
  };

  const refreshLatest = async () => {
    const listed = await controlApi.listExpressionProfiles(projectId);
    const first = listed.profiles?.[0];
    if (!first) {
      onStatus("No expression profile found for project");
      return;
    }
    const fetched = await controlApi.getExpressionProfile(first.profileId);
    setProfile(fetched as ExpressionProfile);
    setSelectedTakeId((fetched as ExpressionProfile).takes?.[0]?.takeId ?? "");
    onStatus(`Loaded expression profile: ${(fetched as ExpressionProfile).name}`);
  };

  const addKey = async () => {
    if (!profile || !selectedTake) {
      onStatus("Create/load profile first");
      return;
    }
    const result = await controlApi.addExpressionKey(profile.profileId, selectedTake.takeId, {
      frame: currentFrame,
      phoneme,
      intensity,
      expression
    });
    setProfile(result.profile as ExpressionProfile);
    onStatus(`Added ${phoneme} key on frame ${currentFrame}`);
  };

  return (
    <section className="panel-block expression-panel">
      <h2>Expression Timeline</h2>
      <p className="muted">Manage takes, lip-flap phonemes, and expression intensity per frame.</p>
      <label>
        Profile Name
        <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
      </label>

      <div className="row-buttons">
        <button type="button" onClick={createProfile}>Create Profile</button>
        <button type="button" className="ghost-button" onClick={refreshLatest}>Load Latest</button>
      </div>

      {profile ? (
        <>
          <p className="muted"><strong>Profile:</strong> {profile.name}</p>
          <label>
            Take
            <select value={selectedTake?.takeId ?? ""} onChange={(event) => setSelectedTakeId(event.target.value)}>
              {(profile.takes ?? []).map((take) => (
                <option key={take.takeId} value={take.takeId}>
                  {take.name} ({take.mood})
                </option>
              ))}
            </select>
          </label>
          <label>
            Current Frame: {currentFrame}
            <input
              type="range"
              min={0}
              max={240}
              value={currentFrame}
              onChange={(event) => setCurrentFrame(Number(event.target.value))}
            />
          </label>
          <div className="grid-two">
            <label>
              Phoneme
              <select value={phoneme} onChange={(event) => setPhoneme(event.target.value)}>
                {phonemeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Intensity
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
              />
            </label>
          </div>
          <label>
            Expression
            <input value={expression} onChange={(event) => setExpression(event.target.value)} />
          </label>
          <div className="row-buttons">
            <button type="button" onClick={addKey}>Add Phoneme Key</button>
          </div>

          <div className="expression-preview">
            <p className="muted">
              <strong>Preview:</strong>{" "}
              {preview
                ? `Frame ${currentFrame}: ${preview.phoneme} (${preview.expression}, ${(preview.intensity * 100).toFixed(0)}%)`
                : `Frame ${currentFrame}: no key yet`}
            </p>
          </div>
          <div className="expression-keys">
            {(selectedTake?.keys ?? []).slice(0, 12).map((key) => (
              <span className="pill" key={`${key.frame}-${key.phoneme}-${key.expression}`}>
                {key.frame}: {key.phoneme} ({key.expression})
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">No expression profile loaded.</p>
      )}
    </section>
  );
}
