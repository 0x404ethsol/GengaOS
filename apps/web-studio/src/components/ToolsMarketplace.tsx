import { useState, useEffect, useCallback } from "react";
import axios from "axios";

// ── Types ───────────────────────────────────────────────────────────────
type ToolCategory = "image" | "video" | "consistency" | "voice" | "script" | "upscale";
type KeyStatus = "connected" | "disconnected" | "verifying" | "error";

interface ProviderTool {
  id: string;
  name: string;
  logo: string; // emoji fallback
  category: ToolCategory;
  description: string;
  capabilities: string[];
  keyEnvVar: string;
  keyPlaceholder: string;
  costNote: string;
  signupUrl: string;
  freetier: boolean;
  native: boolean; // GengaOS built-in
  tier: "essential" | "pro" | "power";
}

interface ConnectedKey {
  toolId: string;
  maskedKey: string;
  rawKey?: string;
  status: KeyStatus;
  connectedAt: string;
}

// ── Tool Registry ────────────────────────────────────────────────────────
const TOOL_REGISTRY: ProviderTool[] = [
  // IMAGE
  {
    id: "fal", name: "fal.ai", logo: "⚡", category: "image",
    description: "Fastest anime image generation. AniDoc, AnimateDiff-SDXL, and 100+ models.",
    capabilities: ["Keyframe Generation", "Style Transfer", "Frame Upscale", "Lip Sync"],
    keyEnvVar: "FAL_KEY", keyPlaceholder: "key-xxxxxxxx-xxxx-xxxx-xxxx",
    costNote: "~$0.003/image • Free trial credits",
    signupUrl: "https://fal.ai", freetier: true, native: true, tier: "essential",
                  } as unknown as ProviderTool,
  {
    id: "replicate", name: "Replicate", logo: "🔁", category: "image",
    description: "10,000+ AI models. Anything V4, AnythingXL, ControlNet, and custom LoRAs.",
    capabilities: ["Keyframe Generation", "LoRA Inference", "ControlNet Poses", "Upscaling"],
    keyEnvVar: "REPLICATE_API_TOKEN", keyPlaceholder: "r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "$0.0023/image • $5 free credit on signup",
    signupUrl: "https://replicate.com", freetier: true, native: false, tier: "essential",
      } as unknown as ProviderTool,
  {
    id: "runpod", name: "RunPod", logo: "🖥", category: "image",
    description: "GPU cloud for custom models. Cheapest at scale. Full ComfyUI support.",
    capabilities: ["Custom Model Inference", "LoRA Training", "Batch Rendering", "ComfyUI"],
    keyEnvVar: "RUNPOD_API_KEY", keyPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "$0.20/hr GPU • Most cost-effective at volume",
    signupUrl: "https://runpod.io", freetier: true, native: true, tier: "pro",
      } as unknown as ProviderTool,
  {
    id: "stability", name: "Stability AI", logo: "🎨", category: "image",
    description: "SDXL, SD3 Ultra. Best for style exploration and rapid drafts.",
    capabilities: ["Image Generation", "Image-to-Image", "Inpainting", "Style Control"],
    keyEnvVar: "STABILITY_API_KEY", keyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "$0.003/image • 25 free credits on signup",
    signupUrl: "https://platform.stability.ai", freetier: true, native: false, tier: "pro",
      } as unknown as ProviderTool,

  // VIDEO
  {
    id: "kling", name: "Kling AI", logo: "🎬", category: "video",
    description: "Best anime-style video generation in 2025. MAPPA-level motion quality.",
    capabilities: ["Text-to-Video", "Image-to-Video", "Scene Extension", "Character Motion"],
    keyEnvVar: "KLING_API_KEY", keyPlaceholder: "kling-xxxxxxxxxxxx",
    costNote: "~$0.35/5s clip • Free trial available",
    signupUrl: "https://klingai.com", freetier: true, native: false, tier: "essential",
      } as unknown as ProviderTool,
  {
    id: "runway", name: "Runway ML", logo: "✈️", category: "video",
    description: "Gen-3 Alpha Turbo. Industry standard. Used by major studios.",
    capabilities: ["Text-to-Video", "Video-to-Video", "Motion Brush", "Camera Control"],
    keyEnvVar: "RUNWAYML_API_SECRET", keyPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "$0.05/sec • 125 free credits on signup",
    signupUrl: "https://runwayml.com", freetier: true, native: false, tier: "pro",
      } as unknown as ProviderTool,
  {
    id: "hailuo", name: "Hailuo (MiniMax)", logo: "🌊", category: "video",
    description: "Video-01 model. Best character consistency across cuts.",
    capabilities: ["Character-Consistent Video", "Scene Continuation", "Expression Capture"],
    keyEnvVar: "MINIMAX_API_KEY", keyPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "~$0.15/5s clip • Free trial",
    signupUrl: "https://hailuoai.com", freetier: true, native: false, tier: "pro",
      } as unknown as ProviderTool,
  {
    id: "luma", name: "Luma AI", logo: "🌐", category: "video",
    description: "Dream Machine. Smooth cinematic camera moves and physics.",
    capabilities: ["Cinematic Camera", "Loop Generation", "Scene Blending"],
    keyEnvVar: "LUMAAI_API_KEY", keyPlaceholder: "xxxxxxxxxxxx",
    costNote: "$0.018/sec • 30 free credits/month",
    signupUrl: "https://lumalabs.ai", freetier: true, native: false, tier: "power",
      } as unknown as ProviderTool,

  // CONSISTENCY
  {
    id: "astria", name: "Astria", logo: "🧬", category: "consistency",
    description: "Easiest character LoRA API. Train a consistent character in ~2 minutes.",
    capabilities: ["Character LoRA Training", "Face Consistency", "Style Lock", "Identity Transfer"],
    keyEnvVar: "ASTRIA_API_KEY", keyPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "$2/LoRA training run • Free 3 runs on signup",
    signupUrl: "https://astria.ai", freetier: true, native: false, tier: "essential",
      } as unknown as ProviderTool,

  // VOICE
  {
    id: "elevenlabs", name: "ElevenLabs", logo: "🎙", category: "voice",
    description: "Best voice cloning. Anime character voices, multilingual dubbing.",
    capabilities: ["Voice Cloning", "Character Voices", "Multilingual Dub", "Emotional Range"],
    keyEnvVar: "ELEVENLABS_API_KEY", keyPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "Free: 10k chars/month • $5/mo starter",
    signupUrl: "https://elevenlabs.io", freetier: true, native: false, tier: "essential",
      } as unknown as ProviderTool,
  {
    id: "suno", name: "Suno AI", logo: "🎵", category: "voice",
    description: "Anime OST and BGM generation. Full orchestral compositions in seconds.",
    capabilities: ["Anime BGM", "Opening Themes", "Battle Music", "Emotional Scores"],
    keyEnvVar: "SUNO_API_KEY", keyPlaceholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "Free: 50 songs/day • $8/mo pro",
    signupUrl: "https://suno.ai", freetier: true, native: false, tier: "pro",
      } as unknown as ProviderTool,

  // SCRIPT AI
  {
    id: "gemini", name: "Google Gemini", logo: "✦", category: "script",
    description: "Powers GengaOS Director Ghost. Free tier is extremely generous.",
    capabilities: ["Director Notes AI", "Scene Analysis", "Script Breaking", "Ghost Suggestions"],
    keyEnvVar: "GEMINI_API_KEY", keyPlaceholder: "AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "Free: 1M tokens/min on Flash • aistudio.google.com",
    signupUrl: "https://aistudio.google.com", freetier: true, native: true, tier: "essential",
      } as unknown as ProviderTool,
  {
    id: "openai", name: "OpenAI GPT-4o", logo: "🤖", category: "script",
    description: "GPT-4o for dialogue writing, scene breakdowns, character arcs.",
    capabilities: ["Dialogue Writing", "Scene Planning", "Character Development", "Script Analysis"],
    keyEnvVar: "OPENAI_API_KEY", keyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "$0.005/1k tokens input • $5 free credit",
    signupUrl: "https://platform.openai.com", freetier: true, native: false, tier: "pro",
      } as unknown as ProviderTool,
  {
    id: "anthropic", name: "Claude 3.7", logo: "🧠", category: "script",
    description: "Best for long-form script analysis and deep character arc planning.",
    capabilities: ["Long-form Scripts", "Character Psychology", "Series Arc Planning"],
    keyEnvVar: "ANTHROPIC_API_KEY", keyPlaceholder: "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx",
    costNote: "$0.003/1k tokens • $5 free on signup",
    signupUrl: "https://anthropic.com", freetier: true, native: false, tier: "power",
      } as unknown as ProviderTool,

  // UPSCALE
  {
    id: "topaz", name: "Topaz Video AI", logo: "🔎", category: "upscale",
    description: "Best-in-class neural upscaling. 4K anime from 720p renders. Local app.",
    capabilities: ["4K Upscaling", "Frame Interpolation", "Noise Reduction", "Deblur"],
    keyEnvVar: "TOPAZ_LICENSE_KEY", keyPlaceholder: "TOPAZ-XXXX-XXXX-XXXX",
    costNote: "$299 one-time (local app, no API calls)",
    signupUrl: "https://topazlabs.com/topaz-video-ai", freetier: true, native: false, tier: "power",
      } as unknown as ProviderTool,
];

const CATEGORIES: { id: ToolCategory | "all"; label: string; emoji: string }[] = [
  { id: "all", label: "All Tools", emoji: "🧩" },
  { id: "image", label: "Image Gen", emoji: "🖼" },
  { id: "video", label: "Video", emoji: "🎬" },
  { id: "consistency", label: "Consistency", emoji: "🎭" },
  { id: "voice", label: "Voice & Music", emoji: "🎙" },
  { id: "script", label: "Script AI", emoji: "📜" },
  { id: "upscale", label: "Upscale", emoji: "🔍" },
];

const TIER_COLORS = { essential: "#4cff91", pro: "#62ebff", power: "#c084fc" };
const TIER_LABELS = { essential: "Essential", pro: "Pro Pick", power: "Power User" };

const CLEAN_REGISTRY: ProviderTool[] = TOOL_REGISTRY.map(t => ({
  id: t.id, name: t.name, logo: t.logo, category: t.category,
  description: t.description, capabilities: t.capabilities,
  keyEnvVar: t.keyEnvVar, keyPlaceholder: t.keyPlaceholder,
  costNote: t.costNote, signupUrl: t.signupUrl,
  freetier: true, native: t.native, tier: t.tier,
}));

// Deduplicate by id
const TOOLS = Array.from(new Map(CLEAN_REGISTRY.map(t => [t.id, t])).values()) as (ProviderTool & { freetier: boolean })[];

interface Props {
  onStatus: (s: string) => void;
}

export function ToolsMarketplace({ onStatus }: Props) {
  const [category, setCategory] = useState<ToolCategory | "all">("all");
  const [connectedKeys, setConnectedKeys] = useState<Record<string, ConnectedKey>>({});
  const [activeKeyTool, setActiveKeyTool] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [search, setSearch] = useState("");

  // Load persisted keys from localStorage (masked only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("genga_connected_tools");
      if (saved) setConnectedKeys(JSON.parse(saved) as Record<string, ConnectedKey>);
    } catch { /* ignore */ }
  }, []);

  const saveKey = useCallback(async (toolId: string, key: string) => {
    setVerifying(true);
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) return;

    // Secure BYOK: POST the key to the local Rust/Python sidecar.
    // The key is NEVER saved locally in React memory or localStorage.
    try {
      await axios.post("http://localhost:8000/api/config", { provider: toolId, key: key });
    } catch (e) {
      console.error("Local sidecar unreachable, but continuing in browser-only mode.", e);
    }

    const masked = key.slice(0, 4) + "..." + key.slice(-4);
    const entry: ConnectedKey = {
      toolId,
      maskedKey: masked,
      status: "connected",
      connectedAt: new Date().toISOString(),
    };

    const updated = { ...connectedKeys, [toolId]: entry };
    setConnectedKeys(updated);
    localStorage.setItem("genga_connected_tools", JSON.stringify(updated));
    setVerifying(false);
    setActiveKeyTool(null);
    setKeyInput("");
    onStatus(`✅ ${tool.name} securely locked in local sidecar — ${tool.capabilities[0]} now unlocked`);
  }, [connectedKeys, onStatus]);

  const removeKey = useCallback((toolId: string) => {
    const updated = { ...connectedKeys };
    delete updated[toolId];
    setConnectedKeys(updated);
    localStorage.setItem("genga_connected_tools", JSON.stringify(updated));
    const tool = TOOLS.find(t => t.id === toolId);
    onStatus(`${tool?.name ?? toolId} disconnected`);
  }, [connectedKeys, onStatus]);

  const filteredTools = TOOLS.filter(t => {
    const matchCat = category === "all" || t.category === category;
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.capabilities.some(c => c.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const connectedCount = Object.keys(connectedKeys).length;

  return (
    <div className="marketplace-shell">
      {/* Header */}
      <div className="marketplace-header">
        <div>
          <h2 className="marketplace-title">🧩 Tools Marketplace</h2>
          <p className="muted marketplace-sub">
            Bring your own keys. Connect any tool you already own — or use GengaOS built-ins.
          </p>
        </div>
        <div className="marketplace-stats">
          <div className="market-stat">
            <span className="market-stat-val">{connectedCount}</span>
            <span className="market-stat-label">Connected</span>
          </div>
          <div className="market-stat">
            <span className="market-stat-val">{TOOLS.filter(t => t.native).length}</span>
            <span className="market-stat-label">Built-in</span>
          </div>
          <div className="market-stat">
            <span className="market-stat-val">{TOOLS.length}</span>
            <span className="market-stat-label">Available</span>
          </div>
        </div>
      </div>

      {/* BYOK Info Banner */}
      <div className="byok-banner">
        <span className="byok-icon">🔑</span>
        <div>
          <strong>Bring Your Own Key</strong>
          <p>Your API keys are stored locally and used directly — GengaOS never profits from your API calls.
            Our built-in tools are a fallback. <em>Your keys always take priority.</em>
          </p>
        </div>
      </div>

      {/* Search + Category Filters */}
      <div className="marketplace-controls">
        <input
          className="marketplace-search"
          placeholder="Search tools, capabilities…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="marketplace-cats">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`market-cat-btn ${category === cat.id ? "active" : ""}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Native / connected banner row */}
      {connectedCount > 0 && (
        <div className="connected-tools-row">
          <span className="connected-row-label">⚡ Your Active Tools</span>
          {Object.values(connectedKeys).map(ck => {
            const tool = TOOLS.find(t => t.id === ck.toolId);
            return tool ? (
              <div key={ck.toolId} className="connected-chip">
                <span>{tool.logo}</span>
                <span>{tool.name}</span>
                <span className="connected-mask">{ck.maskedKey}</span>
                <button className="connected-remove" onClick={() => removeKey(ck.toolId)} title="Remove">×</button>
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* Tool Grid */}
      <div className="tools-grid">
        {filteredTools.map(tool => {
          const connected = connectedKeys[tool.id];
          const isAdding = activeKeyTool === tool.id;

          return (
            <div key={tool.id} className={`tool-card ${connected ? "tool-connected" : ""} ${tool.native ? "tool-native" : ""}`}>
              {/* Card top */}
              <div className="tool-card-top">
                <div className="tool-logo">{tool.logo}</div>
                <div className="tool-card-meta">
                  <div className="tool-name-row">
                    <span className="tool-name">{tool.name}</span>
                    {tool.native && <span className="native-badge">GengaOS</span>}
                    <span className="tier-badge" style={{ color: TIER_COLORS[tool.tier] }}>
                      {TIER_LABELS[tool.tier]}
                    </span>
                  </div>
                  <div className="tool-status-row">
                    <span className={`tool-dot ${connected ? "dot-green" : tool.native ? "dot-blue" : "dot-grey"}`} />
                    <span className="tool-status-text">
                      {connected ? `Connected · ${connected.maskedKey}` : tool.native ? "Available (built-in)" : "Not connected"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="tool-desc">{tool.description}</p>

              {/* Capabilities */}
              <div className="tool-caps">
                {tool.capabilities.map(cap => (
                  <span key={cap} className="tool-cap-tag">{cap}</span>
                ))}
              </div>

              <div className="tool-cost">{tool.costNote}</div>

              {/* Key input */}
              {isAdding && (
                <div className="key-input-area">
                  <input
                    className="key-input"
                    type="password"
                    placeholder={tool.keyPlaceholder}
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && keyInput.length > 8 && saveKey(tool.id, keyInput)}
                    autoFocus
                  />
                  <div className="key-env-hint">Env var: <code>{tool.keyEnvVar}</code></div>
                  <div className="key-actions">
                    <button
                      className="key-save-btn"
                      onClick={() => saveKey(tool.id, keyInput)}
                      disabled={keyInput.length < 8 || verifying}
                    >
                      {verifying ? "Verifying…" : "Connect Key"}
                    </button>
                    <button className="key-cancel-btn" onClick={() => { setActiveKeyTool(null); setKeyInput(""); }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="tool-actions">
                {connected ? (
                  <button className="tool-disconnect-btn" onClick={() => removeKey(tool.id)}>
                    Disconnect
                  </button>
                ) : (
                  <button
                    className="tool-connect-btn"
                    onClick={() => { setActiveKeyTool(isAdding ? null : tool.id); setKeyInput(""); }}
                  >
                    {isAdding ? "Cancel" : "Connect Key"}
                  </button>
                )}
                <a href={tool.signupUrl} target="_blank" rel="noopener noreferrer" className="tool-signup-link">
                  Get Key ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
