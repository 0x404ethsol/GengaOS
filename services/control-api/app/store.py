from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
import json
from pathlib import Path
import sqlite3
import threading
from typing import Any

from .config import settings
from .schemas import (
    AnimeShotTemplate,
    AuditEvent,
    BackgroundLayout,
    CameraGrammarPreset,
    ColorScriptLane,
    EpisodeBoard,
    ExpressionProfile,
    ExtensionManifest,
    GraphSnapshot,
    PosePreset,
    ApprovalGateState,
    ProvenanceEventRecord,
    RedlineAnnotation,
    SceneIdea,
    StyleBible,
    StyleDnaProfile,
    VariantTelemetryRecord,
)


@dataclass
class StateStore:
    persistence_path: str = field(default_factory=lambda: settings.control_state_db_path)
    graphs: dict[str, GraphSnapshot] = field(default_factory=dict)
    actors: dict[str, dict[str, Any]] = field(default_factory=dict)
    locks: dict[str, dict[str, Any]] = field(default_factory=dict)
    jobs: dict[str, dict[str, Any]] = field(default_factory=dict)
    expression_profiles: dict[str, ExpressionProfile] = field(default_factory=dict)
    pose_presets: dict[str, PosePreset] = field(default_factory=dict)
    color_script_lanes: dict[str, ColorScriptLane] = field(default_factory=dict)
    background_layouts: dict[str, BackgroundLayout] = field(default_factory=dict)
    style_bibles: dict[str, StyleBible] = field(default_factory=dict)
    style_dna_profiles: dict[str, StyleDnaProfile] = field(default_factory=dict)
    episode_boards: dict[str, EpisodeBoard] = field(default_factory=dict)
    provenance_events: list[ProvenanceEventRecord] = field(default_factory=list)
    variant_telemetry: list[VariantTelemetryRecord] = field(default_factory=list)
    redline_annotations: list[RedlineAnnotation] = field(default_factory=list)
    approval_gates: dict[str, ApprovalGateState] = field(default_factory=dict)
    audit: list[AuditEvent] = field(default_factory=list)
    installed_extensions: dict[str, ExtensionManifest] = field(default_factory=dict)
    spend_ledger: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    _db_conn: sqlite3.Connection | None = field(default=None, init=False, repr=False)
    _db_lock: threading.RLock = field(default_factory=threading.RLock, init=False, repr=False)

    def __post_init__(self) -> None:
        self._init_db()
        self.load_state()

    def _init_db(self) -> None:
        if not self.persistence_path:
            return
        db_target = self.persistence_path.strip()
        if not db_target:
            return

        if db_target != ":memory:":
            path = Path(db_target).expanduser()
            path.parent.mkdir(parents=True, exist_ok=True)
            db_target = str(path)

        self._db_conn = sqlite3.connect(db_target, check_same_thread=False)
        self._db_conn.execute(
            """
            CREATE TABLE IF NOT EXISTS state_snapshots (
                id INTEGER PRIMARY KEY CHECK(id = 1),
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        self._db_conn.commit()

    def _to_payload(self) -> dict[str, Any]:
        return {
            "graphs": {key: value.model_dump() for key, value in self.graphs.items()},
            "actors": dict(self.actors),
            "locks": dict(self.locks),
            "jobs": dict(self.jobs),
            "expression_profiles": {key: value.model_dump() for key, value in self.expression_profiles.items()},
            "pose_presets": {key: value.model_dump() for key, value in self.pose_presets.items()},
            "color_script_lanes": {key: value.model_dump() for key, value in self.color_script_lanes.items()},
            "background_layouts": {key: value.model_dump() for key, value in self.background_layouts.items()},
            "style_bibles": {key: value.model_dump() for key, value in self.style_bibles.items()},
            "style_dna_profiles": {key: value.model_dump() for key, value in self.style_dna_profiles.items()},
            "episode_boards": {key: value.model_dump() for key, value in self.episode_boards.items()},
            "provenance_events": [item.model_dump() for item in self.provenance_events],
            "variant_telemetry": [item.model_dump() for item in self.variant_telemetry],
            "redline_annotations": [item.model_dump() for item in self.redline_annotations],
            "approval_gates": {key: value.model_dump() for key, value in self.approval_gates.items()},
            "audit": [item.model_dump() for item in self.audit],
            "installed_extensions": {key: value.model_dump() for key, value in self.installed_extensions.items()},
            "spend_ledger": dict(self.spend_ledger),
        }

    def _hydrate(self, payload: dict[str, Any]) -> None:
        self.graphs = {
            key: GraphSnapshot.model_validate(value)
            for key, value in payload.get("graphs", {}).items()
        }
        self.actors = dict(payload.get("actors", {}))
        self.locks = dict(payload.get("locks", {}))
        self.jobs = dict(payload.get("jobs", {}))
        self.expression_profiles = {
            key: ExpressionProfile.model_validate(value)
            for key, value in payload.get("expression_profiles", {}).items()
        }
        self.pose_presets = {
            key: PosePreset.model_validate(value)
            for key, value in payload.get("pose_presets", {}).items()
        }
        self.color_script_lanes = {
            key: ColorScriptLane.model_validate(value)
            for key, value in payload.get("color_script_lanes", {}).items()
        }
        self.background_layouts = {
            key: BackgroundLayout.model_validate(value)
            for key, value in payload.get("background_layouts", {}).items()
        }
        self.style_bibles = {
            key: StyleBible.model_validate(value)
            for key, value in payload.get("style_bibles", {}).items()
        }
        self.style_dna_profiles = {
            key: StyleDnaProfile.model_validate(value)
            for key, value in payload.get("style_dna_profiles", {}).items()
        }
        self.episode_boards = {
            key: EpisodeBoard.model_validate(value)
            for key, value in payload.get("episode_boards", {}).items()
        }
        self.provenance_events = [
            ProvenanceEventRecord.model_validate(item)
            for item in payload.get("provenance_events", [])
        ]
        self.variant_telemetry = [
            VariantTelemetryRecord.model_validate(item)
            for item in payload.get("variant_telemetry", [])
        ]
        self.redline_annotations = [
            RedlineAnnotation.model_validate(item)
            for item in payload.get("redline_annotations", [])
        ]
        self.approval_gates = {
            key: ApprovalGateState.model_validate(value)
            for key, value in payload.get("approval_gates", {}).items()
        }
        self.audit = [AuditEvent.model_validate(item) for item in payload.get("audit", [])]
        self.installed_extensions = {
            key: ExtensionManifest.model_validate(value)
            for key, value in payload.get("installed_extensions", {}).items()
        }
        self.spend_ledger = defaultdict(
            float,
            {key: float(value) for key, value in payload.get("spend_ledger", {}).items()},
        )

    def save_state(self) -> None:
        if not self._db_conn:
            return
        snapshot = json.dumps(self._to_payload(), separators=(",", ":"), sort_keys=True)
        with self._db_lock:
            self._db_conn.execute(
                """
                INSERT INTO state_snapshots (id, payload, updated_at)
                VALUES (1, ?, ?)
                ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at
                """,
                (snapshot, datetime.utcnow().isoformat() + "Z"),
            )
            self._db_conn.commit()

    def load_state(self) -> None:
        if not self._db_conn:
            return
        with self._db_lock:
            row = self._db_conn.execute("SELECT payload FROM state_snapshots WHERE id = 1").fetchone()
        if not row or not row[0]:
            return
        try:
            payload = json.loads(row[0])
        except json.JSONDecodeError:
            return
        self._hydrate(payload)

    def add_audit(self, event_type: str, actor: str, details: dict[str, Any]) -> None:
        event = AuditEvent(
            id=f"audit_{len(self.audit) + 1}",
            eventType=event_type,
            actor=actor,
            details=details,
        )
        self.audit.append(event)
        self.save_state()

    def add_spend(self, credits: float) -> None:
        day = datetime.utcnow().strftime("%Y-%m-%d")
        self.spend_ledger[day] += credits
        self.save_state()

    def today_spend(self) -> float:
        day = datetime.utcnow().strftime("%Y-%m-%d")
        return float(self.spend_ledger.get(day, 0.0))

    def reset(self) -> None:
        self.graphs.clear()
        self.actors.clear()
        self.locks.clear()
        self.jobs.clear()
        self.expression_profiles.clear()
        self.pose_presets.clear()
        self.color_script_lanes.clear()
        self.background_layouts.clear()
        self.style_bibles.clear()
        self.style_dna_profiles.clear()
        self.episode_boards.clear()
        self.provenance_events.clear()
        self.variant_telemetry.clear()
        self.redline_annotations.clear()
        self.approval_gates.clear()
        self.audit.clear()
        self.installed_extensions.clear()
        self.spend_ledger = defaultdict(float)
        self.save_state()


store = StateStore()

ANIME_SHOT_TEMPLATES = [
    AnimeShotTemplate(
        id="sakuga-impact-cut",
        name="Sakuga Impact Cut",
        category="action",
        description="Short focal burst with speedline-friendly composition for impact frames.",
        defaultLens="24mm",
        movement="fast-push-in",
        emotionUseCase="impact and surprise",
        estimatedCredits=8.5,
    ),
    AnimeShotTemplate(
        id="anime-dialog-closeup",
        name="Anime Dialog Close-up",
        category="dialog",
        description="Eye-line preserving close-up optimized for anime lip-flap timing.",
        defaultLens="50mm",
        movement="micro-dolly",
        emotionUseCase="subtle emotional beats",
        estimatedCredits=4.5,
    ),
    AnimeShotTemplate(
        id="mecha-reveal-pan",
        name="Mecha Reveal Pan",
        category="mecha",
        description="Layered depth pan emphasizing scale and mechanical silhouette detail.",
        defaultLens="28mm",
        movement="lateral-pan",
        emotionUseCase="scale and awe",
        estimatedCredits=10.0,
    ),
]

ANIME_CAMERA_PRESETS = [
    CameraGrammarPreset(
        id="dialog-closeup-50mm",
        name="Dialog Close-Up",
        lens="50mm",
        movement="micro-dolly",
        framing="tight close-up",
        emotionalIntent="subtle emotional tension",
    ),
    CameraGrammarPreset(
        id="hero-low-angle-28mm",
        name="Hero Low-Angle Reveal",
        lens="28mm",
        movement="slow rise",
        framing="low-angle medium-wide",
        emotionalIntent="power and resolve",
    ),
    CameraGrammarPreset(
        id="mecha-scale-pan-24mm",
        name="Mecha Scale Pan",
        lens="24mm",
        movement="lateral-pan",
        framing="wide environmental scale frame",
        emotionalIntent="awe and scale",
    ),
]

ANIME_POSE_PRESETS = [
    PosePreset(
        poseId="pose-ready-stance",
        name="Ready Stance",
        archetype="combat",
        stance="feet planted, torso forward",
        cameraBlock="35mm medium eye-level",
        tags=["combat", "neutral", "lead"],
        joints={"spine": 0.12, "leftArm": -0.25, "rightArm": 0.4},
    ),
    PosePreset(
        poseId="pose-impact-followthrough",
        name="Impact Follow-Through",
        archetype="action",
        stance="torso twist with shoulder drop",
        cameraBlock="24mm dynamic low-angle",
        tags=["impact", "sakuga", "motion"],
        joints={"spine": 0.4, "leftArm": 0.85, "rightArm": -0.12},
    ),
    PosePreset(
        poseId="pose-dialog-soft",
        name="Dialog Soft Beat",
        archetype="dialog",
        stance="soft shoulder incline and head tilt",
        cameraBlock="50mm close-up slight push",
        tags=["dialog", "emotional", "close-up"],
        joints={"spine": -0.08, "neck": 0.16, "leftArm": 0.05, "rightArm": -0.02},
    ),
]

ANIME_SCENE_IDEAS = [
    SceneIdea(
        id="idea-neon-rooftop-duel",
        title="Neon Rooftop Duel",
        theme="urban action",
        mood="tense",
        promptSeed="Rain-soaked rooftop, rival swordsmen, neon billboards and sparks.",
        tags=["fight", "night", "rain", "sakuga"],
    ),
    SceneIdea(
        id="idea-mecha-sunrise-launch",
        title="Mecha Sunrise Launch",
        theme="mecha drama",
        mood="heroic",
        promptSeed="Hangar doors open at sunrise, giant mech silhouette, launch steam and light bloom.",
        tags=["mecha", "sunrise", "cinematic"],
    ),
    SceneIdea(
        id="idea-shrine-memory-flashback",
        title="Shrine Memory Flashback",
        theme="mystic drama",
        mood="nostalgic",
        promptSeed="Old shrine corridor, drifting petals, warm haze, childhood memory framing.",
        tags=["flashback", "emotional", "petals"],
    ),
    SceneIdea(
        id="idea-cafe-dialog-beat",
        title="Cafe Dialog Beat",
        theme="slice of life",
        mood="intimate",
        promptSeed="Window-side cafe dialog with subtle eye-line animation and soft afternoon light.",
        tags=["dialog", "slice-of-life", "acting"],
    ),
    SceneIdea(
        id="idea-forest-spirit-chase",
        title="Forest Spirit Chase",
        theme="fantasy chase",
        mood="urgent",
        promptSeed="Moonlit bamboo forest, camera tracking run cycle, spirits trailing luminous ribbons.",
        tags=["chase", "fantasy", "tracking-shot"],
    ),
]

DEFAULT_EXTENSIONS = [
    ExtensionManifest(
        id="mcp.anime.storyboard.notes",
        name="Anime Storyboard Notes",
        version="1.0.0",
        description="Attach anime production annotations (timing, acting intent, smear notes) to shots.",
        animeCategory="storyboard",
        protocol="mcp",
        executionMode="hybrid",
        authMode="bring-your-own-key",
        agentRuntimes=["openai", "anthropic", "gemini", "local-mcp", "custom-http-agent"],
        agentRuntimeMeta=[
            {"runtime": "openai", "supportsStreaming": True, "maxConcurrency": 4},
            {"runtime": "anthropic", "supportsStreaming": True, "maxConcurrency": 3},
            {"runtime": "local-mcp", "supportsStreaming": False, "maxConcurrency": 6},
        ],
        trustLevel="sandboxed",
        trustFlags=["approved-for-anime-production", "read-write-reviewed"],
        sandboxPolicy={
            "allowedRuntimes": ["openai", "anthropic", "gemini", "local-mcp", "custom-http-agent"],
            "blockedScopes": ["billing:write"],
            "maxPayloadKeys": 8,
        },
        pricingModel="free",
        scopes=["graph:read", "graph:write"],
        capabilities=[
            {
                "id": "annotate_timing",
                "name": "Annotate Timing",
                "description": "Add timing and key animation intent annotations to the selected shot.",
                "requiredScopes": ["graph:write"],
                "permissionPrompt": "This capability writes timing annotations back to the scene graph.",
                "fields": [
                    {"key": "note", "label": "Note", "type": "text", "required": True},
                    {
                        "key": "severity",
                        "label": "Severity",
                        "type": "select",
                        "required": True,
                        "options": ["info", "warning", "critical"],
                    },
                ],
            }
        ],
    ),
    ExtensionManifest(
        id="mcp.anime.color.script",
        name="Anime Color Script Advisor",
        version="0.9.0",
        description="Generate anime-specific color script recommendations from script beats and style bible.",
        animeCategory="color",
        protocol="mcp",
        executionMode="remote",
        authMode="genga_credit_proxy",
        agentRuntimes=["openai", "anthropic", "gemini", "local-mcp"],
        agentRuntimeMeta=[
            {"runtime": "openai", "supportsStreaming": True, "maxConcurrency": 2},
            {"runtime": "anthropic", "supportsStreaming": True, "maxConcurrency": 2},
            {"runtime": "gemini", "supportsStreaming": False, "maxConcurrency": 2},
        ],
        trustLevel="trusted",
        trustFlags=["approved-for-anime-production", "palette-safe"],
        sandboxPolicy={
            "allowedRuntimes": ["openai", "anthropic", "gemini", "local-mcp"],
            "blockedScopes": ["graph:write"],
            "maxPayloadKeys": 6,
        },
        pricingModel="credit",
        scopes=["render:read", "style:write"],
        capabilities=[
            {
                "id": "palette",
                "name": "Generate Palette",
                "description": "Suggest palettes for mood + location.",
                "requiredScopes": ["style:write"],
                "permissionPrompt": "This capability can update your style bible palette recommendations.",
                "fields": [
                    {"key": "mood", "label": "Mood", "type": "text", "required": True},
                    {"key": "location", "label": "Location", "type": "text", "required": True},
                ],
            }
        ],
    ),
]
