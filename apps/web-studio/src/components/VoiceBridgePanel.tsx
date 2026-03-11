import { useState, useCallback } from "react";
import { type ExpressionTake } from "@genga/contracts";
import { playCinematicCue } from "../lib/cues";

interface VoiceBridgePanelProps {
  projectId: string;
  onStatus: (status: string) => void;
}

export function VoiceBridgePanel({ projectId, onStatus }: VoiceBridgePanelProps) {
  const [audioUrl, setAudioUrl] = useState("char_lead_dialog_v1.mp3");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastTake, setLastTake] = useState<ExpressionTake | null>(null);

  const onSync = useCallback(async () => {
    setIsSyncing(true);
    onStatus("Analyzing audio for phoneme extraction...");
    
    try {
      // Simulate API delay
      await new Promise(r => setTimeout(r, 1500));
      
      const response = await fetch("http://localhost:8000/v1/voice/generate-expression-takes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          audioSrc: audioUrl,
          mood: "intense"
        })
      });

      if (!response.ok) throw new Error("Voice bridge sync failed");
      
      const take: ExpressionTake = await response.json();
      setLastTake(take);
      onStatus(`Sync complete: ${take.keys.length} expressions keys generated.`);
      playCinematicCue("render-accepted");
    } catch (error) {
      console.error(error);
      onStatus("Error syncing voice bridge. Verify control-api is running.");
    } finally {
      setIsSyncing(false);
    }
  }, [projectId, audioUrl, onStatus]);

  return (
    <section className="panel-block glass-panel">
      <div className="panel-header">
        <div className="header-orb voice-orb" />
        <h2>AI Voice Bridge</h2>
      </div>
      <p className="muted small">Sync audio tracks to automatic lip-sync and expression profiles.</p>
      
      <div className="input-field">
        <label>Audio Source</label>
        <input 
          type="text" 
          value={audioUrl} 
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="Path to audio asset..."
        />
      </div>

      <div className="voice-actions">
        <button 
          type="button" 
          className="action-button primary-accent"
          onClick={onSync}
          disabled={isSyncing}
        >
          {isSyncing ? "Syncing..." : "Sync Lip-Sync (Sakuga Mode)"}
        </button>
      </div>

      {lastTake && (
        <div className="take-preview">
          <p className="small"><strong>Active Take:</strong> {lastTake.name}</p>
          <div className="phoneme-viz">
            {lastTake.keys.slice(0, 12).map((key, i) => (
              <span key={i} className="phoneme-tag">{key.phoneme}</span>
            ))}
            {lastTake.keys.length > 12 && <span>...</span>}
          </div>
        </div>
      )}

      <style>{`
        .voice-orb {
          background: linear-gradient(135deg, #f8d36b, #ff8b3d);
          box-shadow: 0 0 10px rgba(255, 139, 61, 0.4);
        }
        .voice-actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }
        .take-preview {
          margin-top: 12px;
          padding: 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .phoneme-viz {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }
        .phoneme-tag {
          font-size: 10px;
          padding: 2px 4px;
          background: rgba(248, 211, 107, 0.2);
          color: #f8d36b;
          border: 1px solid rgba(248, 211, 107, 0.3);
          border-radius: 4px;
          font-family: monospace;
        }
      `}</style>
    </section>
  );
}
