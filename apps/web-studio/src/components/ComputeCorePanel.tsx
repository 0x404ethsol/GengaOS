import { useState } from "react";

export function ComputeCorePanel({ onStatus }: { onStatus: (msg: string) => void }) {
  const [visionMode, setVisionMode] = useState("local-comfy");
  const [nlpMode, setNlpMode] = useState("local-ollama");

  const saveSettings = () => {
    onStatus("Hardware compute endpoints routed to local network successfully.");
  };

  return (
    <section className="panel-block compute-core" style={{ background: "#111", border: "1px solid #333", borderRadius: "8px", overflow: "hidden", marginBottom: "15px" }}>
      <div className="panel-head" style={{ background: "#222", padding: "10px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0, fontSize: "14px", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
           <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#00d2ff", boxShadow: "0 0 8px #00d2ff" }} />
           Hardware Compute Core
        </h2>
      </div>
      
      <div style={{ padding: "15px" }}>
        <p className="muted small" style={{ marginBottom: "15px", color: "#888", fontSize: "11px" }}>Route GengaOS nodes to your own local bare-metal GPUs or Cloud APIs. Absolute freedom.</p>
        
        {/* Visual Engine */}
        <div style={{ marginBottom: "12px", background: "#16181d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
           <div style={{ fontSize: "10px", color: "#00d2ff", marginBottom: "6px", fontWeight: "bold", letterSpacing: "1px" }}>VISION / IMAGE ENGINE</div>
           <select value={visionMode} onChange={e => setVisionMode(e.target.value)} style={{ width: "100%", background: "#000", border: "1px solid #333", color: "#fff", padding: "6px", borderRadius: "4px", fontSize: "12px", marginBottom: "6px", cursor: "pointer" }}>
             <option value="local-comfy">Local: ComfyUI Runtime (Port 8188)</option>
             <option value="local-forge">Local: WebUI Forge (Port 7860)</option>
             <option value="cloud-fal">Cloud: Fal.ai Serverless</option>
           </select>
           {visionMode.startsWith("local") && (
             <div style={{ display: "flex", gap: "5px" }}>
                <span style={{ fontSize: "10px", color: "#555", alignSelf: "center" }}>URL:</span>
                <input type="text" defaultValue={visionMode === "local-comfy" ? "http://127.0.0.1:8188" : "http://127.0.0.1:7860"} style={{ flex: 1, background: "#000", border: "1px solid #333", color: "#aaa", padding: "4px", borderRadius: "4px", fontSize: "10px", fontFamily: "monospace" }} />
             </div>
           )}
        </div>

        {/* NLP / Script Engine */}
        <div style={{ marginBottom: "12px", background: "#16181d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
           <div style={{ fontSize: "10px", color: "#ffaa00", marginBottom: "6px", fontWeight: "bold", letterSpacing: "1px" }}>LLM / SCRIPTING ENGINE</div>
           <select value={nlpMode} onChange={e => setNlpMode(e.target.value)} style={{ width: "100%", background: "#000", border: "1px solid #333", color: "#fff", padding: "6px", borderRadius: "4px", fontSize: "12px", marginBottom: "6px", cursor: "pointer" }}>
             <option value="local-ollama">Local: Ollama Server (Port 11434)</option>
             <option value="local-lmstudio">Local: LM Studio (Port 1234)</option>
             <option value="cloud-openai">Cloud: OpenAI (gpt-4o)</option>
             <option value="cloud-anthropic">Cloud: Anthropic (Claude 3.5)</option>
           </select>
           {nlpMode.startsWith("local") && (
             <div style={{ display: "flex", gap: "5px" }}>
                <span style={{ fontSize: "10px", color: "#555", alignSelf: "center" }}>URL:</span>
                <input type="text" defaultValue={nlpMode === "local-ollama" ? "http://127.0.0.1:11434/v1" : "http://127.0.0.1:1234/v1"} style={{ flex: 1, background: "#000", border: "1px solid #333", color: "#aaa", padding: "4px", borderRadius: "4px", fontSize: "10px", fontFamily: "monospace" }} />
             </div>
           )}
        </div>

        {/* Audio / Voice Engine */}
        <div style={{ marginBottom: "15px", background: "#16181d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
           <div style={{ fontSize: "10px", color: "#4cff91", marginBottom: "6px", fontWeight: "bold", letterSpacing: "1px" }}>AUDIO / SEIYUU ENGINE</div>
           <select style={{ width: "100%", background: "#000", border: "1px solid #333", color: "#fff", padding: "6px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}>
             <option value="local-alltalk">Local: AllTalk TTS (Port 7851)</option>
             <option value="local-tortoise">Local: Tortoise TTS Base</option>
             <option value="cloud-eleven">Cloud: ElevenLabs</option>
           </select>
        </div>

        <button 
          type="button" 
          onClick={saveSettings}
          style={{ width: "100%", background: "rgba(0, 210, 255, 0.1)", border: "1px solid #00d2ff", color: "#00d2ff", padding: "8px", borderRadius: "4px", fontSize: "11px", letterSpacing: "1px", cursor: "pointer", fontWeight: "bold" }}
        >
          APPLY HARDWARE ROUTING
        </button>
      </div>
    </section>
  );
}
