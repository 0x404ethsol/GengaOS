"""
GengaOS Gemini AI Client — Powered by Google Gemini 2.5 Flash + 3.1 Pro (Ultra)
Uses the official google-genai SDK (v1.0+).

Model routing:
  FLASH  — gemini-2.0-flash-001   fast, cheap: scene ideas, autopilot
  PRO    — gemini-2.5-flash        smart: director notes, continuity
  ULTRA  — gemini-3.1-pro-preview  most capable: Director Ghost analysis
"""
from __future__ import annotations

import json
import os
import logging
from typing import Any

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types as genai_types
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None  # type: ignore
    genai_types = None  # type: ignore
    _GENAI_AVAILABLE = False

_client = None

# Model routing — best models on your Google Ultra account
MODEL_FLASH = "gemini-2.5-flash"          # fast, reliable: scene ideas, autopilot
MODEL_PRO   = "gemini-2.5-flash"          # smart: notes, continuity (same tier)
MODEL_ULTRA = "gemini-3.1-pro-preview"    # most capable: Director Ghost


def _get_client(api_key: str | None = None):
    """Return a configured google-genai Client."""
    global _client
    if not _GENAI_AVAILABLE:
        return None
    resolved_key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
    if not resolved_key:
        return None
    
    if api_key:
        try:
            return genai.Client(api_key=api_key)  # type: ignore
        except Exception as exc:
            logger.warning("Failed to create Gemini BYOK client: %s", exc)
            return None

    if _client is not None:
        return _client
    try:
        _client = genai.Client(api_key=resolved_key)  # type: ignore
        return _client
    except Exception as exc:
        logger.warning("Failed to create global Gemini client: %s", exc)
        return None


def _call(prompt: str, json_mode: bool = False, model: str = MODEL_FLASH, api_key: str | None = None) -> str | None:
    """Single-turn Gemini call. Returns response text or None on failure."""
    client = _get_client(api_key)
    if client is None:
        return None
    try:
        config: dict[str, Any] = {}
        if json_mode:
            config["response_mime_type"] = "application/json"

        if config and genai_types:
            generate_config = genai_types.GenerateContentConfig(**config)  # type: ignore
            response = client.models.generate_content(  # type: ignore
                model=model,
                contents=prompt,
                config=generate_config,
            )
        else:
            response = client.models.generate_content(  # type: ignore
                model=model,
                contents=prompt,
            )
        return response.text
    except Exception as exc:
        logger.warning("Gemini call failed [%s]: %s", model, exc)
        return None


# ─────────────────────────────────────────────────────────────
#  SCENE IDEAS  (Flash — fast)
# ─────────────────────────────────────────────────────────────

def generate_scene_ideas(query: str, count: int = 6, api_key: str | None = None) -> list | None:
    prompt = f"""You are a MAPPA-level anime scene director.
Generate {count} unique, vivid anime scene ideas based on: "{query or 'dramatic anime'}".

Return ONLY a JSON array. Each object must have:
  id (string slug), title (string), theme (string), mood (string),
  promptSeed (string — concise image-gen prompt),
  tags (array of 3-5 strings), shotType (string), emotionalCore (string)

MAPPA / Ufotable / WIT Studio quality. Be specific and cinematic."""

    raw = _call(prompt, json_mode=True, model=MODEL_FLASH, api_key=api_key)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        ideas = data if isinstance(data, list) else data.get("ideas", [])
        return ideas[:count]
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
#  DIRECTOR NOTES PARSER  (Pro — accurate)
# ─────────────────────────────────────────────────────────────

def parse_director_notes(text: str, project_id: str, api_key: str | None = None) -> list | None:
    import uuid as _uuid
    prompt = f"""You are a GengaOS AI director assistant trained on professional anime production workflows.

Parse these director notes and extract actionable commands:
---
{text}
---

Return ONLY a JSON array. Each action object must have:
  actionId (string: "note_" + 8 random hex chars),
  label (string: short human-readable label),
  command (one of: retake-continuity | apply-camera-preset | lock-style-dna |
           generate-impact-cut | adjust-timing | color-grade | voice-retake | manual-review),
  payload (object),
  confidence (float 0.5-0.99),
  warnings (array of strings)

Use anime production knowledge. High confidence only when unambiguous."""

    raw = _call(prompt, json_mode=True, model=MODEL_PRO, api_key=api_key)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        actions = data if isinstance(data, list) else data.get("actions", [])
        for action in actions:
            if not action.get("actionId"):
                action["actionId"] = f"note_{_uuid.uuid4().hex[:8]}"
        return actions
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
#  AUTOPILOT SHOT SUGGESTER  (Flash — fast)
# ─────────────────────────────────────────────────────────────

def suggest_shots(script_beat: str, api_key: str | None = None) -> list | None:
    prompt = f"""You are an AI anime cinematographer at MAPPA studio.

Script beat: "{script_beat}"

Suggest 3 optimal shot templates. Return ONLY a JSON array. Each object must have:
  templateId (string slug), title (string),
  rationale (string — 1-2 sentences),
  cameraGrammar (string: e.g. "Dutch angle push-in"),
  emotionServed (string),
  estimatedCostCredits (float 1.0-8.0),
  estimatedSeconds (int)

Think Jujutsu Kaisen, Demon Slayer, Attack on Titan. Cinematic and purposeful."""

    raw = _call(prompt, json_mode=True, model=MODEL_FLASH, api_key=api_key)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        suggestions = data if isinstance(data, list) else data.get("suggestions", [])
        return suggestions[:3]
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
#  DIRECTOR GHOST  (Ultra — deepest analysis)
# ─────────────────────────────────────────────────────────────

def ghost_analyze(scene_context: str, api_key: str | None = None) -> list | None:
    prompt = f"""You are the GengaOS Director Ghost — an AI co-director trained on 10,000+ hours of MAPPA, Ufotable, and WIT Studio anime.

Scene context: {scene_context or "Generic anime action scene, 3 cuts, no camera movement specified"}

Return 2-4 specific, actionable director suggestions as a JSON array. Each must have:
  id (string slug), category (camera|timing|emotion|continuity|style),
  priority (whisper|nudge|urgent), icon (single emoji),
  text (the suggestion — specific and technical),
  action (short action label),
  confidence (float 0.6-0.98)

Be a real co-director. Reference frame timing, camera blocking, emotional beats. No generic advice."""

    raw = _call(prompt, json_mode=True, model=MODEL_ULTRA, api_key=api_key)
    if not raw:
        # Fallback to Pro if Ultra fails
        raw = _call(prompt, json_mode=True, model=MODEL_PRO, api_key=api_key)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        suggestions = data if isinstance(data, list) else data.get("suggestions", [])
        return suggestions[:4]
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
#  CONTINUITY ANALYSIS  (Pro)
# ─────────────────────────────────────────────────────────────

def analyze_continuity(shots: list, api_key: str | None = None) -> dict | None:
    prompt = f"""You are a continuity supervisor for a professional anime studio.

Analyze this shot sequence for continuity issues:
{json.dumps(shots, indent=2)}

Return ONLY a JSON object with:
  score (int 0-100),
  issues (array: shotId, type, severity [low|medium|high], description, suggestion),
  axisViolations (array of string shot-pair descriptions),
  overallNotes (string summary)"""

    raw = _call(prompt, json_mode=True, model=MODEL_PRO, api_key=api_key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
#  STATUS
# ─────────────────────────────────────────────────────────────

def is_available() -> bool:
    return _get_client() is not None


def gemini_status() -> dict:
    available = is_available()
    return {
        "available": available,
        "models": {
            "flash": MODEL_FLASH,
            "pro": MODEL_PRO,
            "ultra": MODEL_ULTRA,
        } if available else {},
        "features": ["scene-ideas", "notes-parse", "autopilot", "ghost", "continuity"] if available else [],
        "key_configured": bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "sdk": "google-genai",
    }
