import { useEffect, useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  type BackgroundLayer,
  type BackgroundLayout,
  type PerspectiveGuide,
  getAnimeSectionLabel,
  type CameraGrammarPreset,
  type PosePreset
} from "@genga/contracts";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { controlApi } from "../lib/api";
import type { VirtualSetNodeData } from "../types";

type InterpolationEasing = NonNullable<VirtualSetNodeData["interpolationConstraint"]>["easing"];
const BACKGROUND_PROJECT_ID = "demo-project";
const BACKGROUND_SCENE_ID = "scene-virtual-set";

function Mannequin() {
  return (
    <mesh>
      <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
      <meshStandardMaterial color="#7aa2ff" />
    </mesh>
  );
}

export function VirtualSetNode({ data }: NodeProps) {
  const nodeData = data as unknown as VirtualSetNodeData;
  const [cameraPresets, setCameraPresets] = useState<CameraGrammarPreset[]>([]);
  const [posePresets, setPosePresets] = useState<PosePreset[]>([]);
  const [selectedCameraPresetId, setSelectedCameraPresetId] = useState("");
  const [selectedPoseId, setSelectedPoseId] = useState("");
  const [cameraStatus, setCameraStatus] = useState(nodeData.cameraPreset);
  const [poseStatus, setPoseStatus] = useState(nodeData.posePreset);
  const [startPoseId, setStartPoseId] = useState(nodeData.interpolationConstraint?.startPoseId ?? "");
  const [endPoseId, setEndPoseId] = useState(nodeData.interpolationConstraint?.endPoseId ?? "");
  const [easing, setEasing] = useState<InterpolationEasing>(
    nodeData.interpolationConstraint?.easing ?? "ease-in-out"
  );
  const [guide, setGuide] = useState<PerspectiveGuide>({
    vanishingX: 0.52,
    vanishingY: 0.38,
    horizonY: 0.46,
    gridDensity: 8
  });
  const [backgroundLayers, setBackgroundLayers] = useState<BackgroundLayer[]>([]);
  const [layoutStatus, setLayoutStatus] = useState("Layout not synced");

  useEffect(() => {
    controlApi.getCameraPresets().then((response) => {
      const nextPresets = (response.presets ?? []) as CameraGrammarPreset[];
      setCameraPresets(nextPresets);
      if (nextPresets[0]) {
        setSelectedCameraPresetId(nextPresets[0].id);
      }
    });

    controlApi.listPosePresets().then((response) => {
      const nextPoses = (response.poses ?? []) as PosePreset[];
      setPosePresets(nextPoses);
      if (nextPoses[0]) {
        setSelectedPoseId((current) => current || nextPoses[0].poseId);
        setStartPoseId((current) => current || nextPoses[0].poseId);
      }
      if (nextPoses[1]) {
        setEndPoseId((current) => current || nextPoses[1].poseId);
      }
    });

    controlApi.getBackgroundLayout(BACKGROUND_PROJECT_ID, BACKGROUND_SCENE_ID).then((response) => {
      const layout = response as BackgroundLayout;
      setGuide(layout.guide);
      setBackgroundLayers(layout.layers ?? []);
      setLayoutStatus(`Loaded ${layout.layers?.length ?? 0} background layers`);
    });
  }, []);

  const selectedCameraPreset = useMemo(
    () => cameraPresets.find((preset) => preset.id === selectedCameraPresetId),
    [cameraPresets, selectedCameraPresetId]
  );

  const selectedPosePreset = useMemo(
    () => posePresets.find((preset) => preset.poseId === selectedPoseId),
    [posePresets, selectedPoseId]
  );

  const onApplyCameraPreset = async () => {
    if (!selectedCameraPresetId) return;
    const response = await controlApi.applyCameraPreset(selectedCameraPresetId);
    const preset = response.preset as CameraGrammarPreset;
    nodeData.cameraPreset = `${preset.name} (${preset.lens}, ${preset.movement})`;
    setCameraStatus(nodeData.cameraPreset);
  };

  const onApplyPosePreset = async () => {
    if (!selectedPoseId) return;
    const preset = (await controlApi.getPosePreset(selectedPoseId)) as PosePreset;
    nodeData.posePreset = `${preset.name} [${preset.archetype}]`;
    setPoseStatus(nodeData.posePreset);
  };

  const onSaveInterpolation = () => {
    if (!startPoseId || !endPoseId) return;
    nodeData.interpolationConstraint = {
      startPoseId,
      endPoseId,
      easing
    };
  };

  const addBackgroundLayer = () => {
    setBackgroundLayers((current) => [
      ...current,
      {
        layerId: crypto.randomUUID(),
        name: `Layer ${current.length + 1}`,
        depth: 0.5,
        parallax: 0.4,
        assetRef: ""
      }
    ]);
  };

  const updateBackgroundLayer = <K extends keyof BackgroundLayer>(layerId: string, key: K, value: BackgroundLayer[K]) => {
    setBackgroundLayers((current) =>
      current.map((layer) => (layer.layerId === layerId ? { ...layer, [key]: value } : layer))
    );
  };

  const saveBackgroundLayout = async () => {
    const sortedLayers = [...backgroundLayers].sort((a, b) => a.depth - b.depth);
    const response = await controlApi.updateBackgroundLayout(BACKGROUND_PROJECT_ID, BACKGROUND_SCENE_ID, {
      guide,
      layers: sortedLayers.map((layer) => ({
        layerId: layer.layerId,
        name: layer.name,
        depth: layer.depth,
        parallax: layer.parallax,
        assetRef: layer.assetRef
      }))
    });
    setLayoutStatus(`Saved layout: ${response.layers?.length ?? sortedLayers.length} layers`);
  };

  const exportBackgroundLayout = async () => {
    const response = await controlApi.exportBackgroundLayout(BACKGROUND_PROJECT_ID, BACKGROUND_SCENE_ID);
    setLayoutStatus(`Exported payload with ${response.layerCount} layers`);
  };

  return (
    <div className="studio-node virtual-set-node">
      <Handle type="target" position={Position.Left} />
      <h3>{nodeData.title}</h3>
      <div className="viewport-frame">
        <Canvas camera={{ position: [1.5, 1.2, 2.8], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 4, 2]} intensity={1.2} />
          <Mannequin />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
            <planeGeometry args={[5, 5]} />
            <meshStandardMaterial color="#1f2434" />
          </mesh>
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
      </div>

      <label>Camera Grammar Preset</label>
      <select value={selectedCameraPresetId} onChange={(event) => setSelectedCameraPresetId(event.target.value)}>
        {cameraPresets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
      <button type="button" className="ghost-button" onClick={onApplyCameraPreset}>Apply Camera Grammar</button>

      <label>Pose Archetype Preset</label>
      <select value={selectedPoseId} onChange={(event) => setSelectedPoseId(event.target.value)}>
        {posePresets.map((preset) => (
          <option key={preset.poseId} value={preset.poseId}>
            {preset.name} ({preset.archetype})
          </option>
        ))}
      </select>
      <button type="button" className="ghost-button" onClick={onApplyPosePreset}>Apply Pose Preset</button>

      <div className="grid-two">
        <label>
          Start Pose
          <select value={startPoseId} onChange={(event) => setStartPoseId(event.target.value)}>
            {posePresets.map((preset) => (
              <option key={`start-${preset.poseId}`} value={preset.poseId}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          End Pose
          <select value={endPoseId} onChange={(event) => setEndPoseId(event.target.value)}>
            {posePresets.map((preset) => (
              <option key={`end-${preset.poseId}`} value={preset.poseId}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Interpolation Easing
        <select value={easing} onChange={(event) => setEasing(event.target.value as typeof easing)}>
          <option value="linear">linear</option>
          <option value="ease-in">ease-in</option>
          <option value="ease-out">ease-out</option>
          <option value="ease-in-out">ease-in-out</option>
        </select>
      </label>
      <button type="button" className="ghost-button" onClick={onSaveInterpolation}>Save Interpolation Constraint</button>

      <h4>Perspective Guide</h4>
      <div className="grid-two">
        <label>
          Vanish X
          <input
            type="number"
            step={0.01}
            value={guide.vanishingX}
            onChange={(event) => setGuide({ ...guide, vanishingX: Number(event.target.value) })}
          />
        </label>
        <label>
          Vanish Y
          <input
            type="number"
            step={0.01}
            value={guide.vanishingY}
            onChange={(event) => setGuide({ ...guide, vanishingY: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="grid-two">
        <label>
          Horizon Y
          <input
            type="number"
            step={0.01}
            value={guide.horizonY}
            onChange={(event) => setGuide({ ...guide, horizonY: Number(event.target.value) })}
          />
        </label>
        <label>
          Grid Density
          <input
            type="number"
            min={1}
            max={24}
            value={guide.gridDensity}
            onChange={(event) => setGuide({ ...guide, gridDensity: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="row-buttons">
        <button type="button" className="ghost-button" onClick={addBackgroundLayer}>Add BG Layer</button>
        <button type="button" className="ghost-button" onClick={saveBackgroundLayout}>Save BG Layout</button>
        <button type="button" className="ghost-button" onClick={exportBackgroundLayout}>Export BG Payload</button>
      </div>

      <div className="bg-layer-list">
        {[...backgroundLayers]
          .sort((a, b) => a.depth - b.depth)
          .slice(0, 6)
          .map((layer) => (
            <article key={layer.layerId} className="bg-layer-item">
              <div className="grid-two">
                <label>
                  Layer
                  <input value={layer.name} onChange={(event) => updateBackgroundLayer(layer.layerId, "name", event.target.value)} />
                </label>
                <label>
                  Depth
                  <input
                    type="number"
                    step={0.01}
                    value={layer.depth}
                    onChange={(event) => updateBackgroundLayer(layer.layerId, "depth", Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="grid-two">
                <label>
                  Parallax
                  <input
                    type="number"
                    step={0.01}
                    value={layer.parallax}
                    onChange={(event) => updateBackgroundLayer(layer.layerId, "parallax", Number(event.target.value))}
                  />
                </label>
                <label>
                  Asset Ref
                  <input
                    value={layer.assetRef}
                    onChange={(event) => updateBackgroundLayer(layer.layerId, "assetRef", event.target.value)}
                  />
                </label>
              </div>
            </article>
          ))}
      </div>

      <p className="pill">{getAnimeSectionLabel("shoot")} Camera preset: {cameraStatus}</p>
      <p className="pill">{getAnimeSectionLabel("block")} Pose preset: {poseStatus}</p>
      <p className="pill">Background Layout: {layoutStatus}</p>
      {selectedCameraPreset ? (
        <p className="muted">
          <strong>Framing:</strong> {selectedCameraPreset.framing} | <strong>Intent:</strong> {selectedCameraPreset.emotionalIntent}
        </p>
      ) : null}
      {selectedPosePreset ? (
        <p className="muted">
          <strong>Stance:</strong> {selectedPosePreset.stance} | <strong>Camera Block:</strong> {selectedPosePreset.cameraBlock}
        </p>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
