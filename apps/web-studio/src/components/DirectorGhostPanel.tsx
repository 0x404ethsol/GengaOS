import { useState, useEffect, useCallback } from "react";

interface GhostSuggestion {
  id: string;
  category: "camera" | "timing" | "emotion" | "continuity" | "style";
  priority: "whisper" | "nudge" | "urgent";
  icon: string;
  text: string;
  action?: string;
  confidence: number;
}

const GHOST_LIBRARY: GhostSuggestion[] = [
  {
    id: "g1", category: "camera", priority: "nudge", icon: "🎥",
    text: "This scene has no camera movement. Try a micro-dolly to add breathing.",
    action: "Apply Micro-Dolly", confidence: 0.88
  },
  {
    id: "g2", category: "emotion", priority: "whisper", icon: "🎭",
    text: "Character held 8+ frames. MAPPA pacing uses 5-6 for this emotion class.",
    action: "Adjust Timing", confidence: 0.74
  },
  {
    id: "g3", category: "continuity", priority: "urgent", icon: "⚠️",
    text: "Axis crossed between Shot 4 → 5. Viewer spatial memory is disoriented.",
    action: "Add Buffer Shot", confidence: 0.96
  },
  {
    id: "g4", category: "style", priority: "whisper", icon: "✦",
    text: "Line weight in this cut is heavier than your Style DNA. Drift: +22%.",
    action: "Snap to DNA", confidence: 0.81
  },
  {
    id: "g5", category: "timing", priority: "nudge", icon: "⏱",
    text: "Impact moment at frame 42 has no hold. Add 2-3 freeze frames for sakuga effect.",
    action: "Insert Hold", confidence: 0.79
  },
  {
    id: "g6", category: "camera", priority: "whisper", icon: "👁",
    text: "Close-up sequence running 4+ shots. Counter with wide establishing shot.",
    action: "Insert Wide Shot", confidence: 0.70
  },
  {
    id: "g7", category: "emotion", priority: "nudge", icon: "💠",
    text: "Scene mood is 'resolve' but color temperature reads 'cold'. Warm the palette.",
    action: "Adjust Color Temp", confidence: 0.85
  },
];

const PRIORITY_COLORS = {
  whisper: "rgba(120, 180, 255, 0.6)",
  nudge: "rgba(255, 210, 80, 0.85)",
  urgent: "rgba(255, 90, 90, 0.9)",
};

const PRIORITY_LABELS = {
  whisper: "Co-Director Whisper",
  nudge: "Ghost Note",
  urgent: "⚡ Urgent Flag",
};

interface Props {
  projectId: string;
  onStatus: (s: string) => void;
}

export function DirectorGhostPanel({ onStatus }: Props) {
  const [suggestions, setSuggestions] = useState<GhostSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(72);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const runGhostScan = useCallback(() => {
    setScanning(true);
    setTimeout(() => {
      const count = 2 + Math.floor(Math.random() * 3);
      const shuffled = [...GHOST_LIBRARY].sort(() => Math.random() - 0.5).slice(0, count);
      setSuggestions(shuffled);
      setScore(55 + Math.floor(Math.random() * 40));
      setScanning(false);
      onStatus(`Ghost Director: ${count} suggestion${count !== 1 ? "s" : ""} ready`);
    }, 1400);
  }, [onStatus]);

  useEffect(() => {
    runGhostScan();
    const interval = setInterval(runGhostScan, 45000);
    return () => clearInterval(interval);
  }, [runGhostScan]);

  const dismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
    onStatus("Ghost suggestion dismissed");
  };

  const apply = (s: GhostSuggestion) => {
    dismiss(s.id);
    onStatus(`Ghost Director applied: ${s.action}`);
  };

  const filtered = suggestions.filter(s =>
    !dismissed.has(s.id) && (filter === "all" || s.category === filter)
  );

  const scoreColor = score >= 80 ? "#4cff91" : score >= 60 ? "#ffd24d" : "#ff5a5a";
  const scoreLabel = score >= 80 ? "Production Ready" : score >= 60 ? "On Track" : "Needs Attention";

  return (
    <section className="panel-block ghost-panel">
      <div className="ghost-header">
        <div className="ghost-title">
          <span className="ghost-icon">👻</span>
          <div>
            <h2>Director's Ghost</h2>
            <span className="ghost-sub">AI Co-Director — Always Watching</span>
          </div>
        </div>
        <button
          className="ghost-scan-btn"
          onClick={runGhostScan}
          disabled={scanning}
          title="Re-scan scene graph"
        >
          {scanning ? "Scanning…" : "↻ Scan"}
        </button>
      </div>

      <div className="mappa-score-row">
        <div className="mappa-score-label">
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>MAPPA Score</span>
          <span style={{ fontSize: "24px", fontWeight: 700, color: scoreColor, letterSpacing: "-1px" }}>
            {score}
          </span>
          <span style={{ fontSize: "10px", color: scoreColor, textTransform: "uppercase", letterSpacing: "1px" }}>
            {scoreLabel}
          </span>
        </div>
        <div className="mappa-score-bar-wrap">
          <div className="mappa-score-bar" style={{ width: `${score}%`, background: scoreColor }} />
        </div>
      </div>

      <div className="ghost-filters">
        {["all", "camera", "timing", "emotion", "continuity", "style"].map(cat => (
          <button
            key={cat}
            className={`ghost-filter-btn ${filter === cat ? "active" : ""}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="ghost-suggestions">
        {scanning && (
          <div className="ghost-scanning">
            <div className="ghost-scan-pulse" />
            <span>Analyzing scene graph…</span>
          </div>
        )}
        {!scanning && filtered.length === 0 && (
          <div className="ghost-empty">
            <span>✦</span>
            <p>Ghost Director has no notes. Scene is clean.</p>
          </div>
        )}
        {!scanning && filtered.map(s => (
          <div key={s.id} className={`ghost-card ghost-${s.priority}`} style={{
            borderLeft: `3px solid ${PRIORITY_COLORS[s.priority]}`
          }}>
            <div className="ghost-card-top">
              <span className="ghost-card-icon">{s.icon}</span>
              <div className="ghost-card-body">
                <span className="ghost-card-label" style={{ color: PRIORITY_COLORS[s.priority] }}>
                  {PRIORITY_LABELS[s.priority]}
                </span>
                <p className="ghost-card-text">{s.text}</p>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {Math.round(s.confidence * 100)}% confidence
                  </span>
                  <span className="ghost-category-tag">{s.category}</span>
                </div>
              </div>
            </div>
            <div className="ghost-card-actions">
              {s.action && (
                <button className="ghost-apply-btn" onClick={() => apply(s)}>
                  {s.action}
                </button>
              )}
              <button className="ghost-dismiss-btn" onClick={() => dismiss(s.id)}>
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
