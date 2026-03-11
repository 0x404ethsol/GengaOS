# Data Flow

1. Browser opens `web-studio` and initializes graph state.
2. Client requests room token from gateway (`POST /v1/sync/room-token`).
3. Gateway forwards `x-genga-internal-token` to Control API for internal service authentication in cloud mode.
4. Client connects to sync worker room websocket for multi-user graph updates.
5. Graph snapshots persist through Control API with SQLite-backed state storage (`CONTROL_STATE_DB_PATH`) and revision checks.
6. Autopilot reads anime shot grammar via `GET /v1/anime/shot-templates` and style bible via `GET /v1/style-bible/{projectId}`.
7. Casting Node calls `POST /v1/actors` and Actor Node calls `POST /v1/actors/{id}/lock`.
8. Style DNA panel issues immutable style locks (`POST /v1/style-dna`) and render nodes require both `actorLockId` and `styleDnaId`.
9. Render nodes call `POST /v1/render/keyframes`, `POST /v1/render/interpolate`, or `POST /v1/render/parallel-explore`.
10. Control API validates identity/style lock policy, spend cap, then dispatches to Inference API (`INFERENCE_API_BASE`) for Runpod-bound execution.
11. Inference API enforces internal token auth when enabled (`INFERENCE_ENFORCE_INTERNAL_AUTH`).
12. Provenance/variant telemetry, redlines, and approval gates are written through Control API review endpoints.
13. Job state is queried through `GET /v1/jobs/{jobId}` and final deliverables are blocked until approval status is `approved`.
14. Extension registry loads manifests and dynamic node hydration executes extension capabilities with runtime/scope sandbox checks.
