from __future__ import annotations

import base64
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta

from .config import settings


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def sign_payload(payload: dict, secret: str) -> str:
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    signature = hmac.new(secret.encode(), body, hashlib.sha256).digest()
    return f"{_b64(body)}.{_b64(signature)}"


def verify_payload(token: str, secret: str) -> dict | None:
    try:
        body_b64, sig_b64 = token.split(".", 1)
        body = base64.urlsafe_b64decode(body_b64 + "==")
        expected = hmac.new(secret.encode(), body, hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(sig_b64 + "==")
        if not hmac.compare_digest(expected, actual):
            return None
        return json.loads(body.decode())
    except Exception:
        return None


def create_room_token(project_id: str, room_id: str, role: str) -> tuple[str, str]:
    expires_at = datetime.utcnow() + timedelta(minutes=30)
    payload = {
        "projectId": project_id,
        "roomId": room_id,
        "role": role,
        "exp": expires_at.isoformat() + "Z",
        "jti": str(uuid.uuid4()),
    }
    return sign_payload(payload, settings.room_token_secret), payload["exp"]


def create_actor_lock(actor_id: str) -> dict[str, str]:
    issued_at = datetime.utcnow()
    expires_at = issued_at + timedelta(seconds=settings.actor_lock_ttl_seconds)
    lock_id = f"lock_{uuid.uuid4().hex[:12]}"
    payload = {
        "actorId": actor_id,
        "actorLockId": lock_id,
        "issuedAt": issued_at.isoformat() + "Z",
        "expiresAt": expires_at.isoformat() + "Z",
    }
    signature = sign_payload(payload, settings.actor_lock_secret)
    return {**payload, "signature": signature}


def is_lock_valid(lock_payload: dict[str, str]) -> bool:
    expires = datetime.fromisoformat(lock_payload["expiresAt"].replace("Z", ""))
    if expires <= datetime.utcnow():
        return False

    signature = lock_payload.get("signature", "")
    verify_data = {
        "actorId": lock_payload["actorId"],
        "actorLockId": lock_payload["actorLockId"],
        "issuedAt": lock_payload["issuedAt"],
        "expiresAt": lock_payload["expiresAt"],
    }
    expected = sign_payload(verify_data, settings.actor_lock_secret)
    return hmac.compare_digest(signature, expected)