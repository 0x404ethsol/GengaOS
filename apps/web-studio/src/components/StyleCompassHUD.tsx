import { useState, useEffect } from "react";

interface CompassReading {
  dimension: string;
  locked: string;
  current: string;
  drift: number; // 0-1, 0 = perfect
  status: "green" | "yellow" | "red";
}

interface Props {
  projectId: string;
  styleDnaId: string;
}

const DIMENSIONS = ["Line Weight", "Shading Mode", "Color Temp", "Lens Lang", "Art Direction"];

function simulateReading(dim: string): CompassReading {
  const drift = Math.random() * 0.6;
  const status = drift < 0.15 ? "green" : drift < 0.45 ? "yellow" : "red";
  const locked = {
    "Line Weight": "2.5px bold", "Shading Mode": "cel-anime",
    "Color Temp": "warm-5500K", "Lens Lang": "28mm wide", "Art Direction": "MAPPA-kinetic"
  }[dim] ?? "—";
  const currents: Record<string, string[]> = {
    "Line Weight": ["2.5px bold", "3.2px bold", "1.8px thin"],
    "Shading Mode": ["cel-anime", "semi-realistic", "flat"],
    "Color Temp": ["warm-5500K", "cold-4200K", "warm-5500K"],
    "Lens Lang": ["28mm wide", "50mm standard", "28mm wide"],
    "Art Direction": ["MAPPA-kinetic", "MAPPA-kinetic", "Studio-Trigger-bold"],
  };
  const pool = currents[dim] ?? [locked];
  const current = drift < 0.15 ? locked : pool[Math.floor(Math.random() * pool.length)];
  return { dimension: dim, locked, current, drift, status };
}

const STATUS_COLORS = { green: "#4cff91", yellow: "#ffd24d", red: "#ff5a5a" };
const STATUS_LABELS = { green: "On Style", yellow: "Drifting", red: "Off Brand" };

export function StyleCompassHUD({ styleDnaId }: Props) {
  const [readings, setReadings] = useState<CompassReading[]>([]);
  const [overall, setOverall] = useState<"green" | "yellow" | "red">("green");
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const r = DIMENSIONS.map(simulateReading);
      setReadings(r);
      const avgDrift = r.reduce((acc, x) => acc + x.drift, 0) / r.length;
      setOverall(avgDrift < 0.15 ? "green" : avgDrift < 0.4 ? "yellow" : "red");
    };
    refresh();
    const interval = setInterval(refresh, 20000);
    return () => clearInterval(interval);
  }, [styleDnaId]);

  const overallColor = STATUS_COLORS[overall];

  return (
    <div className={`style-compass-hud ${minimized ? "minimized" : ""}`}>
      <div className="compass-header" onClick={() => setMinimized(m => !m)}>
        <div className="compass-indicator" style={{ background: overallColor }} />
        <span className="compass-title">Style Compass</span>
        <span className="compass-status" style={{ color: overallColor }}>
          {STATUS_LABELS[overall]}
        </span>
        <span className="compass-toggle">{minimized ? "▲" : "▼"}</span>
      </div>
      {!minimized && (
        <div className="compass-readings">
          {readings.map(r => (
            <div key={r.dimension} className="compass-row">
              <div className="compass-row-dot" style={{ background: STATUS_COLORS[r.status] }} />
              <div className="compass-row-info">
                <span className="compass-dim">{r.dimension}</span>
                <div className="compass-bar-track">
                  <div
                    className="compass-bar-fill"
                    style={{
                      width: `${Math.round((1 - r.drift) * 100)}%`,
                      background: STATUS_COLORS[r.status]
                    }}
                  />
                </div>
              </div>
              <div className="compass-row-vals">
                <span style={{ color: "var(--text-muted)", fontSize: "9px" }}>
                  {Math.round((1 - r.drift) * 100)}%
                </span>
              </div>
            </div>
          ))}
          {!styleDnaId && (
            <p className="muted" style={{ fontSize: "10px", textAlign: "center", margin: "8px 0 0" }}>
              Lock a Style DNA to enable live tracking
            </p>
          )}
        </div>
      )}
    </div>
  );
}
