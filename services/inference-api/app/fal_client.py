"""
GengaOS fal.ai Client
Handles real image generation via fal.ai's anime-optimized models.

Model routing:
  Keyframes  → fal-ai/fast-sdxl  (anime style, fast)
  Interpolate → fal-ai/cogvideox-5b (motion between frames)
  Face/char   → fal-ai/ip-adapter-face-id (character consistency)
"""
from __future__ import annotations

import os
import logging
from typing import Any

logger = logging.getLogger(__name__)

try:
    import fal_client  # type: ignore
    _FAL_AVAILABLE = True
except ImportError:
    fal_client = None  # type: ignore
    _FAL_AVAILABLE = False


def _get_key() -> str:
    # fal.ai accepts both variable names
    return os.getenv("FAL_KEY", "").strip() or os.getenv("FAL_API_KEY", "").strip()


def is_available() -> bool:
    return _FAL_AVAILABLE and bool(_get_key())


def fal_status() -> dict:
    return {
        "available": is_available(),
        "key_configured": bool(_get_key()),
        "sdk": "fal-client",
        "models": {
            "keyframes": "fal-ai/fast-sdxl",
            "interpolate": "fal-ai/cogvideox-5b",
            "consistency": "fal-ai/ip-adapter-face-id",
        } if is_available() else {},
    }


def _configure():
    """Set FAL_KEY env var so the SDK picks it up."""
    key = _get_key()
    if key:
        os.environ["FAL_KEY"] = key


# ─────────────────────────────────────────────────────────────
#  KEYFRAME GENERATION  (fast-sdxl — anime optimized)
# ─────────────────────────────────────────────────────────────

KEYFRAME_MODEL = "fal-ai/fast-sdxl"

# SDXL anime style presets
ANIME_STYLE_SUFFIX = (
    ", anime style, MAPPA studio, detailed linework, cinematic lighting, "
    "high quality, masterpiece, cel shading, vibrant colors"
)
NEGATIVE_PROMPT = (
    "blurry, low quality, watermark, text, western cartoon, 3d render, "
    "photorealistic, deformed, extra limbs"
)


def generate_keyframes(
    prompt: str,
    actor_lock_id: str,
    frame_count: int = 4,
    sketch_hint: str = "",
    width: int = 1024,
    height: int = 576,
) -> dict:
    """Generate anime keyframes via fal-ai/fast-sdxl. Returns job result dict."""
    if not is_available():
        return {"status": "unavailable", "outputs": [], "provider": "fal"}

    _configure()

    full_prompt = f"{sketch_hint or prompt}{ANIME_STYLE_SUFFIX}"
    outputs = []
    errors = []

    try:
        # Generate each keyframe (fal SDXL does single images, we batch)
        num_frames = min(frame_count, 4)  # cap at 4 per job for free tier
        result = fal_client.run(  # type: ignore[union-attr]
            KEYFRAME_MODEL,
            arguments={
                "prompt": full_prompt,
                "negative_prompt": NEGATIVE_PROMPT,
                "num_images": num_frames,
                "image_size": {"width": width, "height": height},
                "num_inference_steps": 30,
                "guidance_scale": 7.5,
                "enable_safety_checker": False,
            },
        )

        # Extract image URLs from result
        images = result.get("images", [])
        for img in images:
            url = img.get("url") if isinstance(img, dict) else img
            if url:
                outputs.append(url)

        logger.info("fal keyframes generated: %d images for actor %s", len(outputs), actor_lock_id)
        return {
            "status": "completed",
            "provider": "fal",
            "model": KEYFRAME_MODEL,
            "outputs": outputs,
            "prompt": full_prompt,
        }

    except Exception as exc:
        logger.warning("fal keyframe generation failed: %s", exc)
        errors.append(str(exc))
        return {
            "status": "error",
            "provider": "fal",
            "model": KEYFRAME_MODEL,
            "outputs": [],
            "error": str(exc),
        }


# ─────────────────────────────────────────────────────────────
#  INTERPOLATION / VIDEO  (cogvideox — motion between frames)
# ─────────────────────────────────────────────────────────────

INTERPOLATE_MODEL = "fal-ai/cogvideox-5b"


def interpolate_frames(
    prompt: str,
    frame_a_url: str,
    frame_b_url: str,
    actor_lock_id: str,
    frame_count: int = 24,
) -> dict:
    """Generate interpolated video between two frames via CogVideoX."""
    if not is_available():
        return {"status": "unavailable", "outputs": [], "provider": "fal"}

    _configure()

    # If no frame URLs provided, fall back to text-to-video
    if not frame_a_url and not frame_b_url:
        return _text_to_video(prompt, frame_count)

    try:
        args: dict[str, Any] = {
            "prompt": f"{prompt}{ANIME_STYLE_SUFFIX}",
            "num_frames": min(frame_count, 49),  # CogVideoX max
            "fps": 8,
            "num_inference_steps": 50,
            "guidance_scale": 6.0,
        }
        if frame_a_url:
            args["image_url"] = frame_a_url

        result = fal_client.run(INTERPOLATE_MODEL, arguments=args)  # type: ignore[union-attr]

        video_url = result.get("video", {}).get("url") or result.get("url", "")
        outputs = [video_url] if video_url else []

        logger.info("fal interpolation complete: %s frames for actor %s", frame_count, actor_lock_id)
        return {
            "status": "completed",
            "provider": "fal",
            "model": INTERPOLATE_MODEL,
            "outputs": outputs,
        }

    except Exception as exc:
        logger.warning("fal interpolation failed: %s", exc)
        return {
            "status": "error",
            "provider": "fal",
            "model": INTERPOLATE_MODEL,
            "outputs": [],
            "error": str(exc),
        }


def _text_to_video(prompt: str, frame_count: int) -> dict:
    """Fallback: text-to-video when no frame images are available."""
    try:
        result = fal_client.run(  # type: ignore[union-attr]
            INTERPOLATE_MODEL,
            arguments={
                "prompt": f"{prompt}{ANIME_STYLE_SUFFIX}",
                "num_frames": min(frame_count, 49),
                "fps": 8,
                "num_inference_steps": 50,
            },
        )
        video_url = result.get("video", {}).get("url") or ""
        return {
            "status": "completed",
            "provider": "fal",
            "model": INTERPOLATE_MODEL,
            "outputs": [video_url] if video_url else [],
        }
    except Exception as exc:
        return {"status": "error", "provider": "fal", "outputs": [], "error": str(exc)}
