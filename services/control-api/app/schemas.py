from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RoomTokenRequest(BaseModel):
    projectId: str
    roomId: str
    role: str = "editor"


class RoomTokenResponse(BaseModel):
    token: str
    expiresAt: str


class CameraState(BaseModel):
    x: float
    y: float
    zoom: float


class GraphSnapshot(BaseModel):
    projectId: str
    revision: int = 0
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    camera: CameraState | None = None


class ActorCreateRequest(BaseModel):
    prompt: str
    references: list[str] = Field(default_factory=list)


class Actor(BaseModel):
    actorId: str
    prompt: str
    references: list[str]
    createdAt: str
    locked: bool = False


class ActorLock(BaseModel):
    actorId: str
    actorLockId: str
    issuedAt: str
    expiresAt: str
    signature: str


class FxLayer(BaseModel):
    layerId: str
    type: str
    intensity: float = Field(ge=0.0, le=1.0)
    blendMode: str = "normal"
    enabled: bool = True


class RenderRequest(BaseModel):
    actorLockId: str
    styleDnaId: str
    projectId: str = "demo-project"
    shotId: str = "sakuga-1"
    frameA: str | None = None
    frameB: str | None = None
    sketchHint: str | None = None
    controlMaps: dict[str, Any] = Field(default_factory=dict)
    styleProfileId: str | None = None
    fxStack: list[FxLayer] = Field(default_factory=list)


class ParallelExploreRequest(BaseModel):
    actorLockId: str
    styleDnaId: str
    projectId: str = "demo-project"
    shotId: str = "sakuga-1"
    prompt: str
    variants: int = 4
    referenceFrames: list[str] = Field(default_factory=list)


class RenderJob(BaseModel):
    jobId: str
    status: str
    jobType: str
    actorLockId: str
    outputs: list[str] = Field(default_factory=list)
    createdAt: str


class AutopilotSuggestRequest(BaseModel):
    scriptBeat: str


class RetakePlanRequest(BaseModel):
    continuityIssues: list[str] = Field(default_factory=list)
    sceneIntent: str


class ContinuityScanRequest(BaseModel):
    actorLockId: str
    frameA: str | None = None
    frameB: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class ContinuityIssue(BaseModel):
    category: str
    severity: str
    score: float
    detail: str


class ContinuityScanResponse(BaseModel):
    overallScore: float
    issues: list[ContinuityIssue] = Field(default_factory=list)


class ExpressionPhonemeKey(BaseModel):
    frame: int = Field(ge=0)
    phoneme: str
    intensity: float = Field(ge=0.0, le=1.0)
    expression: str = "neutral"


class ExpressionTake(BaseModel):
    takeId: str
    name: str
    mood: str
    keys: list[ExpressionPhonemeKey] = Field(default_factory=list)


class ExpressionProfile(BaseModel):
    profileId: str
    projectId: str
    actorLockId: str | None = None
    name: str
    takes: list[ExpressionTake] = Field(default_factory=list)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class CreateExpressionProfileRequest(BaseModel):
    projectId: str
    actorLockId: str | None = None
    name: str = "Lead Performance Profile"


class AddExpressionKeyRequest(BaseModel):
    frame: int = Field(ge=0)
    phoneme: str
    intensity: float = Field(ge=0.0, le=1.0)
    expression: str = "neutral"


class VoiceGenerateRequest(BaseModel):
    projectId: str
    audioSrc: str
    mood: str = "neutral"


class PosePreset(BaseModel):
    poseId: str
    name: str
    archetype: str
    stance: str
    cameraBlock: str
    tags: list[str] = Field(default_factory=list)
    joints: dict[str, float] = Field(default_factory=dict)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class CreatePosePresetRequest(BaseModel):
    name: str
    archetype: str
    stance: str
    cameraBlock: str
    tags: list[str] = Field(default_factory=list)
    joints: dict[str, float] = Field(default_factory=dict)


class ColorScriptScene(BaseModel):
    sceneId: str
    label: str
    mood: str
    palette: list[str] = Field(default_factory=list)
    notes: str = ""


class ColorScriptLane(BaseModel):
    projectId: str
    scenes: list[ColorScriptScene] = Field(default_factory=list)
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class ColorScriptUpdateRequest(BaseModel):
    scenes: list[ColorScriptScene] = Field(default_factory=list)


class ColorContinuityResponse(BaseModel):
    projectId: str
    averageDelta: float
    warnings: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class PerspectiveGuide(BaseModel):
    vanishingX: float
    vanishingY: float
    horizonY: float
    gridDensity: int = Field(ge=1, le=24)


class BackgroundLayer(BaseModel):
    layerId: str
    name: str
    depth: float
    parallax: float = Field(ge=0.0)
    assetRef: str = ""


class BackgroundLayout(BaseModel):
    projectId: str
    sceneId: str
    guide: PerspectiveGuide
    layers: list[BackgroundLayer] = Field(default_factory=list)
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class BackgroundLayoutUpdateRequest(BaseModel):
    guide: PerspectiveGuide
    layers: list[BackgroundLayer] = Field(default_factory=list)


class AudioTrack(BaseModel):
    trackId: str
    name: str
    durationSeconds: float = Field(ge=0.0)
    bpm: float = Field(ge=1.0, default=120.0)


class BeatMarker(BaseModel):
    frame: int = Field(ge=0)
    intensity: float = Field(ge=0.0, le=1.0, default=0.5)
    note: str = ""


class ClipCut(BaseModel):
    clipId: str
    sceneNodeId: str
    startFrame: int = Field(ge=0)
    endFrame: int = Field(ge=0)
    transition: str = "cut"


class AnimaticTimelineRequest(BaseModel):
    projectId: str
    audioTracks: list[AudioTrack] = Field(default_factory=list)
    beatMarkers: list[BeatMarker] = Field(default_factory=list)
    clipCuts: list[ClipCut] = Field(default_factory=list)


class ResumeRenderRequest(BaseModel):
    lastGoodFrame: int = Field(ge=0)
    reason: str = "job_recovery"


class DeliverableExportRequest(BaseModel):
    projectId: str
    deliverableType: str
    clipIds: list[str] = Field(default_factory=list)


class StyleBible(BaseModel):
    projectId: str
    artDirection: str = "anime-tv"
    lineWeight: str = "clean-medium"
    shadingMode: str = "cel-shaded"
    palette: list[str] = Field(default_factory=lambda: ["#101e37", "#f8d36b", "#e85f5c"])
    lensLanguage: str = "anime-cinematic"
    notes: str = ""
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class StyleBibleUpdateRequest(BaseModel):
    artDirection: str | None = None
    lineWeight: str | None = None
    shadingMode: str | None = None
    palette: list[str] | None = None
    lensLanguage: str | None = None
    notes: str | None = None


class StyleDnaConstraints(BaseModel):
    artDirection: str
    lineWeight: str
    shadingMode: str
    palette: list[str] = Field(default_factory=list)
    lensLanguage: str
    moodLanguage: str = "anime-cinematic"


class StyleDnaProfile(BaseModel):
    styleDnaId: str
    projectId: str
    version: int = Field(ge=1)
    immutableHash: str
    locked: bool = True
    constraints: StyleDnaConstraints
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class CreateStyleDnaRequest(BaseModel):
    projectId: str
    constraints: StyleDnaConstraints | None = None


class StyleDriftRequest(BaseModel):
    sceneIntent: str
    frameNotes: str = ""
    observedPalette: list[str] = Field(default_factory=list)
    observedLineWeight: str = ""
    observedShadingMode: str = ""


class StyleDriftFinding(BaseModel):
    category: str
    severity: str
    score: float = Field(ge=0.0, le=1.0)
    detail: str


class StyleDriftReview(BaseModel):
    styleDnaId: str
    overallScore: float = Field(ge=0.0, le=1.0)
    findings: list[StyleDriftFinding] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


class AnimeShotTemplate(BaseModel):
    id: str
    name: str
    category: str
    description: str
    defaultLens: str
    movement: str
    emotionUseCase: str
    estimatedCredits: float


class CameraGrammarPreset(BaseModel):
    id: str
    name: str
    lens: str
    movement: str
    framing: str
    emotionalIntent: str


class ApplyCameraPresetRequest(BaseModel):
    presetId: str


class SceneIdea(BaseModel):
    id: str
    title: str
    theme: str
    mood: str
    promptSeed: str
    tags: list[str] = Field(default_factory=list)
    confidence: float | None = None


class InspirationRankRequest(BaseModel):
    projectId: str
    scriptBeat: str
    graphContext: list[str] = Field(default_factory=list)
    limit: int = Field(default=12, ge=1, le=48)


class RankedSceneIdea(SceneIdea):
    rankScore: float = Field(ge=0.0, le=1.0)


class InspirationRemixRequest(BaseModel):
    projectId: str
    ideaId: str
    targetNodeId: str | None = None


class InspirationRemixResponse(BaseModel):
    ideaId: str
    nodePrefill: dict[str, Any] = Field(default_factory=dict)
    message: str


class EpisodeBoardTask(BaseModel):
    taskId: str
    shotId: str
    title: str
    status: str = "todo"
    dependsOn: list[str] = Field(default_factory=list)
    estimateHours: float = Field(default=2.0, ge=0.0)


class EpisodeBoard(BaseModel):
    projectId: str
    episodeId: str
    tasks: list[EpisodeBoardTask] = Field(default_factory=list)
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class EpisodeBoardUpdateRequest(BaseModel):
    episodeId: str
    tasks: list[EpisodeBoardTask] = Field(default_factory=list)


class CriticalPathResponse(BaseModel):
    projectId: str
    episodeId: str
    criticalPath: list[str] = Field(default_factory=list)
    blockedTasks: list[str] = Field(default_factory=list)
    releaseRisk: str = "low"


class DirectorNoteParseRequest(BaseModel):
    projectId: str
    text: str


class ParsedNoteAction(BaseModel):
    actionId: str
    label: str
    command: str
    payload: dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(ge=0.0, le=1.0)
    warnings: list[str] = Field(default_factory=list)


class DirectorNoteParseResponse(BaseModel):
    actions: list[ParsedNoteAction] = Field(default_factory=list)


class ExtensionCapabilityField(BaseModel):
    key: str
    label: str
    type: str
    required: bool = False
    options: list[str] = Field(default_factory=list)


class ExtensionRuntimeMeta(BaseModel):
    runtime: str
    supportsStreaming: bool = False
    maxConcurrency: int = 1


class ExtensionSandboxPolicy(BaseModel):
    allowedRuntimes: list[str] = Field(default_factory=list)
    blockedScopes: list[str] = Field(default_factory=list)
    maxPayloadKeys: int = 16


class ExtensionCapability(BaseModel):
    id: str
    name: str
    description: str
    requiredScopes: list[str] = Field(default_factory=list)
    permissionPrompt: str = ""
    fields: list[ExtensionCapabilityField] = Field(default_factory=list)


class ExtensionManifest(BaseModel):
    id: str
    name: str
    version: str
    description: str
    animeCategory: str = "automation"
    protocol: str = "mcp"
    executionMode: str = "hybrid"
    authMode: str = "genga_credit_proxy"
    agentRuntimes: list[str] = Field(default_factory=list)
    agentRuntimeMeta: list[ExtensionRuntimeMeta] = Field(default_factory=list)
    trustLevel: str
    trustFlags: list[str] = Field(default_factory=list)
    sandboxPolicy: ExtensionSandboxPolicy = Field(default_factory=ExtensionSandboxPolicy)
    pricingModel: str
    scopes: list[str] = Field(default_factory=list)
    capabilities: list[ExtensionCapability] = Field(default_factory=list)


class InstallExtensionRequest(BaseModel):
    manifestId: str


class ExecuteExtensionRequest(BaseModel):
    capabilityId: str
    payload: dict[str, Any] = Field(default_factory=dict)
    agentRuntime: str | None = None
    requestedScopes: list[str] = Field(default_factory=list)
    dryRun: bool = False


class CostEstimate(BaseModel):
    jobType: str
    frameCount: int
    estimatedCredits: float
    estimatedSeconds: int


class AuditEvent(BaseModel):
    id: str
    eventType: str
    actor: str
    details: dict[str, Any]
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class ProvenanceEventRecord(BaseModel):
    provenanceId: str
    projectId: str
    shotId: str
    jobId: str | None = None
    model: str
    extensionIds: list[str] = Field(default_factory=list)
    sourceAssets: list[str] = Field(default_factory=list)
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class ProvenanceCreateRequest(BaseModel):
    projectId: str
    shotId: str
    jobId: str | None = None
    model: str
    extensionIds: list[str] = Field(default_factory=list)
    sourceAssets: list[str] = Field(default_factory=list)


class VariantTelemetryRecord(BaseModel):
    variantId: str
    projectId: str
    shotId: str
    qualityScore: float = Field(ge=0.0, le=1.0)
    timingScore: float = Field(ge=0.0, le=1.0)
    actingScore: float = Field(ge=0.0, le=1.0)
    continuityScore: float = Field(ge=0.0, le=1.0)
    selected: bool = False
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class VariantTelemetryCreateRequest(BaseModel):
    projectId: str
    shotId: str
    qualityScore: float = Field(ge=0.0, le=1.0)
    timingScore: float = Field(ge=0.0, le=1.0)
    actingScore: float = Field(ge=0.0, le=1.0)
    continuityScore: float = Field(ge=0.0, le=1.0)
    selected: bool = False


class RedlineAnnotation(BaseModel):
    redlineId: str
    projectId: str
    shotId: str
    startFrame: int = Field(ge=0)
    endFrame: int = Field(ge=0)
    drawPathRef: str
    severity: str
    note: str
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class RedlineCreateRequest(BaseModel):
    projectId: str
    shotId: str
    startFrame: int = Field(ge=0)
    endFrame: int = Field(ge=0)
    drawPathRef: str
    severity: str = "warning"
    note: str


class ApprovalDecisionRecord(BaseModel):
    decisionId: str
    action: str
    reviewer: str
    note: str = ""
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class ApprovalGateState(BaseModel):
    projectId: str
    shotId: str
    status: str = "draft"
    currentRevision: int = 1
    history: list[ApprovalDecisionRecord] = Field(default_factory=list)


class ApprovalActionRequest(BaseModel):
    reviewer: str = "director"
    note: str = ""
