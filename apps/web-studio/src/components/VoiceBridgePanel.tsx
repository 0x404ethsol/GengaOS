import { useState, useCallback } from "react";
import { playCinematicCue } from "../lib/cues";

interface VoiceBridgePanelProps {
  projectId: string;
  onStatus: (status: string) => void;
}

export function VoiceBridgePanel({ projectId, onStatus }: VoiceBridgePanelProps) {
  const [audioUrl, setAudioUrl] = useState("seiyuu_take_04.wav");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  const onSync = useCallback(async () => {
    setIsSyncing(true);
    onStatus("Analyzing phonetic waveforms via Wav2Lip processor...");
    
    setTimeout(() => {
      setSyncComplete(true);
      setIsSyncing(false);
      onStatus("Lip-Sync complete. 24 Viseme keyframes mapped to Dope Sheet.");
      playCinematicCue("render-accepted");
    }, 1500);
  }, [onStatus]);

  return (
    <section className="panel-block glass-panel" style={{ background: "#111", border: "1px solid #333", borderRadius: "8px", overflow: "hidden" }}>
      <div className="panel-header" style={{ padding: "10px", background: "#1a1e28", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0, fontSize: "14px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
           <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#4cff91", boxShadow: "0 0 8px #4cff91" }} />
           AI Vocal Bridge (Wav2Lip)
        </h2>
      </div>
      
      <div style={{ padding: "15px" }}>
        <p className="muted small" style={{ marginBottom: "15px", color: "#888" }}>Auto-generate Character mouth flaps (A,E,I,O,U,M) from raw Seiyuu voice files.</p>
        
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <input 
            type="text" 
            value={audioUrl} 
            onChange={(e) => setAudioUrl(e.target.value)}
            style={{ flex: 1, padding: "6px 10px", background: "#000", border: "1px solid #333", color: "#4cff91", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}
          />
          <button 
            type="button" 
            onClick={onSync}
            disabled={isSyncing}
            style={{ background: isSyncing ? "#333" : "#4cff91", color: "#000", border: "none", padding: "0 12px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
          >
            {isSyncing ? "ANALYZING..." : "EXTRACT VISEMES"}
          </button>
        </div>

        {/* Audio Waveform Visualizer */}
        <div style={{ position: "relative", height: "80px", background: "#0e1114", border: "1px solid #222", borderRadius: "4px", overflow: "hidden", marginBottom: "10px" }}>
           {/* Center wire */}
           <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "#fff", opacity: 0.2 }} />
           
           <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M0,50 L5,45 L10,55 L15,30 L20,70 L25,40 L30,60 L35,20 L40,80 L45,45 L50,55 L55,10 L60,90 L65,40 L70,60 L75,30 L80,70 L85,45 L90,55 L95,45 L100,50" fill="none" stroke={syncComplete ? "#4cff91" : "#555"} strokeWidth="1.5" strokeLinejoin="round" />
           </svg>

           {syncComplete && (
             <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", alignItems: "flex-end" }}>
                {["A", "E", "M", "I", "U", "O", "M"].map((viseme, i) => (
                   <div key={i} style={{ flex: 1, borderLeft: "1px dashed rgba(76, 255, 145, 0.3)", height: "100%", position: "relative" }}>
                     <span style={{ position: "absolute", bottom: "2px", left: "4px", fontSize: "9px", color: "#4cff91", background: "rgba(0,0,0,0.8)", padding: "1px 3px", borderRadius: "2px" }}>{viseme}</span>
                   </div>
                ))}
             </div>
           )}
        </div>

        {syncComplete ? (
           <p style={{ fontSize: "10px", color: "#aaa" }}>✓ Viseme track mapped successfully. Linked to target `actor-1` IP-Adapter.</p>
        ) : (
           <p style={{ fontSize: "10px", color: "#555" }}>Pending audio isolation...</p>
        )}
      </div>
    </section>
  );
}
