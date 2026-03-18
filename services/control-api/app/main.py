from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .schemas import (
    Actor,
    ActorCreateRequest,
    AddExpressionKeyRequest,
    ApplyCameraPresetRequest,
    AnimaticTimelineRequest,
    BackgroundLayer,
    BackgroundLayout,
    BackgroundLayoutUpdateRequest,
    ColorContinuityResponse,
    ColorScriptLane,
    ColorScriptUpdateRequest,
    CreateStyleDnaRequest,
    CreateExpressionProfileRequest,
    CreatePosePresetRequest,
    DeliverableExportRequest,
    CriticalPathResponse,
    DirectorNoteParseRequest,
    DirectorNoteParseResponse,
    EpisodeBoard,
    EpisodeBoardTask,
    EpisodeBoardUpdateRequest,
    ParallelExploreRequest,
    CostEstimate,
    ContinuityScanRequest,
    ContinuityScanResponse,
    ExpressionPhonemeKey,
    ExpressionProfile,
    ExpressionTake,
    ExecuteExtensionRequest,
    GraphSnapshot,
    InspirationRankRequest,
    InspirationRemixRequest,
    InstallExtensionRequest,
    PerspectiveGuide,
    PosePreset,
    ApprovalActionRequest,
    ApprovalDecisionRecord,
    ApprovalGateState,
    ProvenanceCreateRequest,
    ProvenanceEventRecord,
    RedlineAnnotation,
    RedlineCreateRequest,
    RenderJob,
    ResumeRenderRequest,
    RenderRequest,
    RetakePlanRequest,
    SceneIdea,
    RoomTokenRequest,
    RoomTokenResponse,
    StyleBible,
    StyleDriftRequest,
    StyleDriftReview,
    StyleBibleUpdateRequest,
    StyleDnaConstraints,
    StyleDnaProfile,
    VariantTelemetryCreateRequest,
    VariantTelemetryRecord,
    AutopilotSuggestRequest,
    VoiceGenerateRequest,
)
from .security import create_actor_lock, create_room_token, is_lock_valid
from .store import (
    ANIME_CAMERA_PRESETS,
    ANIME_POSE_PRESETS,
    ANIME_SCENE_IDEAS,
    ANIME_SHOT_TEMPLATES,
    DEFAULT_EXTENSIONS,
    store,
)
from .voice_engine import voice_engine
from . import gemini_client

app = FastAPI(title="GengaOS Control API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def enforce_gateway_auth(request, call_next):
    path = request.url.path
    if not settings.enforce_gateway_auth:
        return await call_next(request)

    if path in {"/health"} or path.startswith("/docs") or path.startswith("/openapi"):
        return await call_next(request)

    expected_token = settings.control_api_token.strip()
    if not expected_token:
        return JSONResponse(status_code=503, content={"detail": "Gateway auth enabled without CONTROL_API_TOKEN"})

    internal_token = request.headers.get("x-genga-internal-token", "").strip()
    auth_header = request.headers.get("authorization", "").strip()
    bearer = auth_header.split(" ", 1)[1].strip() if auth_header.lower().startswith("bearer ") else ""

    if expected_token not in {internal_token, bearer}:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized gateway request"})

    return await call_next(request)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "control-api",
        "domain": "anime-ide",
        "ai": gemini_client.gemini_status(),
    }


@app.get("/v1/ai/status")
def ai_status() -> dict:
    """Returns AI provider status for the Marketplace UI."""
    status = gemini_client.gemini_status()
    return {
        "gemini": status,
        "providers": [{"id": "gemini", **status}],
    }


@app.post("/v1/sync/room-token", response_model=RoomTokenResponse)
def room_token(payload: RoomTokenRequest) -> RoomTokenResponse:
    token, expires_at = create_room_token(payload.projectId, payload.roomId, payload.role)
    store.add_audit("sync.room_token_issued", "system", payload.model_dump())
    return RoomTokenResponse(token=token, expiresAt=expires_at)


@app.get("/v1/graph/{project_id}", response_model=GraphSnapshot)
def get_graph(project_id: str) -> GraphSnapshot:
    snapshot = store.graphs.get(project_id)
    if snapshot:
        return snapshot
    return GraphSnapshot(projectId=project_id, revision=0, nodes=[], edges=[])


@app.get("/v1/anime/shot-templates")
def anime_shot_templates() -> dict:
    return {"templates": [template.model_dump() for template in ANIME_SHOT_TEMPLATES]}


@app.get("/v1/anime/model-router")
def anime_model_router() -> dict:
    return {
        "routes": [
            {"stage": "character-sheet", "model": "flux-dev-lora", "mode": "identity-locked"},
            {"stage": "keyframe", "model": "flux-controlnet-openpose-depth", "mode": "direction-driven"},
            {"stage": "interpolate", "model": "tooncomposer", "mode": "motion-synthesis"},
        ]
    }


@app.get("/v1/anime/camera-presets")
def anime_camera_presets() -> dict:
    return {"presets": [preset.model_dump() for preset in ANIME_CAMERA_PRESETS]}


@app.post("/v1/anime/camera-presets/apply")
def apply_camera_preset(payload: ApplyCameraPresetRequest) -> dict:
    preset = next((item for item in ANIME_CAMERA_PRESETS if item.id == payload.presetId), None)
    if not preset:
        raise HTTPException(status_code=404, detail="Camera preset not found")

    store.add_audit("camera_preset.applied", "director", {"presetId": payload.presetId})
    return {
        "preset": preset.model_dump(),
        "camera": {
            "lens": preset.lens,
            "movement": preset.movement,
            "framing": preset.framing,
            "intent": preset.emotionalIntent,
        },
    }


@app.get("/v1/poses")
def list_pose_presets() -> dict:
    dynamic = list(store.pose_presets.values())
    combined = [*ANIME_POSE_PRESETS, *dynamic]
    return {"poses": [preset.model_dump() for preset in combined]}


@app.post("/v1/poses")
def create_pose_preset(payload: CreatePosePresetRequest) -> dict:
    pose_id = f"pose_{uuid.uuid4().hex[:10]}"
    preset = PosePreset(
        poseId=pose_id,
        name=payload.name,
        archetype=payload.archetype,
        stance=payload.stance,
        cameraBlock=payload.cameraBlock,
        tags=payload.tags,
        joints=payload.joints,
    )
    store.pose_presets[pose_id] = preset
    store.add_audit("pose_preset.created", "director", {"poseId": pose_id, "archetype": payload.archetype})
    return preset.model_dump()


@app.get("/v1/poses/{pose_id}")
def get_pose_preset(pose_id: str) -> dict:
    preset = store.pose_presets.get(pose_id) or next((item for item in ANIME_POSE_PRESETS if item.poseId == pose_id), None)
    if not preset:
        raise HTTPException(status_code=404, detail="Pose preset not found")
    return preset.model_dump()


@app.get("/v1/anime/scene-ideas")
def anime_scene_ideas(request: Request, q: str = Query("", min_length=0), limit: int = Query(24, ge=1, le=100)) -> dict:
    # Try Gemini first
    ai_ideas = gemini_client.generate_scene_ideas(q, count=min(limit, 8), api_key=request.headers.get("x-gemini-key"))
    if ai_ideas:
        # Normalise AI output to match SceneIdea schema
        ideas = []
        for i, raw in enumerate(ai_ideas, start=1):
            ideas.append({
                "id": raw.get("id", f"gemini-idea-{i}"),
                "title": raw.get("title", "Untitled Scene"),
                "theme": raw.get("theme", q or "anime"),
                "mood": raw.get("mood", "cinematic"),
                "promptSeed": raw.get("promptSeed", raw.get("title", "")),
                "tags": raw.get("tags", ["gemini", "ai-generated"]),
                "shotType": raw.get("shotType", "medium-shot"),
                "emotionalCore": raw.get("emotionalCore", ""),
                "confidence": round(0.82 + (i % 4) * 0.04, 2),
                "source": "gemini-2.0-flash",
            })
        store.add_audit("scene_ideas.gemini", "ai", {"query": q, "count": len(ideas)})
        return {"ideas": ideas, "source": "gemini"}

    # Fallback: static store
    query = q.strip().lower()
    ranked = []
    for idea in ANIME_SCENE_IDEAS:
        score = 0
        haystack = " ".join([idea.title, idea.theme, idea.mood, idea.promptSeed, " ".join(idea.tags)]).lower()
        if query:
            if query in haystack:
                score += 3
            for token in query.split():
                if token in haystack:
                    score += 1
        ranked.append((score, idea))

    ranked.sort(key=lambda item: item[0], reverse=True)

    ideas: list[dict] = []
    repeats = max(1, (limit + len(ANIME_SCENE_IDEAS) - 1) // max(1, len(ANIME_SCENE_IDEAS)))
    if query:
        source = [idea for _, idea in ranked]
    else:
        source = list(ANIME_SCENE_IDEAS)
    expanded = (source * repeats)[:limit]
    for index, idea in enumerate(expanded, start=1):
        ideas.append(
            {
                **idea.model_dump(),
                "id": f"{idea.id}-{index}",
                "confidence": round(0.68 + (index % 5) * 0.06, 2),
            }
        )

    return {"ideas": ideas}


def _rank_idea(idea: SceneIdea, style: StyleBible, script_beat: str, graph_context: list[str]) -> float:
    score = 0.42
    haystack = " ".join([idea.title, idea.theme, idea.mood, idea.promptSeed, " ".join(idea.tags)]).lower()
    script_tokens = [token for token in script_beat.lower().split() if len(token) > 2]
    context_tokens = [token for token in " ".join(graph_context).lower().split() if len(token) > 2]

    for token in script_tokens:
        if token in haystack:
            score += 0.08
    for token in context_tokens:
        if token in haystack:
            score += 0.05

    if style.artDirection.lower() in haystack:
        score += 0.06
    if "sakuga" in style.notes.lower() and "sakuga" in haystack:
        score += 0.06
    if style.lensLanguage.lower().split("-")[0] in haystack:
        score += 0.03

    return round(min(0.99, score), 2)


@app.post("/v1/inspiration/rank")
def rank_inspiration(payload: InspirationRankRequest) -> dict:
    style = store.style_bibles.get(payload.projectId) or StyleBible(projectId=payload.projectId)
    store.style_bibles[payload.projectId] = style

    ranked = sorted(
        [
            {
                **idea.model_dump(),
                "rankScore": _rank_idea(idea, style, payload.scriptBeat, payload.graphContext),
                "confidence": round(0.6 + (index % 4) * 0.08, 2),
            }
            for index, idea in enumerate(ANIME_SCENE_IDEAS, start=1)
        ],
        key=lambda item: item["rankScore"],
        reverse=True,
    )

    repeats = max(1, (payload.limit + len(ranked) - 1) // max(1, len(ranked)))
    expanded = (ranked * repeats)[: payload.limit]
    results = [{**item, "id": f"{item['id']}-{index}"} for index, item in enumerate(expanded, start=1)]

    store.add_audit(
        "inspiration.rank",
        "director",
        {"projectId": payload.projectId, "scriptBeat": payload.scriptBeat, "limit": payload.limit},
    )
    return {"ideas": results}


@app.post("/v1/inspiration/remix")
def remix_inspiration(payload: InspirationRemixRequest) -> dict:
    base_id = payload.ideaId
    if "-" in base_id:
        prefix, suffix = base_id.rsplit("-", 1)
        if suffix.isdigit():
            base_id = prefix
    idea = next((item for item in ANIME_SCENE_IDEAS if item.id == base_id), None)
    if not idea:
        raise HTTPException(status_code=404, detail="Scene idea not found")

    style = store.style_bibles.get(payload.projectId) or StyleBible(projectId=payload.projectId)
    store.style_bibles[payload.projectId] = style

    node_prefill = {
        "scriptNode": {
            "script": f"INT. {idea.theme.upper()} - NIGHT\n{idea.promptSeed}",
        },
        "castingNode": {
            "prompt": f"Lead actor tuned for {idea.mood} mood, {idea.theme} context.",
        },
        "virtualSetNode": {
            "cameraPreset": style.lensLanguage,
            "posePreset": "pose-impact-followthrough" if "sakuga" in idea.tags else "pose-dialog-soft",
        },
        "sakugaNode": {
            "sketchHint": f"{idea.mood} motion arc with emphasis on {idea.theme}.",
        },
        "tags": idea.tags,
        "styleHint": style.artDirection,
    }

    store.add_audit(
        "inspiration.remix",
        "director",
        {"projectId": payload.projectId, "ideaId": payload.ideaId, "targetNodeId": payload.targetNodeId},
    )
    return {"ideaId": payload.ideaId, "nodePrefill": node_prefill, "message": "Remix payload ready for graph hydration."}


@app.post("/v1/voice/generate-expression-takes", response_model=ExpressionTake)
def generate_expression_takes(payload: VoiceGenerateRequest) -> ExpressionTake:
    take = voice_engine.process_audio_to_phonemes(payload.audioSrc, payload.mood)
    store.add_audit(
        "voice.takes_generated",
        "system",
        {"projectId": payload.projectId, "audioSrc": payload.audioSrc, "takeId": take.takeId},
    )
    return take


def _default_episode_board(project_id: str) -> EpisodeBoard:
    return EpisodeBoard(
        projectId=project_id,
        episodeId="ep-001",
        tasks=[
            EpisodeBoardTask(taskId="task-001", shotId="shot-010", title="Script beat polish", status="done", estimateHours=1.5),
            EpisodeBoardTask(taskId="task-002", shotId="shot-010", title="Pose block key A/B", status="in_progress", dependsOn=["task-001"], estimateHours=3.0),
            EpisodeBoardTask(taskId="task-003", shotId="shot-010", title="Keyframe generation", status="todo", dependsOn=["task-002"], estimateHours=2.0),
            EpisodeBoardTask(taskId="task-004", shotId="shot-011", title="In-between interpolation", status="todo", dependsOn=["task-003"], estimateHours=4.0),
            EpisodeBoardTask(taskId="task-005", shotId="shot-011", title="Final review and delivery", status="todo", dependsOn=["task-004"], estimateHours=1.0),
        ],
    )


@app.get("/v1/episode-board/{project_id}", response_model=EpisodeBoard)
def get_episode_board(project_id: str) -> EpisodeBoard:
    board = store.episode_boards.get(project_id)
    if board:
        return board
    board = _default_episode_board(project_id)
    store.episode_boards[project_id] = board
    store.save_state()
    return board


@app.put("/v1/episode-board/{project_id}", response_model=EpisodeBoard)
def update_episode_board(project_id: str, payload: EpisodeBoardUpdateRequest) -> EpisodeBoard:
    board = EpisodeBoard(projectId=project_id, episodeId=payload.episodeId, tasks=payload.tasks, updatedAt=datetime.utcnow().isoformat() + "Z")
    store.episode_boards[project_id] = board
    store.add_audit("episode_board.updated", "director", {"projectId": project_id, "tasks": len(payload.tasks)})
    return board


def _critical_path(tasks: list[EpisodeBoardTask]) -> list[str]:
    task_map = {task.taskId: task for task in tasks}
    memo: dict[str, float] = {}

    def cumulative(task_id: str, stack: set[str] | None = None) -> float:
        if task_id in memo:
            return memo[task_id]
        stack = stack or set()
        if task_id in stack:
            return 0.0
        stack.add(task_id)
        task = task_map.get(task_id)
        if not task:
            return 0.0
        longest_dependency = max((cumulative(dep, set(stack)) for dep in task.dependsOn), default=0.0)
        memo[task_id] = task.estimateHours + longest_dependency
        return memo[task_id]

    scored = sorted(((task_id, cumulative(task_id)) for task_id in task_map), key=lambda item: item[1], reverse=True)
    return [task_id for task_id, _ in scored[:4]]


@app.post("/v1/episode-board/{project_id}/critical-path", response_model=CriticalPathResponse)
def analyze_episode_board(project_id: str) -> CriticalPathResponse:
    board = store.episode_boards.get(project_id) or _default_episode_board(project_id)
    store.episode_boards[project_id] = board
    task_map = {task.taskId: task for task in board.tasks}
    blocked = [
        task.taskId
        for task in board.tasks
        if task.status != "done" and any(task_map.get(dep) and task_map[dep].status != "done" for dep in task.dependsOn)
    ]
    critical_path = _critical_path(board.tasks)
    release_risk = "high" if len(blocked) >= 2 else "medium" if blocked else "low"
    result = CriticalPathResponse(
        projectId=project_id,
        episodeId=board.episodeId,
        criticalPath=critical_path,
        blockedTasks=blocked,
        releaseRisk=release_risk,
    )
    store.add_audit(
        "episode_board.critical_path",
        "director",
        {"projectId": project_id, "blockedTasks": len(blocked), "releaseRisk": release_risk},
    )
    return result


@app.post("/v1/notes/parse", response_model=DirectorNoteParseResponse)
def parse_director_notes(payload: DirectorNoteParseRequest, request: Request) -> DirectorNoteParseResponse:
    text = payload.text.strip()

    # Try Gemini AI parser first
    ai_actions = gemini_client.parse_director_notes(text, payload.projectId, api_key=request.headers.get("x-gemini-key"))
    if ai_actions:
        response = DirectorNoteParseResponse(actions=ai_actions)
        store.add_audit(
            "director_notes.parsed",
            "gemini-ai",
            {"projectId": payload.projectId, "actions": len(ai_actions), "source": "gemini"},
        )
        return response

    # Fallback: regex-based parser
    lowered = text.lower()
    actions = []

    if "retake" in lowered or "redo" in lowered:
        actions.append(
            {
                "actionId": f"note_{uuid.uuid4().hex[:8]}",
                "label": "Retake Continuity",
                "command": "retake-continuity",
                "payload": {"reason": "director_note", "sourceText": text},
                "confidence": 0.87,
                "warnings": [],
            }
        )

    if "close-up" in lowered or "lens" in lowered or "camera" in lowered:
        actions.append(
            {
                "actionId": f"note_{uuid.uuid4().hex[:8]}",
                "label": "Adjust Camera Grammar",
                "command": "apply-camera-preset",
                "payload": {"presetHint": "dialog-closeup-50mm", "sourceText": text},
                "confidence": 0.78,
                "warnings": ["Verify axis continuity after camera changes."],
            }
        )

    if "lock" in lowered and "style" in lowered:
        actions.append(
            {
                "actionId": f"note_{uuid.uuid4().hex[:8]}",
                "label": "Refresh Style DNA Lock",
                "command": "lock-style-dna",
                "payload": {"projectId": payload.projectId, "sourceText": text},
                "confidence": 0.84,
                "warnings": [],
            }
        )

    if "impact" in lowered or "sakuga" in lowered:
        actions.append(
            {
                "actionId": f"note_{uuid.uuid4().hex[:8]}",
                "label": "Generate Impact Cut",
                "command": "generate-impact-cut",
                "payload": {"intensity": "high", "sourceText": text},
                "confidence": 0.74,
                "warnings": ["Confirm FX stack intensity against broadcast-safe levels."],
            }
        )

    if not actions:
        actions.append(
            {
                "actionId": f"note_{uuid.uuid4().hex[:8]}",
                "label": "Review Note Manually",
                "command": "manual-review",
                "payload": {"sourceText": text},
                "confidence": 0.46,
                "warnings": ["Parser confidence is low. Review before applying."],
            }
        )

    response = DirectorNoteParseResponse(actions=actions)
    store.add_audit(
        "director_notes.parsed",
        "director",
        {"projectId": payload.projectId, "actions": len(response.actions)},
    )
    return response


@app.get("/v1/style-bible/{project_id}", response_model=StyleBible)
def get_style_bible(project_id: str) -> StyleBible:
    style = store.style_bibles.get(project_id)
    if style:
        return style
    default = StyleBible(projectId=project_id)
    store.style_bibles[project_id] = default
    store.save_state()
    return default


@app.put("/v1/style-bible/{project_id}", response_model=StyleBible)
def update_style_bible(project_id: str, payload: StyleBibleUpdateRequest) -> StyleBible:
    existing = store.style_bibles.get(project_id) or StyleBible(projectId=project_id)
    merged = existing.model_copy(
        update={**{k: v for k, v in payload.model_dump().items() if v is not None}, "updatedAt": datetime.utcnow().isoformat() + "Z"}
    )
    store.style_bibles[project_id] = merged
    store.add_audit("style_bible.updated", "director", {"projectId": project_id})
    return merged


def _default_style_dna_constraints(style: StyleBible) -> StyleDnaConstraints:
    return StyleDnaConstraints(
        artDirection=style.artDirection,
        lineWeight=style.lineWeight,
        shadingMode=style.shadingMode,
        palette=style.palette,
        lensLanguage=style.lensLanguage,
        moodLanguage="anime-cinematic",
    )


def _style_dna_hash(project_id: str, version: int, constraints: StyleDnaConstraints) -> str:
    payload = {
        "projectId": project_id,
        "version": version,
        "constraints": constraints.model_dump(),
    }
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return hashlib.sha256(body).hexdigest()


@app.get("/v1/style-dna/{project_id}")
def list_style_dna_profiles(project_id: str) -> dict:
    profiles = [profile for profile in store.style_dna_profiles.values() if profile.projectId == project_id]
    profiles.sort(key=lambda item: item.version, reverse=True)
    return {"profiles": [profile.model_dump() for profile in profiles]}


@app.post("/v1/style-dna", response_model=StyleDnaProfile)
def create_style_dna_profile(payload: CreateStyleDnaRequest) -> StyleDnaProfile:
    existing = [profile for profile in store.style_dna_profiles.values() if profile.projectId == payload.projectId]
    next_version = max([item.version for item in existing], default=0) + 1
    style_bible = store.style_bibles.get(payload.projectId) or StyleBible(projectId=payload.projectId)
    store.style_bibles[payload.projectId] = style_bible

    constraints = payload.constraints or _default_style_dna_constraints(style_bible)
    profile = StyleDnaProfile(
        styleDnaId=f"style_{uuid.uuid4().hex[:12]}",
        projectId=payload.projectId,
        version=next_version,
        immutableHash=_style_dna_hash(payload.projectId, next_version, constraints),
        locked=True,
        constraints=constraints,
    )
    store.style_dna_profiles[profile.styleDnaId] = profile
    store.add_audit(
        "style_dna.created",
        "director",
        {"projectId": payload.projectId, "styleDnaId": profile.styleDnaId, "version": profile.version},
    )
    return profile


@app.get("/v1/style-dna/profile/{style_dna_id}", response_model=StyleDnaProfile)
def get_style_dna_profile(style_dna_id: str) -> StyleDnaProfile:
    profile = store.style_dna_profiles.get(style_dna_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Style DNA profile not found")
    return profile


@app.post("/v1/style-dna/{style_dna_id}/drift-check", response_model=StyleDriftReview)
def check_style_drift(style_dna_id: str, payload: StyleDriftRequest) -> StyleDriftReview:
    profile = store.style_dna_profiles.get(style_dna_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Style DNA profile not found")

    findings = []

    observed_line = payload.observedLineWeight.strip().lower()
    if observed_line and observed_line != profile.constraints.lineWeight.strip().lower():
        findings.append(
            {
                "category": "line_weight",
                "severity": "warning",
                "score": 0.52,
                "detail": f"Observed line weight '{payload.observedLineWeight}' drifts from locked '{profile.constraints.lineWeight}'.",
            }
        )

    observed_shading = payload.observedShadingMode.strip().lower()
    if observed_shading and observed_shading != profile.constraints.shadingMode.strip().lower():
        findings.append(
            {
                "category": "shading",
                "severity": "critical",
                "score": 0.41,
                "detail": f"Shading mode '{payload.observedShadingMode}' violates style DNA '{profile.constraints.shadingMode}'.",
            }
        )

    if payload.observedPalette and payload.observedPalette != profile.constraints.palette:
        findings.append(
            {
                "category": "palette",
                "severity": "warning",
                "score": 0.58,
                "detail": "Observed palette diverges from locked palette progression.",
            }
        )

    overall = 0.92 if not findings else round(sum(item["score"] for item in findings) / len(findings), 2)
    suggestions = (
        [
            "Retake with locked palette swatches from the style DNA profile.",
            "Re-apply line weight and shading constraints before final render.",
        ]
        if findings
        else ["Style DNA lock looks clean. Proceed with render acceptance."]
    )
    review = StyleDriftReview(
        styleDnaId=style_dna_id,
        overallScore=overall,
        findings=findings,
        suggestions=suggestions,
    )
    store.add_audit(
        "style_dna.drift_checked",
        "director",
        {"styleDnaId": style_dna_id, "overallScore": review.overallScore, "findings": len(review.findings)},
    )
    return review


def _default_color_script_lane(project_id: str) -> ColorScriptLane:
    return ColorScriptLane(
        projectId=project_id,
        scenes=[
            {
                "sceneId": "scn-001",
                "label": "Opening Beat",
                "mood": "tense",
                "palette": ["#101e37", "#f8d36b", "#e85f5c"],
                "notes": "Cold shadows with warm key accent.",
            },
            {
                "sceneId": "scn-002",
                "label": "Impact Reveal",
                "mood": "explosive",
                "palette": ["#1a1431", "#ff8b3d", "#ffe28b"],
                "notes": "Push contrast and hit highlights.",
            },
        ],
    )


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    color = value.strip().lstrip("#")
    if len(color) != 6:
        return (0, 0, 0)
    return (int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16))


def _palette_delta(a: list[str], b: list[str]) -> float:
    limit = min(len(a), len(b))
    if limit == 0:
        return 0.0
    deltas = []
    for index in range(limit):
        ar, ag, ab = _hex_to_rgb(a[index])
        br, bg, bb = _hex_to_rgb(b[index])
        deltas.append(abs(ar - br) + abs(ag - bg) + abs(ab - bb))
    return float(sum(deltas) / limit)


@app.get("/v1/color-script/{project_id}", response_model=ColorScriptLane)
def get_color_script_lane(project_id: str) -> ColorScriptLane:
    lane = store.color_script_lanes.get(project_id)
    if lane:
        return lane
    default_lane = _default_color_script_lane(project_id)
    store.color_script_lanes[project_id] = default_lane
    store.save_state()
    return default_lane


@app.put("/v1/color-script/{project_id}", response_model=ColorScriptLane)
def update_color_script_lane(project_id: str, payload: ColorScriptUpdateRequest) -> ColorScriptLane:
    lane = ColorScriptLane(projectId=project_id, scenes=payload.scenes, updatedAt=datetime.utcnow().isoformat() + "Z")
    store.color_script_lanes[project_id] = lane
    store.add_audit("color_script.updated", "director", {"projectId": project_id, "scenes": len(payload.scenes)})
    return lane


@app.post("/v1/color-script/{project_id}/analyze", response_model=ColorContinuityResponse)
def analyze_color_script_lane(project_id: str) -> ColorContinuityResponse:
    lane = store.color_script_lanes.get(project_id) or _default_color_script_lane(project_id)
    store.color_script_lanes[project_id] = lane
    deltas: list[float] = []
    warnings: list[str] = []
    for current, nxt in zip(lane.scenes, lane.scenes[1:]):
        delta = _palette_delta(current.palette, nxt.palette)
        deltas.append(delta)
        if delta > 180:
            warnings.append(f"{current.label} -> {nxt.label}: abrupt palette jump ({round(delta, 1)})")

    average_delta = round(sum(deltas) / max(1, len(deltas)), 2)
    suggestions = (
        ["Introduce bridge tones between adjacent scenes.", "Reduce hue jump on secondary accent colors."]
        if warnings
        else ["Palette flow looks stable. Maintain current progression."]
    )
    result = ColorContinuityResponse(
        projectId=project_id,
        averageDelta=average_delta,
        warnings=warnings,
        suggestions=suggestions,
    )
    store.add_audit(
        "color_script.analyzed",
        "director",
        {"projectId": project_id, "averageDelta": average_delta, "warnings": len(warnings)},
    )
    return result


def _default_background_layout(project_id: str, scene_id: str) -> BackgroundLayout:
    return BackgroundLayout(
        projectId=project_id,
        sceneId=scene_id,
        guide=PerspectiveGuide(vanishingX=0.52, vanishingY=0.38, horizonY=0.46, gridDensity=8),
        layers=[
            BackgroundLayer(
                layerId="bg-sky",
                name="Sky Layer",
                depth=0.1,
                parallax=0.05,
                assetRef="env/sky-gradient.png",
            ),
            BackgroundLayer(
                layerId="bg-midcity",
                name="Mid City",
                depth=0.55,
                parallax=0.35,
                assetRef="env/city-mid.png",
            ),
            BackgroundLayer(
                layerId="bg-foreground",
                name="Foreground Props",
                depth=0.85,
                parallax=0.7,
                assetRef="env/props-front.png",
            ),
        ],
    )


@app.get("/v1/background-layout/{project_id}/{scene_id}", response_model=BackgroundLayout)
def get_background_layout(project_id: str, scene_id: str) -> BackgroundLayout:
    key = f"{project_id}:{scene_id}"
    layout = store.background_layouts.get(key)
    if layout:
        return layout
    default_layout = _default_background_layout(project_id, scene_id)
    store.background_layouts[key] = default_layout
    store.save_state()
    return default_layout


@app.put("/v1/background-layout/{project_id}/{scene_id}", response_model=BackgroundLayout)
def update_background_layout(project_id: str, scene_id: str, payload: BackgroundLayoutUpdateRequest) -> BackgroundLayout:
    key = f"{project_id}:{scene_id}"
    layout = BackgroundLayout(
        projectId=project_id,
        sceneId=scene_id,
        guide=payload.guide,
        layers=payload.layers,
        updatedAt=datetime.utcnow().isoformat() + "Z",
    )
    store.background_layouts[key] = layout
    store.add_audit(
        "background_layout.updated",
        "director",
        {"projectId": project_id, "sceneId": scene_id, "layers": len(payload.layers)},
    )
    return layout


@app.post("/v1/background-layout/{project_id}/{scene_id}/export")
def export_background_layout(project_id: str, scene_id: str) -> dict:
    key = f"{project_id}:{scene_id}"
    layout = store.background_layouts.get(key) or _default_background_layout(project_id, scene_id)
    store.background_layouts[key] = layout
    payload = {
        "sceneId": scene_id,
        "perspectiveGuide": layout.guide.model_dump(),
        "layers": [layer.model_dump() for layer in sorted(layout.layers, key=lambda item: item.depth)],
    }
    store.add_audit(
        "background_layout.exported",
        "director",
        {"projectId": project_id, "sceneId": scene_id, "layers": len(layout.layers)},
    )
    return {"sceneId": scene_id, "layerCount": len(layout.layers), "payload": payload}


@app.put("/v1/graph/{project_id}", response_model=GraphSnapshot)
def put_graph(project_id: str, payload: GraphSnapshot) -> GraphSnapshot:
    existing = store.graphs.get(project_id)
    if existing and payload.revision != existing.revision:
        raise HTTPException(status_code=409, detail="Revision conflict")

    next_snapshot = payload.model_copy(update={"revision": payload.revision + 1})
    store.graphs[project_id] = next_snapshot
    store.add_audit("graph.updated", "director", {"projectId": project_id, "revision": next_snapshot.revision})
    return next_snapshot


@app.post("/v1/actors")
def create_actor(payload: ActorCreateRequest) -> dict:
    actor_id = f"actor_{uuid.uuid4().hex[:10]}"
    actor = Actor(
        actorId=actor_id,
        prompt=payload.prompt,
        references=payload.references,
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    store.actors[actor_id] = actor.model_dump()
    store.add_audit("actor.created", "director", {"actorId": actor_id})
    return actor.model_dump()


@app.post("/v1/actors/{actor_id}/lock")
def lock_actor(actor_id: str) -> dict:
    actor = store.actors.get(actor_id)
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    lock_payload = create_actor_lock(actor_id)
    store.locks[lock_payload["actorLockId"]] = lock_payload
    actor["locked"] = True
    store.add_audit("actor.locked", "director", {"actorId": actor_id, "actorLockId": lock_payload["actorLockId"]})
    return lock_payload


def _validate_lock_or_raise(actor_lock_id: str) -> dict:
    lock = store.locks.get(actor_lock_id)
    if not lock or not is_lock_valid(lock):
        store.add_audit("render.blocked_no_lock", "director", {"actorLockId": actor_lock_id})
        raise HTTPException(status_code=403, detail="Identity lock missing or invalid")
    return lock


def _validate_style_dna_or_raise(style_dna_id: str, actor_lock_id: str, stage: str) -> StyleDnaProfile:
    profile = store.style_dna_profiles.get(style_dna_id)
    if not profile:
        store.add_audit(
            "style_lock.failed",
            "director",
            {"styleDnaId": style_dna_id, "actorLockId": actor_lock_id, "stage": stage, "reason": "not_found"},
        )
        raise HTTPException(status_code=403, detail="Style DNA lock missing or invalid")
    if not profile.locked:
        store.add_audit(
            "style_lock.failed",
            "director",
            {"styleDnaId": style_dna_id, "actorLockId": actor_lock_id, "stage": stage, "reason": "unlocked_profile"},
        )
        raise HTTPException(status_code=403, detail="Style DNA lock is not active")

    store.add_audit(
        "style_lock.passed",
        "director",
        {"styleDnaId": style_dna_id, "actorLockId": actor_lock_id, "stage": stage, "version": profile.version},
    )
    return profile


def _estimate(job_type: str, frame_count: int) -> tuple[float, int]:
    multiplier = 0.6 if job_type == "keyframes" else 0.9
    credits = round(max(1, frame_count) * multiplier, 2)
    seconds = max(8, int(frame_count * 1.5))
    return credits, seconds


def _dispatch_inference(job_type: str, payload, frame_count: int) -> dict | None:
    base = settings.inference_api_base.strip().rstrip("/")
    if not base:
        return None

    route = "keyframes" if job_type == "keyframes" else "interpolate"
    url = f"{base}/v1/infer/{route}"
    headers = {"Content-Type": "application/json"}
    if settings.inference_api_token.strip():
        headers["x-genga-inference-token"] = settings.inference_api_token.strip()

    body = {
        "actorLockId": payload.actorLockId,
        "frameA": getattr(payload, "frameA", None),
        "frameB": getattr(payload, "frameB", None),
        "sketchHint": getattr(payload, "sketchHint", None),
        "provider": "runpod",
        "frameCount": frame_count,
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(url, headers=headers, json=body)
            response.raise_for_status()
            result = response.json()
            store.add_audit(
                "render.remote_dispatch",
                "director",
                {"jobType": job_type, "provider": result.get("provider", "runpod"), "status": result.get("status", "unknown")},
            )
            return result
    except Exception as error:
        store.add_audit(
            "render.remote_dispatch_failed",
            "director",
            {"jobType": job_type, "error": str(error)},
        )
        return None


def _materialize_remote_job(job_type: str, actor_lock_id: str, remote: dict) -> RenderJob:
    job = RenderJob(
        jobId=remote.get("jobId", f"job_{uuid.uuid4().hex[:12]}"),
        status=remote.get("status", "failed"),
        jobType=job_type,
        actorLockId=actor_lock_id,
        outputs=remote.get("outputs", []),
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    store.jobs[job.jobId] = job.model_dump()
    store.add_audit(
        "render.remote_job_recorded",
        "director",
        {"jobId": job.jobId, "jobType": job_type, "status": job.status},
    )
    return job


def _create_job(job_type: str, actor_lock_id: str, frame_count: int, fx_layers_count: int = 0) -> RenderJob:
    credits, seconds = _estimate(job_type, frame_count)
    projected = store.today_spend() + credits
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    if projected > settings.daily_spend_cap_credits:
        job = RenderJob(
            jobId=job_id,
            status="blocked_budget",
            jobType=job_type,
            actorLockId=actor_lock_id,
            outputs=[],
            createdAt=datetime.utcnow().isoformat() + "Z",
        )
        store.jobs[job_id] = job.model_dump()
        store.add_audit(
            "render.blocked_budget",
            "director",
            {"jobId": job_id, "projectedCredits": projected, "cap": settings.daily_spend_cap_credits},
        )
        return job

    store.add_spend(credits)
    job = RenderJob(
        jobId=job_id,
        status="completed",
        jobType=job_type,
        actorLockId=actor_lock_id,
        outputs=[f"https://cdn.gengaos.dev/{job_id}/frame_{idx:03d}.png" for idx in range(1, 4)],
        createdAt=datetime.utcnow().isoformat() + "Z",
    )
    store.jobs[job_id] = job.model_dump()
    store.add_audit(
        "render.completed",
        "director",
        {"jobId": job_id, "credits": credits, "seconds": seconds, "jobType": job_type, "fxLayers": fx_layers_count},
    )
    return job


def _record_provenance_event(
    project_id: str,
    shot_id: str,
    model: str,
    job_id: str | None = None,
    source_assets: list[str] | None = None,
    extension_ids: list[str] | None = None,
) -> ProvenanceEventRecord:
    event = ProvenanceEventRecord(
        provenanceId=f"prov_{uuid.uuid4().hex[:10]}",
        projectId=project_id,
        shotId=shot_id,
        jobId=job_id,
        model=model,
        extensionIds=extension_ids or [],
        sourceAssets=source_assets or [],
    )
    store.provenance_events.append(event)
    store.add_audit(
        "provenance.recorded",
        "director",
        {"projectId": project_id, "shotId": shot_id, "jobId": job_id, "model": model},
    )
    return event


def _record_variant_telemetry(
    project_id: str,
    shot_id: str,
    quality: float,
    timing: float,
    acting: float,
    continuity: float,
    selected: bool = False,
) -> VariantTelemetryRecord:
    record = VariantTelemetryRecord(
        variantId=f"var_{uuid.uuid4().hex[:10]}",
        projectId=project_id,
        shotId=shot_id,
        qualityScore=quality,
        timingScore=timing,
        actingScore=acting,
        continuityScore=continuity,
        selected=selected,
    )
    store.variant_telemetry.append(record)
    store.add_audit(
        "variant_telemetry.recorded",
        "director",
        {"variantId": record.variantId, "projectId": project_id, "shotId": shot_id},
    )
    return record


def _continuity_scan(payload: ContinuityScanRequest) -> ContinuityScanResponse:
    issues = []
    scores = []

    if not payload.frameA or not payload.frameB:
        issues.append(
            {
                "category": "frame_pair",
                "severity": "warning",
                "score": 0.45,
                "detail": "Missing start/end frame reference for full continuity check.",
            }
        )
        scores.append(0.45)
    else:
        scores.append(0.86)

    tags = [str(item).lower() for item in payload.context.get("tags", [])]
    if "prop-drift" in tags:
        issues.append(
            {
                "category": "prop",
                "severity": "critical",
                "score": 0.32,
                "detail": "Detected likely prop mismatch between frames.",
            }
        )
        scores.append(0.32)
    else:
        scores.append(0.81)

    if "pose-drift" in tags:
        issues.append(
            {
                "category": "pose",
                "severity": "warning",
                "score": 0.51,
                "detail": "Pose trajectory drift detected on primary actor.",
            }
        )
        scores.append(0.51)
    else:
        scores.append(0.84)

    if "axis-break" in tags or "spatial-axis" in tags:
        # Simulate check: if 'framing' in context differs by 'flip', trigger axis break
        framing_a = payload.context.get("framing_a", "medium-shot")
        framing_b = payload.context.get("framing_b", "medium-shot")
        
        if "flip" in payload.context.get("motion_vector", ""):
            issues.append(
                {
                    "category": "camera-axis",
                    "severity": "critical",
                    "score": 0.28,
                    "detail": "Action axis violated (180-degree rule failure). Scene topology is inconsistent.",
                }
            )
            scores.append(0.28)
        else:
            issues.append(
                {
                    "category": "camera-axis",
                    "severity": "info",
                    "score": 0.92,
                    "detail": "Spatial axis maintained. Action vectors are consistent.",
                }
            )
            scores.append(0.92)
    else:
        scores.append(0.88)

    overall = round(sum(scores) / max(1, len(scores)), 2)
    return ContinuityScanResponse(overallScore=overall, issues=issues)


def _default_expression_takes() -> list[ExpressionTake]:
    return [
        ExpressionTake(
            takeId="neutral-dialog",
            name="Neutral Dialog",
            mood="neutral",
            keys=[
                ExpressionPhonemeKey(frame=0, phoneme="Closed", intensity=0.1, expression="neutral"),
                ExpressionPhonemeKey(frame=6, phoneme="A", intensity=0.62, expression="focus"),
                ExpressionPhonemeKey(frame=12, phoneme="I", intensity=0.58, expression="focus"),
            ],
        ),
        ExpressionTake(
            takeId="emotional-push",
            name="Emotional Push",
            mood="intense",
            keys=[
                ExpressionPhonemeKey(frame=0, phoneme="Closed", intensity=0.2, expression="concern"),
                ExpressionPhonemeKey(frame=8, phoneme="O", intensity=0.75, expression="shock"),
                ExpressionPhonemeKey(frame=16, phoneme="E", intensity=0.64, expression="resolve"),
            ],
        ),
    ]


@app.post("/v1/render/keyframes")
def render_keyframes(payload: RenderRequest) -> dict:
    _validate_lock_or_raise(payload.actorLockId)
    _validate_style_dna_or_raise(payload.styleDnaId, payload.actorLockId, "render.keyframes")
    frame_count = 2
    fx_layers_count = len(payload.fxStack)
    remote = _dispatch_inference("keyframes", payload, frame_count=frame_count)
    job = _materialize_remote_job("keyframes", payload.actorLockId, remote) if remote else _create_job(
        "keyframes", payload.actorLockId, frame_count, fx_layers_count=fx_layers_count
    )
    _record_provenance_event(
        project_id=payload.projectId,
        shot_id=payload.shotId,
        model="flux-controlnet-openpose-depth",
        job_id=job.jobId,
        source_assets=[item for item in [payload.frameA, payload.frameB] if item],
    )
    variant = _record_variant_telemetry(
        project_id=payload.projectId,
        shot_id=payload.shotId,
        quality=0.78,
        timing=0.71,
        acting=0.74,
        continuity=0.82,
        selected=True,
    )
    return {
        "jobId": job.jobId,
        "status": job.status,
        "outputs": job.outputs,
        "fxLayersApplied": fx_layers_count,
        "styleDnaId": payload.styleDnaId,
        "variantId": variant.variantId,
    }


@app.post("/v1/render/interpolate")
def render_interpolate(payload: RenderRequest) -> dict:
    _validate_lock_or_raise(payload.actorLockId)
    _validate_style_dna_or_raise(payload.styleDnaId, payload.actorLockId, "render.interpolate")
    frame_count = 24
    fx_layers_count = len(payload.fxStack)
    remote = _dispatch_inference("interpolate", payload, frame_count=frame_count)
    job = _materialize_remote_job("interpolate", payload.actorLockId, remote) if remote else _create_job(
        "interpolate", payload.actorLockId, frame_count, fx_layers_count=fx_layers_count
    )
    _record_provenance_event(
        project_id=payload.projectId,
        shot_id=payload.shotId,
        model="tooncomposer",
        job_id=job.jobId,
        source_assets=[item for item in [payload.frameA, payload.frameB] if item],
    )
    variant = _record_variant_telemetry(
        project_id=payload.projectId,
        shot_id=payload.shotId,
        quality=0.81,
        timing=0.84,
        acting=0.76,
        continuity=0.79,
        selected=False,
    )
    return {
        "jobId": job.jobId,
        "status": job.status,
        "outputs": job.outputs,
        "fxLayersApplied": fx_layers_count,
        "styleDnaId": payload.styleDnaId,
        "variantId": variant.variantId,
    }


@app.post("/v1/expressions")
def create_expression_profile(payload: CreateExpressionProfileRequest) -> dict:
    profile_id = f"expr_{uuid.uuid4().hex[:10]}"
    profile = ExpressionProfile(
        profileId=profile_id,
        projectId=payload.projectId,
        actorLockId=payload.actorLockId,
        name=payload.name,
        takes=_default_expression_takes(),
    )
    store.expression_profiles[profile_id] = profile
    store.add_audit(
        "expression_profile.created",
        "director",
        {"profileId": profile_id, "projectId": payload.projectId, "actorLockId": payload.actorLockId},
    )
    return profile.model_dump()


@app.get("/v1/expressions")
def list_expression_profiles(projectId: str | None = Query(default=None)) -> dict:
    profiles = list(store.expression_profiles.values())
    if projectId:
        profiles = [profile for profile in profiles if profile.projectId == projectId]
    return {"profiles": [profile.model_dump() for profile in profiles]}


@app.get("/v1/expressions/{profile_id}")
def get_expression_profile(profile_id: str) -> dict:
    profile = store.expression_profiles.get(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Expression profile not found")
    return profile.model_dump()


@app.post("/v1/expressions/{profile_id}/takes/{take_id}/keys")
def add_expression_key(profile_id: str, take_id: str, payload: AddExpressionKeyRequest) -> dict:
    profile = store.expression_profiles.get(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Expression profile not found")

    take = next((item for item in profile.takes if item.takeId == take_id), None)
    if not take:
        raise HTTPException(status_code=404, detail="Expression take not found")

    take.keys.append(
        ExpressionPhonemeKey(
            frame=payload.frame,
            phoneme=payload.phoneme,
            intensity=payload.intensity,
            expression=payload.expression,
        )
    )
    take.keys.sort(key=lambda key: key.frame)
    profile.updatedAt = datetime.utcnow().isoformat() + "Z"
    store.expression_profiles[profile_id] = profile
    store.add_audit(
        "expression_key.added",
        "director",
        {
            "profileId": profile_id,
            "takeId": take_id,
            "frame": payload.frame,
            "phoneme": payload.phoneme,
        },
    )
    return {"profile": profile.model_dump()}


@app.post("/v1/continuity/scan", response_model=ContinuityScanResponse)
def continuity_scan(payload: ContinuityScanRequest) -> ContinuityScanResponse:
    _validate_lock_or_raise(payload.actorLockId)
    result = _continuity_scan(payload)
    store.add_audit(
        "continuity.scan",
        "director",
        {
            "actorLockId": payload.actorLockId,
            "overallScore": result.overallScore,
            "issues": [issue.model_dump() for issue in result.issues],
        },
    )
    return result


@app.post("/v1/render/parallel-explore")
def render_parallel_explore(payload: ParallelExploreRequest) -> dict:
    _validate_lock_or_raise(payload.actorLockId)
    _validate_style_dna_or_raise(payload.styleDnaId, payload.actorLockId, "render.parallel_explore")
    variants = max(1, min(payload.variants, 8))

    candidates = []
    for index in range(variants):
        remote = _dispatch_inference("keyframes", payload, frame_count=2)
        candidate = _materialize_remote_job("keyframes", payload.actorLockId, remote) if remote else _create_job(
            "keyframes", payload.actorLockId, 2
        )
        variant = _record_variant_telemetry(
            project_id=payload.projectId,
            shot_id=payload.shotId,
            quality=round(0.62 + (index * 0.07), 2),
            timing=round(0.58 + (index * 0.08), 2),
            acting=round(0.6 + (index * 0.05), 2),
            continuity=round(0.65 + (index * 0.04), 2),
            selected=index == 0,
        )
        _record_provenance_event(
            project_id=payload.projectId,
            shot_id=payload.shotId,
            model=["flux-controlnet-openpose-depth", "flux-depth-priority", "flux-pose-priority"][index % 3],
            job_id=candidate.jobId,
            source_assets=payload.referenceFrames,
        )
        candidates.append(
            {
                "jobId": candidate.jobId,
                "status": candidate.status,
                "previewUrl": candidate.outputs[0] if candidate.outputs else None,
                "modelTrack": ["flux-controlnet-openpose-depth", "flux-depth-priority", "flux-pose-priority"][index % 3],
                "variantId": variant.variantId,
            }
        )

    store.add_audit(
        "render.parallel_explore",
        "director",
        {"variants": variants, "actorLockId": payload.actorLockId, "styleDnaId": payload.styleDnaId, "prompt": payload.prompt},
    )
    return {"candidates": candidates}


@app.post("/v1/animatics/queue")
def build_animatic_queue(payload: AnimaticTimelineRequest) -> dict:
    queue = []
    for index, clip in enumerate(payload.clipCuts, start=1):
        frame_span = max(1, clip.endFrame - clip.startFrame + 1)
        queue.append(
            {
                "queueId": f"queue_{index:03d}",
                "clipId": clip.clipId,
                "sceneNodeId": clip.sceneNodeId,
                "frameSpan": frame_span,
                "estimatedCredits": round(frame_span * 0.22, 2),
                "transition": clip.transition,
            }
        )

    store.add_audit(
        "animatic.queue_built",
        "director",
        {
            "projectId": payload.projectId,
            "clips": len(payload.clipCuts),
            "audioTracks": len(payload.audioTracks),
            "beats": len(payload.beatMarkers),
        },
    )
    return {"projectId": payload.projectId, "queue": queue}


@app.post("/v1/render/jobs/{job_id}/resume")
def resume_render_job(job_id: str, payload: ResumeRenderRequest) -> dict:
    job = store.jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    resumed_job = _create_job(
        job_type=job.get("jobType", "interpolate"),
        actor_lock_id=job.get("actorLockId", ""),
        frame_count=8,
        fx_layers_count=0,
    )
    store.add_audit(
        "render.resumed",
        "director",
        {"jobId": job_id, "resumedJobId": resumed_job.jobId, "lastGoodFrame": payload.lastGoodFrame, "reason": payload.reason},
    )
    return {
        "jobId": resumed_job.jobId,
        "status": resumed_job.status,
        "resumedFrom": job_id,
        "startFrame": payload.lastGoodFrame,
        "outputs": resumed_job.outputs,
    }


@app.post("/v1/deliverables/export")
def export_deliverable(payload: DeliverableExportRequest) -> dict:
    artifact_id = f"artifact_{uuid.uuid4().hex[:10]}"
    artifact_url = f"https://cdn.gengaos.dev/{payload.projectId}/deliverables/{artifact_id}-{payload.deliverableType}.zip"
    store.add_audit(
        "deliverable.exported",
        "director",
        {"projectId": payload.projectId, "type": payload.deliverableType, "clips": len(payload.clipIds)},
    )
    return {"status": "queued", "artifactId": artifact_id, "artifactUrl": artifact_url}


@app.post("/v1/provenance/events", response_model=ProvenanceEventRecord)
def create_provenance_event(payload: ProvenanceCreateRequest) -> ProvenanceEventRecord:
    return _record_provenance_event(
        project_id=payload.projectId,
        shot_id=payload.shotId,
        model=payload.model,
        job_id=payload.jobId,
        source_assets=payload.sourceAssets,
        extension_ids=payload.extensionIds,
    )


@app.get("/v1/provenance/{project_id}")
def get_provenance_events(project_id: str) -> dict:
    events = [event for event in store.provenance_events if event.projectId == project_id]
    return {"events": [event.model_dump() for event in events]}


@app.post("/v1/variants/telemetry", response_model=VariantTelemetryRecord)
def create_variant_telemetry(payload: VariantTelemetryCreateRequest) -> VariantTelemetryRecord:
    return _record_variant_telemetry(
        project_id=payload.projectId,
        shot_id=payload.shotId,
        quality=payload.qualityScore,
        timing=payload.timingScore,
        acting=payload.actingScore,
        continuity=payload.continuityScore,
        selected=payload.selected,
    )


@app.get("/v1/variants/telemetry/{project_id}")
def get_variant_telemetry(project_id: str) -> dict:
    records = [item for item in store.variant_telemetry if item.projectId == project_id]
    return {"variants": [item.model_dump() for item in records]}


def _approval_gate_key(project_id: str, shot_id: str) -> str:
    return f"{project_id}:{shot_id}"


def _ensure_approval_gate(project_id: str, shot_id: str) -> ApprovalGateState:
    key = _approval_gate_key(project_id, shot_id)
    gate = store.approval_gates.get(key)
    if gate:
        return gate
    gate = ApprovalGateState(projectId=project_id, shotId=shot_id, status="draft", currentRevision=1, history=[])
    store.approval_gates[key] = gate
    store.save_state()
    return gate


def _apply_approval_action(project_id: str, shot_id: str, action: str, payload: ApprovalActionRequest) -> ApprovalGateState:
    gate = _ensure_approval_gate(project_id, shot_id)
    decision = ApprovalDecisionRecord(
        decisionId=f"decision_{uuid.uuid4().hex}",
        action=action,
        reviewer=payload.reviewer,
        note=payload.note,
    )

    if action == "submit":
        gate.status = "pending_review"
    elif action == "approve":
        gate.status = "approved"
    elif action == "request_changes":
        gate.status = "changes_requested"
        gate.currentRevision += 1
    elif action == "reject":
        gate.status = "rejected"
        gate.currentRevision += 1

    gate.history.append(decision)
    store.approval_gates[_approval_gate_key(project_id, shot_id)] = gate
    store.add_audit(
        "approval_gate.decision",
        payload.reviewer,
        {
            "projectId": project_id,
            "shotId": shot_id,
            "decisionId": decision.decisionId,
            "action": action,
            "status": gate.status,
        },
    )
    return gate


@app.post("/v1/redlines", response_model=RedlineAnnotation)
def create_redline(payload: RedlineCreateRequest) -> RedlineAnnotation:
    annotation = RedlineAnnotation(
        redlineId=f"redline_{uuid.uuid4().hex[:10]}",
        projectId=payload.projectId,
        shotId=payload.shotId,
        startFrame=payload.startFrame,
        endFrame=payload.endFrame,
        drawPathRef=payload.drawPathRef,
        severity=payload.severity,
        note=payload.note,
    )
    store.redline_annotations.append(annotation)
    store.add_audit(
        "redline.created",
        "director",
        {"projectId": payload.projectId, "shotId": payload.shotId, "severity": payload.severity},
    )
    return annotation


@app.get("/v1/redlines/{project_id}/{shot_id}")
def list_redlines(project_id: str, shot_id: str) -> dict:
    items = [item for item in store.redline_annotations if item.projectId == project_id and item.shotId == shot_id]
    return {"annotations": [item.model_dump() for item in items]}


@app.get("/v1/approval-gates/{project_id}/{shot_id}", response_model=ApprovalGateState)
def get_approval_gate(project_id: str, shot_id: str) -> ApprovalGateState:
    return _ensure_approval_gate(project_id, shot_id)


@app.post("/v1/approval-gates/{project_id}/{shot_id}/submit", response_model=ApprovalGateState)
def submit_approval_gate(project_id: str, shot_id: str, payload: ApprovalActionRequest) -> ApprovalGateState:
    return _apply_approval_action(project_id, shot_id, "submit", payload)


@app.post("/v1/approval-gates/{project_id}/{shot_id}/approve", response_model=ApprovalGateState)
def approve_approval_gate(project_id: str, shot_id: str, payload: ApprovalActionRequest) -> ApprovalGateState:
    return _apply_approval_action(project_id, shot_id, "approve", payload)


@app.post("/v1/approval-gates/{project_id}/{shot_id}/request-changes", response_model=ApprovalGateState)
def request_changes_approval_gate(project_id: str, shot_id: str, payload: ApprovalActionRequest) -> ApprovalGateState:
    return _apply_approval_action(project_id, shot_id, "request_changes", payload)


@app.post("/v1/approval-gates/{project_id}/{shot_id}/reject", response_model=ApprovalGateState)
def reject_approval_gate(project_id: str, shot_id: str, payload: ApprovalActionRequest) -> ApprovalGateState:
    return _apply_approval_action(project_id, shot_id, "reject", payload)


@app.get("/v1/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    job = store.jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.post("/v1/autopilot/suggest-shot")
def suggest_shot(payload: AutopilotSuggestRequest, request: Request) -> dict:
    # Try Gemini AI shot suggester first
    ai_suggestions = gemini_client.suggest_shots(payload.scriptBeat, api_key=request.headers.get("x-gemini-key"))
    if ai_suggestions:
        store.add_audit("autopilot.suggest", "gemini-ai", {"scriptBeat": payload.scriptBeat})
        return {"suggestions": ai_suggestions, "source": "gemini-2.0-flash"}

    # Fallback: static templates
    suggestions = [
        {
            "templateId": template.id,
            "title": template.name,
            "rationale": f"{template.description} Best for {template.emotionUseCase}.",
            "estimatedCostCredits": template.estimatedCredits,
            "estimatedSeconds": int(template.estimatedCredits * 3),
        }
        for template in ANIME_SHOT_TEMPLATES[:3]
    ]
    store.add_audit("autopilot.suggest", "director", {"scriptBeat": payload.scriptBeat})
    return {"suggestions": suggestions, "source": "static"}


@app.post("/v1/autopilot/retake-plan")
def retake_plan(payload: RetakePlanRequest) -> dict:
    plan = (
        "1) Re-anchor actor silhouette at frame A and frame B. "
        "2) Add sparse arc sketch for torso trajectory. "
        "3) Regenerate in-betweens with continuity priority preset."
    )
    store.add_audit("autopilot.retake", "director", payload.model_dump())
    return {"plan": plan}


@app.get("/v1/cost/estimate", response_model=CostEstimate)
def cost_estimate(jobType: str = Query("interpolate"), frameCount: int = Query(24)) -> CostEstimate:
    credits, seconds = _estimate(jobType, frameCount)
    return CostEstimate(jobType=jobType, frameCount=frameCount, estimatedCredits=credits, estimatedSeconds=seconds)


@app.get("/v1/extensions")
def list_extensions() -> dict:
    catalog = {manifest.id: manifest for manifest in DEFAULT_EXTENSIONS}
    for ext_id, manifest in store.installed_extensions.items():
        catalog[ext_id] = manifest

    extensions = []
    for manifest in catalog.values():
        payload = manifest.model_dump()
        payload["installed"] = manifest.id in store.installed_extensions
        extensions.append(payload)

    extensions.sort(key=lambda item: (item.get("animeCategory", "automation"), item["name"]))
    return {"extensions": extensions}


@app.post("/v1/extensions/install")
def install_extension(payload: InstallExtensionRequest) -> dict:
    match = next((item for item in DEFAULT_EXTENSIONS if item.id == payload.manifestId), None)
    if not match:
        raise HTTPException(status_code=404, detail="Extension manifest not found")

    store.installed_extensions[match.id] = match
    store.add_audit("extension.installed", "director", {"extensionId": match.id})
    return {"installed": match.model_dump()}


@app.post("/v1/extensions/{extension_id}/execute")
def execute_extension(extension_id: str, payload: ExecuteExtensionRequest) -> dict:
    manifest = store.installed_extensions.get(extension_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Extension not installed")

    capability = next((cap for cap in manifest.capabilities if cap.id == payload.capabilityId), None)
    if not capability:
        raise HTTPException(status_code=404, detail="Capability not found")

    runtime = payload.agentRuntime or (manifest.agentRuntimes[0] if manifest.agentRuntimes else "local-mcp")
    if manifest.agentRuntimes and runtime not in manifest.agentRuntimes:
        raise HTTPException(status_code=400, detail=f"Runtime '{runtime}' not supported by extension")

    allowed_runtimes = set(manifest.sandboxPolicy.allowedRuntimes)
    if allowed_runtimes and runtime not in allowed_runtimes:
        store.add_audit(
            "extension.permission_denied",
            "director",
            {"extensionId": extension_id, "reason": "runtime_not_allowed", "runtime": runtime},
        )
        raise HTTPException(status_code=403, detail=f"Runtime '{runtime}' blocked by sandbox policy")

    required_scopes = set(capability.requiredScopes)
    requested_scopes = set(payload.requestedScopes or capability.requiredScopes)
    manifest_scopes = set(manifest.scopes)

    if not required_scopes.issubset(requested_scopes):
        store.add_audit(
            "extension.permission_denied",
            "director",
            {
                "extensionId": extension_id,
                "reason": "missing_required_scopes",
                "requiredScopes": sorted(required_scopes),
                "requestedScopes": sorted(requested_scopes),
            },
        )
        raise HTTPException(status_code=403, detail="Required extension scopes were not granted")

    if not requested_scopes.issubset(manifest_scopes):
        store.add_audit(
            "extension.permission_denied",
            "director",
            {
                "extensionId": extension_id,
                "reason": "scope_not_allowed",
                "requestedScopes": sorted(requested_scopes),
                "manifestScopes": sorted(manifest_scopes),
            },
        )
        raise HTTPException(status_code=403, detail="Requested scopes are not permitted by manifest")

    blocked_scopes = set(manifest.sandboxPolicy.blockedScopes)
    if blocked_scopes.intersection(requested_scopes):
        store.add_audit(
            "extension.permission_denied",
            "director",
            {
                "extensionId": extension_id,
                "reason": "scope_blocked_by_sandbox",
                "blocked": sorted(blocked_scopes.intersection(requested_scopes)),
            },
        )
        raise HTTPException(status_code=403, detail="Requested scopes blocked by sandbox policy")

    max_payload_keys = max(1, int(manifest.sandboxPolicy.maxPayloadKeys))
    if len(payload.payload) > max_payload_keys:
        store.add_audit(
            "extension.permission_denied",
            "director",
            {
                "extensionId": extension_id,
                "reason": "payload_too_large",
                "payloadKeys": len(payload.payload),
                "maxPayloadKeys": max_payload_keys,
            },
        )
        raise HTTPException(status_code=400, detail=f"Payload exceeds sandbox key limit ({max_payload_keys})")

    store.add_audit(
        "extension.executed",
        "director",
        {
            "extensionId": extension_id,
            "capabilityId": payload.capabilityId,
            "payload": payload.payload,
            "requestedScopes": sorted(requested_scopes),
            "agentRuntime": runtime,
            "dryRun": payload.dryRun,
        },
    )

    return {
        "status": "ok",
        "result": {
            "extension": extension_id,
            "capability": payload.capabilityId,
            "agentRuntime": runtime,
            "scopes": sorted(requested_scopes),
            "echo": payload.payload,
            "message": "Capability executed in sandbox mode",
            "dryRun": payload.dryRun,
        },
    }


@app.get("/v1/audit/logs")
def get_audit_logs() -> dict:
    return {"events": [item.model_dump() for item in store.audit]}
