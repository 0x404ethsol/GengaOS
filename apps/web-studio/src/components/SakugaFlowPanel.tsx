import { useState, useCallback } from "react";

interface SakugaMoment {
  id: string;
  frameStart: number;
  frameEnd: number;
  intensity: "low" | "medium" | "peak";
  type: "smear" | "impact" | "hold" | "blur" | "perspective-break";
  sakugaScore: number;
  exportReady: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  smear: "Smear Frame",
  impact: "Impact Cut",
  hold: "Dramatic Hold",
  blur: "Motion Blur",
  "perspective-break": "Perspective Break"
};

const INTENSITY_COLORS = {
  low: "#4c8fff",
  medium: "#ffd24d",
  peak: "#ff5a5a",
};

const MOCK_MOMENTS: SakugaMoment[] = [
  { id: "sk1", frameStart: 12, frameEnd: 15, intensity: "peak", type: "impact", sakugaScore: 94, exportReady: true },
  { id: "sk2", frameStart: 42, frameEnd: 44, intensity: "peak", type: "smear", sakugaScore: 89, exportReady: true },
  { id: "sk3", frameStart: 78, frameEnd: 83, intensity: "medium", type: "hold", sakugaScore: 71, exportReady: false },
  { id: "sk4", frameStart: 118, frameEnd: 121, intensity: "peak", type: "perspective-break", sakugaScore: 97, exportReady: true },
  { id: "sk5", frameStart: 155, frameEnd: 157, intensity: "low", type: "blur", sakugaScore: 58, exportReady: false },
];

interface Props {
  projectId: string;
  onStatus: (s: string) => void;
}

export function SakugaFlowPanel({ onStatus }: Props) {
  const [moments, setMoments] = useState<SakugaMoment[]>(MOCK_MOMENTS);
  const [analyzing, setAnalyzing] = useState(false);
  const [reelMode, setReelMode] = useState<"tiktok" | "x" | "full">("x");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(["sk1", "sk2", "sk4"]));

  const analyzeFlow = useCallback(() => {
    setAnalyzing(true);
    setTimeout(() => {
      const newMoment: SakugaMoment = {
        id: `sk${Date.now()}`,
        frameStart: 200 + Math.floor(Math.random() * 50),
        frameEnd: 205 + Math.floor(Math.random() * 8),
        intensity: ["low", "medium", "peak"][Math.floor(Math.random() * 3)] as "low" | "medium" | "peak",
        type: ["smear", "impact", "hold", "blur", "perspective-break"][Math.floor(Math.random() * 5)] as SakugaMoment["type"],
        sakugaScore: 55 + Math.floor(Math.random() * 45),
        exportReady: Math.random() > 0.4,
      };
      setMoments(prev => [...prev, newMoment]);
      setAnalyzing(false);
      onStatus(`Sakuga Flow: New ${TYPE_LABELS[newMoment.type]} detected — score ${newMoment.sakugaScore}`);
    }, 1600);
  }, [onStatus]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportReel = () => {
    const selectedMoments = moments.filter(m => selectedIds.has(m.id));
    const labels: Record<string, string> = { tiktok: "9:16 TikTok", x: "16:9 X/Twitter", full: "Full Episode Cut" };
    onStatus(`Exporting Sakuga Reel (${labels[reelMode]}): ${selectedMoments.length} moments`);
  };

  const avgScore = moments.length
    ? Math.round(moments.reduce((a, m) => a + m.sakugaScore, 0) / moments.length)
    : 0;

  return (
    <section className="panel-block sakuga-panel">
      <div className="sakuga-header">
        <div>
          <h2>⚡ Sakuga Flow Engine</h2>
          <span className="ghost-sub">Viral Moment Detector</span>
        </div>
        <div className="sakuga-avg">
          <span style={{ fontSize: "22px", fontWeight: 700, color: avgScore > 75 ? "#4cff91" : "#ffd24d" }}>
            {avgScore}
          </span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>avg score</span>
        </div>
      </div>

      <div className="sakuga-moments">
        {moments.map(m => (
          <div
            key={m.id}
            className={`sakuga-moment ${selectedIds.has(m.id) ? "selected" : ""}`}
            onClick={() => toggleSelect(m.id)}
            style={{ borderLeft: `3px solid ${INTENSITY_COLORS[m.intensity]}` }}
          >
            <div className="sakuga-moment-left">
              <span className="sakuga-type">{TYPE_LABELS[m.type]}</span>
              <span className="sakuga-frames">F{m.frameStart}–{m.frameEnd}</span>
            </div>
            <div className="sakuga-moment-right">
              <span className="sakuga-score" style={{ color: INTENSITY_COLORS[m.intensity] }}>
                {m.sakugaScore}
              </span>
              {m.exportReady && <span className="sakuga-ready">✓</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="sakuga-controls">
        <div className="reel-mode-selector">
          {(["tiktok", "x", "full"] as const).map(mode => (
            <button
              key={mode}
              className={`reel-mode-btn ${reelMode === mode ? "active" : ""}`}
              onClick={() => setReelMode(mode)}
            >
              {mode === "tiktok" ? "TikTok" : mode === "x" ? "X / Twitter" : "Full Cut"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button className="ghost-apply-btn" onClick={analyzeFlow} disabled={analyzing}>
            {analyzing ? "Analyzing…" : "Analyze"}
          </button>
          <button className="sakuga-export-btn" onClick={exportReel} disabled={selectedIds.size === 0}>
            Export Reel ({selectedIds.size})
          </button>
        </div>
      </div>
    </section>
  );
}
