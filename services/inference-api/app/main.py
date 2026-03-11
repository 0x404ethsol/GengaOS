from __future__ import annotations

from collections import defaultdict
from datetime import datetime
import os
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse


class InferenceRequest(BaseModel):
    actorLockId: str
    frameA: str | None = None
    frameB: str | None = None
    sketchHint: str | None = None
    provider: str = "runpod"
    frameCount: int = 24


class InferenceSettings(BaseModel):
    daily_cap_credits: float = float(os.getenv("INFERENCE_DAILY_CAP_CREDITS", "300.0"))
    inference_api_token: str = os.getenv("INFERENCE_API_TOKEN", "")
    enforce_internal_auth: bool = os.getenv("INFERENCE_ENFORCE_INTERNAL_AUTH", "false").strip().lower() in {"1", "true", "yes", "on"}


class SpendLedger:
    def __init__(self) -> None:
        self._ledger: dict[str, float] = defaultdict(float)

    def today(self) -> float:
        return self._ledger[datetime.utcnow().strftime("%Y-%m-%d")]

    def add(self, credits: float) -> None:
        self._ledger[datetime.utcnow().strftime("%Y-%m-%d")] += credits


settings = InferenceSettings()
ledger = SpendLedger()

app = FastAPI(title="GengaOS Inference API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def enforce_internal_auth(request, call_next):
    if not settings.enforce_internal_auth or request.url.path == "/health":
        return await call_next(request)

    expected = settings.inference_api_token.strip()
    if not expected:
        return JSONResponse(status_code=503, content={"detail": "Inference auth enabled without INFERENCE_API_TOKEN"})

    internal = request.headers.get("x-genga-inference-token", "").strip()
    auth_header = request.headers.get("authorization", "").strip()
    bearer = auth_header.split(" ", 1)[1].strip() if auth_header.lower().startswith("bearer ") else ""

    if expected not in {internal, bearer}:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized inference request"})
    return await call_next(request)


def _cost(job_type: str, frame_count: int) -> float:
    base = 0.65 if job_type == "keyframes" else 1.1
    return round(max(1, frame_count) * base, 2)


def _dispatch(job_type: str, payload: InferenceRequest) -> dict:
    credits = _cost(job_type, payload.frameCount)
    if ledger.today() + credits > settings.daily_cap_credits:
        return {
            "jobId": f"job_{uuid4().hex[:12]}",
            "status": "blocked_budget",
            "provider": payload.provider,
            "estimatedCredits": credits,
            "outputs": [],
        }

    ledger.add(credits)
    return {
        "jobId": f"job_{uuid4().hex[:12]}",
        "status": "completed",
        "provider": payload.provider,
        "estimatedCredits": credits,
        "outputs": [
            f"https://runpod.cdn.gengaos.dev/{job_type}/{uuid4().hex[:8]}/000.png",
            f"https://runpod.cdn.gengaos.dev/{job_type}/{uuid4().hex[:8]}/001.png",
        ],
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "inference-api", "provider": "runpod"}


@app.get("/v1/providers")
def providers() -> dict:
    return {
        "providers": [
            {
                "id": "runpod",
                "status": "active",
                "notes": "Primary demo provider",
            }
        ]
    }


@app.post("/v1/infer/keyframes")
def infer_keyframes(payload: InferenceRequest) -> dict:
    if not payload.actorLockId:
        raise HTTPException(status_code=403, detail="actorLockId required")
    return _dispatch("keyframes", payload)


@app.post("/v1/infer/interpolate")
def infer_interpolate(payload: InferenceRequest) -> dict:
    if not payload.actorLockId:
        raise HTTPException(status_code=403, detail="actorLockId required")
    return _dispatch("interpolate", payload)
