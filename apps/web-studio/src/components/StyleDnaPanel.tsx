import { useEffect, useMemo, useState } from "react";
import { getAnimeSectionLabel, type StyleDnaProfile, type StyleDriftReview } from "@genga/contracts";
import { controlApi } from "../lib/api";

interface StyleDnaPanelProps {
  projectId: string;
  onStyleLockChange: (styleDnaId: string) => void;
  onStatus: (value: string) => void;
}

export function StyleDnaPanel({ projectId, onStyleLockChange, onStatus }: StyleDnaPanelProps) {
  const [profiles, setProfiles] = useState<StyleDnaProfile[]>([]);
  const [selectedStyleDnaId, setSelectedStyleDnaId] = useState<string>("");
  const [driftReview, setDriftReview] = useState<StyleDriftReview | null>(null);
  const [sceneIntent, setSceneIntent] = useState("Dramatic standoff before impact frame.");
  const [lineWeight, setLineWeight] = useState("clean-medium");
  const [shadingMode, setShadingMode] = useState("cel-shaded");
  const [palette, setPalette] = useState("#101e37,#f8d36b,#e85f5c");

  const loadProfiles = async () => {
    const result = await controlApi.listStyleDnaProfiles(projectId);
    const list = (result.profiles ?? []) as StyleDnaProfile[];
    setProfiles(list);
    if (!selectedStyleDnaId && list[0]) {
      setSelectedStyleDnaId(list[0].styleDnaId);
      onStyleLockChange(list[0].styleDnaId);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [projectId]);

  const selected = useMemo(
    () => profiles.find((entry) => entry.styleDnaId === selectedStyleDnaId) ?? null,
    [profiles, selectedStyleDnaId]
  );

  const createProfile = async () => {
    const profile = await controlApi.createStyleDnaProfile(projectId);
    setProfiles((current) => [profile as StyleDnaProfile, ...current]);
    setSelectedStyleDnaId(profile.styleDnaId);
    onStyleLockChange(profile.styleDnaId);
    onStatus(`Style DNA lock created: ${profile.styleDnaId}`);
  };

  const runDriftCheck = async () => {
    if (!selectedStyleDnaId) {
      onStatus("Create or select a Style DNA lock first.");
      return;
    }
    const review = await controlApi.checkStyleDrift(selectedStyleDnaId, {
      sceneIntent,
      observedLineWeight: lineWeight,
      observedShadingMode: shadingMode,
      observedPalette: palette.split(",").map((item) => item.trim()).filter(Boolean)
    });
    setDriftReview(review as StyleDriftReview);
    onStatus(`Style drift review score: ${review.overallScore}`);
  };

  return (
    <section className="panel-block style-dna-panel">
      <div className="panel-head">
        <h2>{getAnimeSectionLabel("cast")} Style DNA Lock</h2>
        <button type="button" className="ghost-button" onClick={createProfile}>
          Create Lock
        </button>
      </div>
      <p className="muted">Immutable style profile versions enforce line, palette, and shading continuity across all generation steps.</p>

      <label>Active Style DNA Version</label>
      <select
        value={selectedStyleDnaId}
        onChange={(event) => {
          setSelectedStyleDnaId(event.target.value);
          onStyleLockChange(event.target.value);
        }}
      >
        <option value="">Select style lock</option>
        {profiles.map((profile) => (
          <option key={profile.styleDnaId} value={profile.styleDnaId}>
            v{profile.version} - {profile.styleDnaId.slice(0, 10)} ({profile.locked ? "locked" : "unlocked"})
          </option>
        ))}
      </select>

      {selected ? (
        <div className="style-dna-meta">
          <p className="muted"><strong>Hash:</strong> {selected.immutableHash.slice(0, 20)}...</p>
          <p className="muted"><strong>Line:</strong> {selected.constraints.lineWeight}</p>
          <p className="muted"><strong>Shading:</strong> {selected.constraints.shadingMode}</p>
        </div>
      ) : null}

      <label>Scene Intent</label>
      <textarea rows={2} value={sceneIntent} onChange={(event) => setSceneIntent(event.target.value)} />

      <div className="grid-two">
        <label>
          Observed Line Weight
          <input value={lineWeight} onChange={(event) => setLineWeight(event.target.value)} />
        </label>
        <label>
          Observed Shading
          <input value={shadingMode} onChange={(event) => setShadingMode(event.target.value)} />
        </label>
      </div>

      <label>Observed Palette (comma-separated hex)</label>
      <input value={palette} onChange={(event) => setPalette(event.target.value)} />

      <button type="button" onClick={runDriftCheck}>Run Drift Review</button>

      {driftReview ? (
        <div className="style-drift-review">
          <p className="muted"><strong>Score:</strong> {driftReview.overallScore}</p>
          {driftReview.findings.length ? (
            <div className="issue-list">
              {driftReview.findings.map((finding, index) => (
                <article className="issue-item" key={`${finding.category}-${index}`}>
                  <div className="issue-item-head">
                    <strong>{finding.category}</strong>
                    <span className="pill">{finding.severity}</span>
                  </div>
                  <p className="muted">{finding.detail}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No drift findings.</p>
          )}
          <div className="issue-list">
            {driftReview.suggestions.map((suggestion, index) => (
              <p className="muted" key={`s-${index}`}>{suggestion}</p>
            ))}
          </div>
        </div>
      ) : null}
      <div className="style-history">
        <div className="section-divider" />
        <h3>Style Memory Registry</h3>
        <p className="small muted">Versioned baseline for consistent visual identity.</p>
        <div className="history-grid">
          {profiles.slice(0, 3).map((p) => (
            <div key={p.styleDnaId} className="history-pill">
              <span className="v-tag">v{p.version}</span>
              <span className="hash-tag">{p.immutableHash.slice(0, 8)}</span>
              {p.styleDnaId === selectedStyleDnaId && <span className="active-dot" />}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .style-history {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px dashed rgba(255,255,255,0.1);
        }
        .history-grid {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        .history-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          font-size: 10px;
        }
        .v-tag { color: #f8d36b; font-weight: bold; }
        .hash-tag { color: rgba(255,255,255,0.4); font-family: monospace; }
        .active-dot {
          width: 6px;
          height: 6px;
          background: #3fb950;
          border-radius: 50%;
          box-shadow: 0 0 5px #3fb950;
        }
      `}</style>
    </section>
  );
}
