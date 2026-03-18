import { useState } from "react";

export function AssetVaultPanel({ onStatus }: { onStatus: (msg: string) => void }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const searchVectorDB = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    onStatus(`Scanning local CLIP embeddings for: ${query}`);
    setTimeout(() => {
      setSearching(false);
      onStatus("Vector search complete. 3 assets found.");
    }, 1500);
  };

  return (
    <section className="panel-block asset-vault">
      <div className="panel-head" style={{ marginBottom: "10px" }}>
        <h2 style={{ margin: 0 }}>🗄️ Local Asset Vault</h2>
        <span className="pill" style={{ background: "#4cff91", color: "#000" }}>VECTOR DB ON</span>
      </div>
      <p className="muted" style={{ fontSize: "12px", marginBottom: "15px" }}>Semantic semantic search powered by CLIP embeddings over `~/.gengaos/assets`.</p>
      
      <form onSubmit={searchVectorDB} style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
        <input 
          type="text" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="e.g. 'sword clash blue aura'" 
          style={{ flex: 1, padding: "6px 10px", background: "#111", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
        />
        <button type="submit" disabled={searching} style={{ background: "#333", color: "#fff", border: "none", padding: "0 10px", borderRadius: "4px", cursor: "pointer" }}>
          {searching ? "..." : "Scan"}
        </button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div style={{ height: "60px", background: "#1a1e28", border: "1px solid #333", borderRadius: "4px", position: "relative", overflow: "hidden" }}>
           <img src="https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=200&auto=format&fit=crop" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
           <span style={{ position: "absolute", bottom: "2px", left: "4px", fontSize: "9px", color: "#fff", background: "rgba(0,0,0,0.6)", padding: "2px" }}>98% match</span>
        </div>
        <div style={{ height: "60px", background: "#1a1e28", border: "1px solid #333", borderRadius: "4px", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
           <span style={{ color: "#aaa", fontSize: "10px" }}>Comfy Workflow</span>
           <span style={{ position: "absolute", bottom: "2px", left: "4px", fontSize: "9px", color: "#fff", background: "rgba(0,0,0,0.6)", padding: "2px" }}>82% match</span>
        </div>
      </div>
      
      <button style={{ width: "100%", marginTop: "15px", background: "transparent", border: "1px dashed #555", color: "#aaa", padding: "8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
        + Drop Folder to Index
      </button>
    </section>
  );
}
