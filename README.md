# GengaOS

Web-first Anime IDE and workflow pipeline inspired by orchestration-first creative tooling, but specialized only for 2D/3D anime production.

## Architecture
- `apps/web-studio`: React + Vite studio canvas.
- `services/control-api`: FastAPI control plane.
- `services/inference-api`: FastAPI inference orchestration for remote GPU providers.
- `services/api-gateway-worker`: Cloudflare Worker edge gateway.
- `services/sync-worker`: Cloudflare Durable Object sync service inspired by tldraw-sync-cloudflare.
- `packages/contracts`: Shared schemas and interfaces.
- `packages/graph-core`: Graph execution and validation helpers.
- `packages/identity-lock-sdk`: Identity lock signing and verification helpers.
- `ralph`: Autonomous execution plan artifacts.

## Product Direction
- **Category**: Anime-first creative orchestration IDE.
- **Positioning**: Flora-style multi-tool flow control, but locked to anime workflows (storyboard -> casting -> posing -> sakuga render -> delivery).
- **Hard rule**: no render generation without both `actorLockId` and `styleDnaId` (identity + style lock enforcement).
- **Specialization**: anime shot templates, style bible memory, continuity-aware autopilot, sakuga interpolation pipeline.

## Quick Start
1. Install dependencies:
   - `npm install`
   - `python -m pip install -r services/control-api/requirements.txt -r services/inference-api/requirements.txt`
2. Optional environment defaults:
   - `copy .env.example .env` (Windows)
3. Validate local environment:
   - `npm run doctor`
4. Boot full local stack:
   - `npm run dev`
5. Smoke-test anime workflow:
   - `npm run dev:smoke`
6. Run automated tests:
   - `pytest services/control-api/tests services/inference-api/tests`
   - `npm run typecheck`
   - `npm run test:e2e`
7. Validate services manually:
   - Control API: `http://127.0.0.1:8001/health`
   - Inference API: `http://127.0.0.1:8002/health`
   - Web Studio: `http://127.0.0.1:5173`

## If Startup Fails
- Run `npm run doctor` to detect missing dependencies, Docker daemon state, and port conflicts.
- Run `npm run dev:smoke` to perform an end-to-end anime workflow smoke check (actor -> lock -> parallel explore).
- Inspect `.tmp_logs/*.err.log` for service-specific failure traces.

## Guardrails
Use `npm run guardrails:assert` in CI to enforce branch and PR safety constraints.

## CI Gates
- `ci / guardrails`: branch safety checks.
- `ci / quality`: typecheck + unit tests (Python + workspace packages).
- `ci / e2e`: Playwright browser validation for review/approval workflows.
- `ci / smoke`: full stack boot and smoke pipeline.
- `security/*` + `codeql/*`: secret/dependency/code scanning.

## Cloud/Runtime Notes
- Control API supports token-gated gateway auth (`CONTROL_ENFORCE_GATEWAY_AUTH`, `CONTROL_API_TOKEN`).
- Inference API supports internal service token auth (`INFERENCE_ENFORCE_INTERNAL_AUTH`, `INFERENCE_API_TOKEN`).
- Control API state is persisted to SQLite (`CONTROL_STATE_DB_PATH`) for restart-safe local and cloud demos.
