import os

from pydantic import BaseModel


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings(BaseModel):
    actor_lock_secret: str = os.getenv("ACTOR_LOCK_SECRET", "change-me-in-production")
    room_token_secret: str = os.getenv("ROOM_TOKEN_SECRET", "change-room-secret")
    actor_lock_ttl_seconds: int = int(os.getenv("ACTOR_LOCK_TTL_SECONDS", str(60 * 60 * 4)))
    daily_spend_cap_credits: float = float(os.getenv("DAILY_SPEND_CAP_CREDITS", "250.0"))
    control_api_token: str = os.getenv("CONTROL_API_TOKEN", "")
    enforce_gateway_auth: bool = _bool_env("CONTROL_ENFORCE_GATEWAY_AUTH", False)
    control_state_db_path: str = os.getenv("CONTROL_STATE_DB_PATH", "./data/control-state.sqlite3")
    inference_api_base: str = os.getenv("INFERENCE_API_BASE", "")
    inference_api_token: str = os.getenv("INFERENCE_API_TOKEN", "")


settings = Settings()
