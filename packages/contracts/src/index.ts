import { z } from "zod";

export const studioNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.any())
});

export const studioEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  data: z.record(z.any()).optional()
});

export const graphSnapshotSchema = z.object({
  projectId: z.string(),
  revision: z.number().int().nonnegative(),
  nodes: z.array(studioNodeSchema),
  edges: z.array(studioEdgeSchema),
  camera: z
    .object({ x: z.number(), y: z.number(), zoom: z.number() })
    .optional()
});

export const actorLockSchema = z.object({
  actorId: z.string(),
  actorLockId: z.string(),
  issuedAt: z.string(),
  expiresAt: z.string(),
  signature: z.string()
});

export const renderJobSchema = z.object({
  jobId: z.string(),
  jobType: z.enum(["keyframes", "interpolate"]),
  status: z.enum(["queued", "running", "completed", "failed", "blocked_budget"]),
  actorLockId: z.string(),
  createdAt: z.string(),
  outputs: z.array(z.string()).default([]),
  error: z.string().optional()
});

export const fxLayerSchema = z.object({
  layerId: z.string(),
  type: z.string(),
  intensity: z.number().min(0).max(1),
  blendMode: z.string(),
  enabled: z.boolean().default(true)
});

export const fxStackSchema = z.array(fxLayerSchema).default([]);

export const extensionCapabilityFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "number", "boolean", "select"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional()
});

export const extensionRuntimeMetaSchema = z.object({
  runtime: z.string(),
  supportsStreaming: z.boolean().default(false),
  maxConcurrency: z.number().int().positive().default(1)
});

export const extensionSandboxPolicySchema = z.object({
  allowedRuntimes: z.array(z.string()).default([]),
  blockedScopes: z.array(z.string()).default([]),
  maxPayloadKeys: z.number().int().positive().default(16)
});

export const extensionManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  animeCategory: z.enum(["storyboard", "color", "fx", "layout", "pipeline", "voice", "automation"]).default("automation"),
  protocol: z.string().default("mcp"),
  executionMode: z.enum(["local", "remote", "hybrid"]).default("hybrid"),
  authMode: z.enum(["bring-your-own-key", "genga_credit_proxy", "none"]).default("genga_credit_proxy"),
  agentRuntimes: z.array(z.string()).default([]),
  agentRuntimeMeta: z.array(extensionRuntimeMetaSchema).default([]),
  trustLevel: z.enum(["sandboxed", "trusted", "privileged"]),
  trustFlags: z.array(z.string()).default([]),
  sandboxPolicy: extensionSandboxPolicySchema.default({
    allowedRuntimes: [],
    blockedScopes: [],
    maxPayloadKeys: 16
  }),
  pricingModel: z.enum(["free", "credit", "subscription", "bring-your-own-key"]),
  scopes: z.array(z.string()),
  capabilities: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      requiredScopes: z.array(z.string()).default([]),
      permissionPrompt: z.string().default(""),
      fields: z.array(extensionCapabilityFieldSchema)
    })
  )
});

export const autopilotSuggestionSchema = z.object({
  templateId: z.string(),
  title: z.string(),
  rationale: z.string(),
  estimatedCostCredits: z.number(),
  estimatedSeconds: z.number()
});

export const animeShotTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  defaultLens: z.string(),
  movement: z.string(),
  emotionUseCase: z.string(),
  estimatedCredits: z.number()
});

export const cameraGrammarPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  lens: z.string(),
  movement: z.string(),
  framing: z.string(),
  emotionalIntent: z.string()
});

export const posePresetSchema = z.object({
  poseId: z.string(),
  name: z.string(),
  archetype: z.string(),
  stance: z.string(),
  cameraBlock: z.string(),
  tags: z.array(z.string()).default([]),
  joints: z.record(z.number()).default({}),
  createdAt: z.string().optional()
});

export const expressionPhonemeKeySchema = z.object({
  frame: z.number().int().nonnegative(),
  phoneme: z.string(),
  intensity: z.number().min(0).max(1),
  expression: z.string()
});

export const expressionTakeSchema = z.object({
  takeId: z.string(),
  name: z.string(),
  mood: z.string(),
  keys: z.array(expressionPhonemeKeySchema).default([])
});

export const expressionProfileSchema = z.object({
  profileId: z.string(),
  projectId: z.string(),
  actorLockId: z.string().nullable().optional(),
  name: z.string(),
  takes: z.array(expressionTakeSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const colorScriptSceneSchema = z.object({
  sceneId: z.string(),
  label: z.string(),
  mood: z.string(),
  palette: z.array(z.string()).default([]),
  notes: z.string().default("")
});

export const colorScriptLaneSchema = z.object({
  projectId: z.string(),
  scenes: z.array(colorScriptSceneSchema).default([]),
  updatedAt: z.string()
});

export const colorContinuityAnalysisSchema = z.object({
  projectId: z.string(),
  averageDelta: z.number(),
  warnings: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([])
});

export const perspectiveGuideSchema = z.object({
  vanishingX: z.number(),
  vanishingY: z.number(),
  horizonY: z.number(),
  gridDensity: z.number().int().min(1)
});

export const backgroundLayerSchema = z.object({
  layerId: z.string(),
  name: z.string(),
  depth: z.number(),
  parallax: z.number().min(0),
  assetRef: z.string()
});

export const backgroundLayoutSchema = z.object({
  projectId: z.string(),
  sceneId: z.string(),
  guide: perspectiveGuideSchema,
  layers: z.array(backgroundLayerSchema).default([]),
  updatedAt: z.string().optional()
});

export const audioTrackSchema = z.object({
  trackId: z.string(),
  name: z.string(),
  durationSeconds: z.number().min(0),
  bpm: z.number().min(1)
});

export const beatMarkerSchema = z.object({
  frame: z.number().int().nonnegative(),
  intensity: z.number().min(0).max(1),
  note: z.string().default("")
});

export const clipCutSchema = z.object({
  clipId: z.string(),
  sceneNodeId: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
  transition: z.string().default("cut")
});

export const animaticTimelineSchema = z.object({
  projectId: z.string(),
  audioTracks: z.array(audioTrackSchema).default([]),
  beatMarkers: z.array(beatMarkerSchema).default([]),
  clipCuts: z.array(clipCutSchema).default([])
});

export const deliverableExportSchema = z.object({
  projectId: z.string(),
  deliverableType: z.string(),
  clipIds: z.array(z.string()).default([])
});

export const styleBibleSchema = z.object({
  projectId: z.string(),
  artDirection: z.string(),
  lineWeight: z.string(),
  shadingMode: z.string(),
  palette: z.array(z.string()),
  lensLanguage: z.string(),
  notes: z.string(),
  updatedAt: z.string()
});

export const styleDnaConstraintsSchema = z.object({
  artDirection: z.string(),
  lineWeight: z.string(),
  shadingMode: z.string(),
  palette: z.array(z.string()),
  lensLanguage: z.string(),
  moodLanguage: z.string().default("anime-cinematic")
});

export const styleDnaProfileSchema = z.object({
  styleDnaId: z.string(),
  projectId: z.string(),
  version: z.number().int().positive(),
  immutableHash: z.string(),
  locked: z.boolean().default(true),
  constraints: styleDnaConstraintsSchema,
  createdAt: z.string()
});

export const styleDriftFindingSchema = z.object({
  category: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  score: z.number().min(0).max(1),
  detail: z.string()
});

export const styleDriftReviewSchema = z.object({
  styleDnaId: z.string(),
  overallScore: z.number().min(0).max(1),
  findings: z.array(styleDriftFindingSchema).default([]),
  suggestions: z.array(z.string()).default([])
});

export const sceneIdeaSchema = z.object({
  id: z.string(),
  title: z.string(),
  theme: z.string(),
  mood: z.string(),
  promptSeed: z.string(),
  tags: z.array(z.string()),
  confidence: z.number().optional(),
  rankScore: z.number().optional()
});

export const inspirationRankRequestSchema = z.object({
  projectId: z.string(),
  scriptBeat: z.string(),
  graphContext: z.array(z.string()).default([]),
  limit: z.number().int().min(1).max(48).default(12)
});

export const inspirationRemixResponseSchema = z.object({
  ideaId: z.string(),
  nodePrefill: z.record(z.any()),
  message: z.string()
});

export const episodeBoardTaskSchema = z.object({
  taskId: z.string(),
  shotId: z.string(),
  title: z.string(),
  status: z.string(),
  dependsOn: z.array(z.string()).default([]),
  estimateHours: z.number().min(0)
});

export const episodeBoardSchema = z.object({
  projectId: z.string(),
  episodeId: z.string(),
  tasks: z.array(episodeBoardTaskSchema).default([]),
  updatedAt: z.string().optional()
});

export const criticalPathSchema = z.object({
  projectId: z.string(),
  episodeId: z.string(),
  criticalPath: z.array(z.string()).default([]),
  blockedTasks: z.array(z.string()).default([]),
  releaseRisk: z.string()
});

export const parsedDirectorActionSchema = z.object({
  actionId: z.string(),
  label: z.string(),
  command: z.string(),
  payload: z.record(z.any()).default({}),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([])
});

export const provenanceEventSchema = z.object({
  provenanceId: z.string(),
  projectId: z.string(),
  shotId: z.string(),
  jobId: z.string().nullable().optional(),
  model: z.string(),
  extensionIds: z.array(z.string()).default([]),
  sourceAssets: z.array(z.string()).default([]),
  createdAt: z.string().optional()
});

export const variantTelemetrySchema = z.object({
  variantId: z.string(),
  projectId: z.string(),
  shotId: z.string(),
  qualityScore: z.number().min(0).max(1),
  timingScore: z.number().min(0).max(1),
  actingScore: z.number().min(0).max(1),
  continuityScore: z.number().min(0).max(1),
  selected: z.boolean().default(false),
  createdAt: z.string().optional()
});

export const redlineAnnotationSchema = z.object({
  redlineId: z.string(),
  projectId: z.string(),
  shotId: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
  drawPathRef: z.string(),
  severity: z.string(),
  note: z.string(),
  createdAt: z.string().optional()
});

export const approvalDecisionSchema = z.object({
  decisionId: z.string(),
  action: z.string(),
  reviewer: z.string(),
  note: z.string(),
  createdAt: z.string()
});

export const approvalGateSchema = z.object({
  projectId: z.string(),
  shotId: z.string(),
  status: z.string(),
  currentRevision: z.number().int().positive(),
  history: z.array(approvalDecisionSchema).default([])
});

export const sakugaHoldSchema = z.object({
  frame: z.number().int().nonnegative(),
  durationFrames: z.number().int().positive()
});

export const sakugaSmearMarkerSchema = z.object({
  frame: z.number().int().nonnegative(),
  intensity: z.number().min(0).max(1),
  direction: z.string()
});

export const sakugaImpactMarkerSchema = z.object({
  frame: z.number().int().nonnegative(),
  magnitude: z.number().min(0).max(1),
  note: z.string().optional()
});

export const sakugaShakeKeySchema = z.object({
  frame: z.number().int().nonnegative(),
  amplitude: z.number().min(0),
  frequencyHz: z.number().min(0)
});

export const sakugaTimelineSchema = z.object({
  holds: z.array(sakugaHoldSchema).default([]),
  smears: z.array(sakugaSmearMarkerSchema).default([]),
  impacts: z.array(sakugaImpactMarkerSchema).default([]),
  shake: z.array(sakugaShakeKeySchema).default([])
});

export const animeTerminologySchema = z.object({
  mantra: z.string(),
  sections: z.object({
    cast: z.string(),
    block: z.string(),
    shoot: z.string(),
    sakuga: z.string(),
    cut: z.string(),
    deliver: z.string(),
    session: z.string(),
    scriptDesk: z.string(),
    timeline: z.string(),
    extensions: z.string(),
    ideas: z.string()
  }),
  actions: z.object({
    saveGraphRevision: z.string(),
    generateCharacterSheet: z.string(),
    issueActorLock: z.string(),
    continuityCheck: z.string(),
    requestRetake: z.string(),
    estimateCost: z.string(),
    parallelExplore: z.string(),
    keyframeShot: z.string(),
    buildInbetweens: z.string()
  })
});

export const animeTerminology = animeTerminologySchema.parse({
  mantra: "Direct, Don't Draw.",
  sections: {
    cast: "Cast",
    block: "Block",
    shoot: "Shoot",
    sakuga: "Sakuga",
    cut: "Cut",
    deliver: "Deliver",
    session: "Session",
    scriptDesk: "Script Desk",
    timeline: "Timing Track",
    extensions: "Extension Rental House",
    ideas: "Scene Idea Sky"
  },
  actions: {
    saveGraphRevision: "Save Revision",
    generateCharacterSheet: "Forge Character Sheet",
    issueActorLock: "Issue Actor Lock",
    continuityCheck: "Run Continuity Check",
    requestRetake: "Create Retake Plan",
    estimateCost: "Estimate Credits",
    parallelExplore: "Parallel Explore",
    keyframeShot: "Shoot Keyframes",
    buildInbetweens: "Build In-Betweens"
  }
});

export const cinematicMotionTokensSchema = z.object({
  fast: z.number(),
  medium: z.number(),
  slow: z.number(),
  emphasisSpring: z.object({
    stiffness: z.number(),
    damping: z.number()
  })
});

export const cinematicSoundCueSchema = z.object({
  id: z.string(),
  label: z.string(),
  frequencyHz: z.number(),
  durationMs: z.number()
});

export const cinematicMotionTokens = cinematicMotionTokensSchema.parse({
  fast: 140,
  medium: 220,
  slow: 360,
  emphasisSpring: {
    stiffness: 300,
    damping: 22
  }
});

export const cinematicSoundCues = [
  { id: "lock-issued", label: "Lock Issued", frequencyHz: 880, durationMs: 90 },
  { id: "render-accepted", label: "Render Accepted", frequencyHz: 660, durationMs: 120 },
  { id: "retake-required", label: "Retake Required", frequencyHz: 320, durationMs: 160 }
] as const satisfies readonly z.input<typeof cinematicSoundCueSchema>[];

export type AnimeSectionKey = keyof typeof animeTerminology.sections;
export type AnimeActionKey = keyof typeof animeTerminology.actions;

export function getAnimeSectionLabel(key: AnimeSectionKey): string {
  return animeTerminology.sections[key];
}

export function getAnimeActionLabel(key: AnimeActionKey): string {
  return animeTerminology.actions[key];
}

export type StudioNode = z.infer<typeof studioNodeSchema>;
export type StudioEdge = z.infer<typeof studioEdgeSchema>;
export type GraphSnapshot = z.infer<typeof graphSnapshotSchema>;
export type ActorLock = z.infer<typeof actorLockSchema>;
export type RenderJob = z.infer<typeof renderJobSchema>;
export type FxLayer = z.infer<typeof fxLayerSchema>;
export type ExtensionManifest = z.infer<typeof extensionManifestSchema>;
export type ExtensionRuntimeMeta = z.infer<typeof extensionRuntimeMetaSchema>;
export type ExtensionSandboxPolicy = z.infer<typeof extensionSandboxPolicySchema>;
export type AutopilotSuggestion = z.infer<typeof autopilotSuggestionSchema>;
export type AnimeShotTemplate = z.infer<typeof animeShotTemplateSchema>;
export type CameraGrammarPreset = z.infer<typeof cameraGrammarPresetSchema>;
export type PosePreset = z.infer<typeof posePresetSchema>;
export type ExpressionPhonemeKey = z.infer<typeof expressionPhonemeKeySchema>;
export type ExpressionTake = z.infer<typeof expressionTakeSchema>;
export type ExpressionProfile = z.infer<typeof expressionProfileSchema>;
export type ColorScriptScene = z.infer<typeof colorScriptSceneSchema>;
export type ColorScriptLane = z.infer<typeof colorScriptLaneSchema>;
export type ColorContinuityAnalysis = z.infer<typeof colorContinuityAnalysisSchema>;
export type PerspectiveGuide = z.infer<typeof perspectiveGuideSchema>;
export type BackgroundLayer = z.infer<typeof backgroundLayerSchema>;
export type BackgroundLayout = z.infer<typeof backgroundLayoutSchema>;
export type AudioTrack = z.infer<typeof audioTrackSchema>;
export type BeatMarker = z.infer<typeof beatMarkerSchema>;
export type ClipCut = z.infer<typeof clipCutSchema>;
export type AnimaticTimeline = z.infer<typeof animaticTimelineSchema>;
export type DeliverableExport = z.infer<typeof deliverableExportSchema>;
export type StyleBible = z.infer<typeof styleBibleSchema>;
export type StyleDnaConstraints = z.infer<typeof styleDnaConstraintsSchema>;
export type StyleDnaProfile = z.infer<typeof styleDnaProfileSchema>;
export type StyleDriftFinding = z.infer<typeof styleDriftFindingSchema>;
export type StyleDriftReview = z.infer<typeof styleDriftReviewSchema>;
export type SceneIdea = z.infer<typeof sceneIdeaSchema>;
export type InspirationRankRequest = z.infer<typeof inspirationRankRequestSchema>;
export type InspirationRemixResponse = z.infer<typeof inspirationRemixResponseSchema>;
export type EpisodeBoardTask = z.infer<typeof episodeBoardTaskSchema>;
export type EpisodeBoard = z.infer<typeof episodeBoardSchema>;
export type CriticalPath = z.infer<typeof criticalPathSchema>;
export type ParsedDirectorAction = z.infer<typeof parsedDirectorActionSchema>;
export type ProvenanceEvent = z.infer<typeof provenanceEventSchema>;
export type VariantTelemetry = z.infer<typeof variantTelemetrySchema>;
export type RedlineAnnotation = z.infer<typeof redlineAnnotationSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type ApprovalGate = z.infer<typeof approvalGateSchema>;
export type AnimeTerminology = z.infer<typeof animeTerminologySchema>;
export type CinematicMotionTokens = z.infer<typeof cinematicMotionTokensSchema>;
export type CinematicSoundCue = z.infer<typeof cinematicSoundCueSchema>;
export type SakugaHold = z.infer<typeof sakugaHoldSchema>;
export type SakugaSmearMarker = z.infer<typeof sakugaSmearMarkerSchema>;
export type SakugaImpactMarker = z.infer<typeof sakugaImpactMarkerSchema>;
export type SakugaShakeKey = z.infer<typeof sakugaShakeKeySchema>;
export type SakugaTimeline = z.infer<typeof sakugaTimelineSchema>;
