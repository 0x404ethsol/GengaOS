import { useEffect, useMemo, useState } from "react";
import { getAnimeSectionLabel, type ExtensionManifest } from "@genga/contracts";
import { controlApi } from "../lib/api";

interface ExtensionRegistryProps {
  onHydrateNode: (
    manifest: ExtensionManifest,
    capabilityId: string,
    runtime: string,
    grantedScopes: string[]
  ) => void;
}

type AnimeCategory = ExtensionManifest["animeCategory"] | "all";

export function ExtensionRegistry({ onHydrateNode }: ExtensionRegistryProps) {
  const [extensions, setExtensions] = useState<ExtensionManifest[]>([]);
  const [selectedExtension, setSelectedExtension] = useState<string>("");
  const [selectedCapability, setSelectedCapability] = useState<string>("");
  const [selectedRuntime, setSelectedRuntime] = useState<string>("");
  const [grantedScopes, setGrantedScopes] = useState<string[]>([]);
  const [category, setCategory] = useState<AnimeCategory>("all");
  const [status, setStatus] = useState<string>("No extension action yet");

  useEffect(() => {
    controlApi.listExtensions().then((result) => {
      const all = (result.extensions ?? []) as ExtensionManifest[];
      setExtensions(all);
      if (all[0]) {
        setSelectedExtension(all[0].id);
        setSelectedCapability(all[0].capabilities[0]?.id ?? "");
        setSelectedRuntime(all[0].agentRuntimes?.[0] ?? "local-mcp");
      }
    });
  }, []);

  const filtered = useMemo(() => {
    if (category === "all") {
      return extensions;
    }
    return extensions.filter((entry) => entry.animeCategory === category);
  }, [category, extensions]);

  const current = useMemo(
    () => filtered.find((entry) => entry.id === selectedExtension) ?? extensions.find((entry) => entry.id === selectedExtension),
    [extensions, filtered, selectedExtension]
  );

  const capability = useMemo(
    () => current?.capabilities.find((item) => item.id === selectedCapability),
    [current, selectedCapability]
  );

  const requiredScopes = capability?.requiredScopes ?? [];
  const missingScopes = requiredScopes.filter((scope) => !grantedScopes.includes(scope));
  const approvedForAnime = current?.trustFlags?.includes("approved-for-anime-production") ?? false;

  const installSelected = async () => {
    if (!selectedExtension) return;
    await controlApi.installExtension(selectedExtension);
    setStatus(`Installed ${selectedExtension}`);
  };

  const hydrate = () => {
    if (!current || !selectedCapability) return;
    if (missingScopes.length) {
      setStatus(`Grant required scopes first: ${missingScopes.join(", ")}`);
      return;
    }
    onHydrateNode(current, selectedCapability, selectedRuntime, grantedScopes);
    setStatus(`Hydrated node for ${current.name}/${selectedCapability}`);
  };

  const verifyRuntime = async () => {
    if (!current || !selectedCapability) return;
    if (missingScopes.length) {
      setStatus(`Verification blocked: missing scopes ${missingScopes.join(", ")}`);
      return;
    }
    const result = await controlApi.executeExtension(
      current.id,
      selectedCapability,
      { dryRun: true, ts: Date.now() },
      selectedRuntime,
      grantedScopes,
      true
    );
    setStatus(`Runtime verified: ${result.result.agentRuntime}`);
  };

  const toggleScope = (scope: string) => {
    setGrantedScopes((prev) => (prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope]));
  };

  return (
    <section className="panel-block extension-registry-panel">
      <h2>{getAnimeSectionLabel("deliver")} {getAnimeSectionLabel("extensions")}</h2>
      <p className="muted">Curated anime extension store with trust visibility, runtime controls, and explicit permission prompts.</p>

      <label>Category</label>
      <select value={category} onChange={(event) => setCategory(event.target.value as AnimeCategory)}>
        <option value="all">All Categories</option>
        <option value="storyboard">Storyboard</option>
        <option value="color">Color</option>
        <option value="fx">FX</option>
        <option value="layout">Layout</option>
        <option value="pipeline">Pipeline</option>
        <option value="voice">Voice</option>
        <option value="automation">Automation</option>
      </select>

      <label>Extension</label>
      <select
        value={selectedExtension}
        onChange={(event) => {
          const nextId = event.target.value;
          setSelectedExtension(nextId);
          const selected = extensions.find((entry) => entry.id === nextId);
          setSelectedCapability(selected?.capabilities[0]?.id ?? "");
          setSelectedRuntime(selected?.agentRuntimes?.[0] ?? "local-mcp");
          setGrantedScopes([]);
        }}
      >
        {filtered.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name} [{entry.animeCategory}] ({entry.trustLevel}/{entry.executionMode})
          </option>
        ))}
      </select>

      {current ? (
        <div className="extension-badges">
          {approvedForAnime ? <span className="pill success-pill">Approved for Anime Production</span> : null}
          <span className="pill">{current.trustLevel}</span>
          <span className="pill">{current.pricingModel}</span>
          <span className="pill">{current.executionMode}</span>
        </div>
      ) : null}

      <label>Capability</label>
      <select
        value={selectedCapability}
        onChange={(event) => {
          setSelectedCapability(event.target.value);
          setGrantedScopes([]);
        }}
      >
        {current?.capabilities.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
          </option>
        ))}
      </select>

      {capability ? <p className="muted">{capability.permissionPrompt || capability.description}</p> : null}

      <label>Agent Runtime</label>
      <select value={selectedRuntime} onChange={(event) => setSelectedRuntime(event.target.value)}>
        {(current?.agentRuntimes ?? ["local-mcp"]).map((runtime) => (
          <option key={runtime} value={runtime}>
            {runtime}
          </option>
        ))}
      </select>

      <div className="permission-prompt">
        <strong>Permission Prompt</strong>
        {requiredScopes.length ? (
          <div className="permission-list">
            {requiredScopes.map((scope) => (
              <label key={scope} className="permission-item">
                <input
                  type="checkbox"
                  checked={grantedScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                />
                <span>{scope}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="muted">No extra scopes required for this capability.</p>
        )}
      </div>

      <div className="row-buttons">
        <button type="button" onClick={installSelected}>Install</button>
        <button type="button" onClick={hydrate}>Hydrate Node</button>
        <button type="button" onClick={verifyRuntime}>Verify Runtime</button>
      </div>

      <p className="muted"><strong>Status:</strong> {status}</p>
    </section>
  );
}
