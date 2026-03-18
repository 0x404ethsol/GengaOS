import axios from "axios";

const bearerToken = import.meta.env.VITE_API_BEARER_TOKEN as string | undefined;

const api = axios.create({
  // Tauri Sidecar Local Backend
  baseURL: import.meta.env.VITE_CONTROL_API_URL ?? "http://localhost:8000",
  headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined
});

api.interceptors.request.use((config) => {
  // Desktop Architecture: Keys are loaded server-side by the sidecar.
  // The frontend no longer transmits API keys via headers.
  return config;
});

export interface GraphPayload {
  projectId: string;
  revision: number;
  nodes: unknown[];
  edges: unknown[];
  camera?: { x: number; y: number; zoom: number };
}

export const controlApi = {
  async getGraph(projectId: string) {
    const response = await api.get(`/v1/graph/${projectId}`);
    return response.data;
  },
  async saveGraph(projectId: string, payload: GraphPayload) {
    const response = await api.put(`/v1/graph/${projectId}`, payload);
    return response.data;
  },
  async createActor(prompt: string, references: string[]) {
    const response = await api.post("/v1/actors", { prompt, references });
    return response.data;
  },
  async lockActor(actorId: string) {
    const response = await api.post(`/v1/actors/${actorId}/lock`);
    return response.data;
  },
  async generateKeyframes(data: Record<string, unknown>) {
    const response = await api.post("/v1/render/keyframes", data);
    return response.data;
  },
  async interpolate(data: Record<string, unknown>) {
    const response = await api.post("/v1/render/interpolate", data);
    return response.data;
  },
  async getJob(jobId: string) {
    const response = await api.get(`/v1/jobs/${jobId}`);
    return response.data;
  },
  async suggestShot(scriptBeat: string) {
    const response = await api.post("/v1/autopilot/suggest-shot", { scriptBeat });
    return response.data;
  },
  async getAnimeShotTemplates() {
    const response = await api.get("/v1/anime/shot-templates");
    return response.data;
  },
  async getCameraPresets() {
    const response = await api.get("/v1/anime/camera-presets");
    return response.data;
  },
  async applyCameraPreset(presetId: string) {
    const response = await api.post("/v1/anime/camera-presets/apply", { presetId });
    return response.data;
  },
  async listPosePresets() {
    const response = await api.get("/v1/poses");
    return response.data;
  },
  async createPosePreset(data: {
    name: string;
    archetype: string;
    stance: string;
    cameraBlock: string;
    tags?: string[];
    joints?: Record<string, number>;
  }) {
    const response = await api.post("/v1/poses", data);
    return response.data;
  },
  async getPosePreset(poseId: string) {
    const response = await api.get(`/v1/poses/${poseId}`);
    return response.data;
  },
  async getSceneIdeas(query: string, limit = 24) {
    const response = await api.get("/v1/anime/scene-ideas", { params: { q: query, limit } });
    return response.data;
  },
  async rankInspiration(projectId: string, scriptBeat: string, graphContext: string[], limit = 18) {
    const response = await api.post("/v1/inspiration/rank", {
      projectId,
      scriptBeat,
      graphContext,
      limit
    });
    return response.data;
  },
  async remixInspiration(projectId: string, ideaId: string, targetNodeId?: string) {
    const response = await api.post("/v1/inspiration/remix", {
      projectId,
      ideaId,
      targetNodeId
    });
    return response.data;
  },
  async getEpisodeBoard(projectId: string) {
    const response = await api.get(`/v1/episode-board/${projectId}`);
    return response.data;
  },
  async updateEpisodeBoard(projectId: string, data: { episodeId: string; tasks: unknown[] }) {
    const response = await api.put(`/v1/episode-board/${projectId}`, data);
    return response.data;
  },
  async analyzeEpisodeBoard(projectId: string) {
    const response = await api.post(`/v1/episode-board/${projectId}/critical-path`);
    return response.data;
  },
  async parseDirectorNotes(projectId: string, text: string) {
    const response = await api.post("/v1/notes/parse", { projectId, text });
    return response.data;
  },
  async getProvenance(projectId: string) {
    const response = await api.get(`/v1/provenance/${projectId}`);
    return response.data;
  },
  async getVariantTelemetry(projectId: string) {
    const response = await api.get(`/v1/variants/telemetry/${projectId}`);
    return response.data;
  },
  async createRedline(payload: {
    projectId: string;
    shotId: string;
    startFrame: number;
    endFrame: number;
    drawPathRef: string;
    severity: string;
    note: string;
  }) {
    const response = await api.post("/v1/redlines", payload);
    return response.data;
  },
  async listRedlines(projectId: string, shotId: string) {
    const response = await api.get(`/v1/redlines/${projectId}/${shotId}`);
    return response.data;
  },
  async getApprovalGate(projectId: string, shotId: string) {
    const response = await api.get(`/v1/approval-gates/${projectId}/${shotId}`);
    return response.data;
  },
  async applyApprovalAction(projectId: string, shotId: string, action: "submit" | "approve" | "request-changes" | "reject", reviewer: string, note: string) {
    const response = await api.post(`/v1/approval-gates/${projectId}/${shotId}/${action}`, { reviewer, note });
    return response.data;
  },
  async getModelRouter() {
    const response = await api.get("/v1/anime/model-router");
    return response.data;
  },
  async getStyleBible(projectId: string) {
    const response = await api.get(`/v1/style-bible/${projectId}`);
    return response.data;
  },
  async updateStyleBible(projectId: string, payload: Record<string, unknown>) {
    const response = await api.put(`/v1/style-bible/${projectId}`, payload);
    return response.data;
  },
  async listStyleDnaProfiles(projectId: string) {
    const response = await api.get(`/v1/style-dna/${projectId}`);
    return response.data;
  },
  async createStyleDnaProfile(projectId: string, constraints?: Record<string, unknown>) {
    const response = await api.post("/v1/style-dna", { projectId, constraints });
    return response.data;
  },
  async getStyleDnaProfile(styleDnaId: string) {
    const response = await api.get(`/v1/style-dna/profile/${styleDnaId}`);
    return response.data;
  },
  async checkStyleDrift(styleDnaId: string, payload: Record<string, unknown>) {
    const response = await api.post(`/v1/style-dna/${styleDnaId}/drift-check`, payload);
    return response.data;
  },
  async getColorScriptLane(projectId: string) {
    const response = await api.get(`/v1/color-script/${projectId}`);
    return response.data;
  },
  async updateColorScriptLane(projectId: string, scenes: unknown[]) {
    const response = await api.put(`/v1/color-script/${projectId}`, { scenes });
    return response.data;
  },
  async analyzeColorScriptLane(projectId: string) {
    const response = await api.post(`/v1/color-script/${projectId}/analyze`);
    return response.data;
  },
  async getBackgroundLayout(projectId: string, sceneId: string) {
    const response = await api.get(`/v1/background-layout/${projectId}/${sceneId}`);
    return response.data;
  },
  async updateBackgroundLayout(
    projectId: string,
    sceneId: string,
    data: {
      guide: { vanishingX: number; vanishingY: number; horizonY: number; gridDensity: number };
      layers: Array<{ layerId: string; name: string; depth: number; parallax: number; assetRef: string }>;
    }
  ) {
    const response = await api.put(`/v1/background-layout/${projectId}/${sceneId}`, data);
    return response.data;
  },
  async exportBackgroundLayout(projectId: string, sceneId: string) {
    const response = await api.post(`/v1/background-layout/${projectId}/${sceneId}/export`);
    return response.data;
  },
  async buildAnimaticQueue(data: Record<string, unknown>) {
    const response = await api.post("/v1/animatics/queue", data);
    return response.data;
  },
  async resumeRenderJob(jobId: string, lastGoodFrame: number, reason = "resume-from-last-good-frame") {
    const response = await api.post(`/v1/render/jobs/${jobId}/resume`, { lastGoodFrame, reason });
    return response.data;
  },
  async exportDeliverable(projectId: string, deliverableType: string, clipIds: string[]) {
    const response = await api.post("/v1/deliverables/export", { projectId, deliverableType, clipIds });
    return response.data;
  },
  async retakePlan(data: Record<string, unknown>) {
    const response = await api.post("/v1/autopilot/retake-plan", data);
    return response.data;
  },
  async parallelExplore(data: Record<string, unknown>) {
    const response = await api.post("/v1/render/parallel-explore", data);
    return response.data;
  },
  async continuityScan(data: Record<string, unknown>) {
    const response = await api.post("/v1/continuity/scan", data);
    return response.data;
  },
  async createExpressionProfile(projectId: string, name: string, actorLockId?: string) {
    const response = await api.post("/v1/expressions", { projectId, name, actorLockId });
    return response.data;
  },
  async listExpressionProfiles(projectId?: string) {
    const response = await api.get("/v1/expressions", {
      params: projectId ? { projectId } : undefined
    });
    return response.data;
  },
  async getExpressionProfile(profileId: string) {
    const response = await api.get(`/v1/expressions/${profileId}`);
    return response.data;
  },
  async addExpressionKey(
    profileId: string,
    takeId: string,
    key: { frame: number; phoneme: string; intensity: number; expression: string }
  ) {
    const response = await api.post(`/v1/expressions/${profileId}/takes/${takeId}/keys`, key);
    return response.data;
  },
  async estimateCost(jobType: string, frameCount: number) {
    const response = await api.get("/v1/cost/estimate", {
      params: { jobType, frameCount }
    });
    return response.data;
  },
  async listExtensions() {
    const response = await api.get("/v1/extensions");
    return response.data;
  },
  async installExtension(manifestId: string) {
    const response = await api.post("/v1/extensions/install", { manifestId });
    return response.data;
  },
  async executeExtension(
    extensionId: string,
    capabilityId: string,
    payload: Record<string, unknown>,
    agentRuntime?: string,
    requestedScopes?: string[],
    dryRun = false
  ) {
    const response = await api.post(`/v1/extensions/${extensionId}/execute`, {
      capabilityId,
      payload,
      agentRuntime,
      requestedScopes,
      dryRun
    });
    return response.data;
  }
};
